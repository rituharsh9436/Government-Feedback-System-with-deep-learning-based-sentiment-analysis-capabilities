from datetime import datetime, timedelta
from typing import Literal, Optional, List
from bson import ObjectId
from fastapi import HTTPException, BackgroundTasks
from database import db_connection
from services.logger_service import app_logger
import httpx
import math
from config import settings

def parse_policy_id(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=400, detail="Invalid policy id")
    return ObjectId(value)

def map_post_to_response(post: dict) -> dict:
    post["id"] = str(post["_id"])
    return post

async def create_post(data: dict) -> str:
    data["comment_count"] = 0
    result = await db_connection.db["posts"].insert_one(data)
    return str(result.inserted_id)

async def get_posts(
    keyword: Optional[str] = None,
    department: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    recent: bool = False,
    sort_date: Optional[Literal["newest", "oldest"]] = "newest",
    sort_name: Optional[Literal["asc", "desc"]] = None,
    sort_popularity: Optional[Literal["most_replied", "least_replied"]] = None,
    page: int = 1,
    limit: int = 10
):
    query = {}
    if keyword:
        query["$text"] = {"$search": keyword}
    if department:
        departments = [d.strip() for d in department.split(",") if d.strip()]
        if departments:
            query["category"] = {"$in": departments}
    if recent:
        query.setdefault("created_at", {})["$gte"] = datetime.utcnow() - timedelta(days=7)
    else:
        if date_from:
            query.setdefault("created_at", {})["$gte"] = date_from
        if date_to:
            query.setdefault("created_at", {})["$lte"] = date_to

    skip = (page - 1) * limit
    total = await db_connection.db["posts"].count_documents(query)

    items = []
    
    sort_dict = {}
    if sort_popularity:
        if sort_popularity == "most_replied":
            sort_dict["comment_count"] = -1
        else:
            sort_dict["comment_count"] = 1
            
    if sort_name:
        sort_dict["title"] = 1 if sort_name == "asc" else -1
        
    if sort_date:
        sort_dict["created_at"] = -1 if sort_date == "newest" else 1
        
    if not sort_dict:
        sort_dict["created_at"] = -1
        
    sort_dict["_id"] = -1 # Deterministic tiebreaker

    pipeline = [
        {"$match": query},
        {
            "$lookup": {
                "from": "comments",
                "localField": "_id",
                "foreignField": "post_id",
                "as": "comments_arr"
            }
        },
        {
            "$addFields": {
                "comment_count": {"$size": "$comments_arr"}
            }
        },
        {
            "$project": {
                "comments_arr": 0
            }
        },
        {"$sort": sort_dict},
        {"$skip": skip},
        {"$limit": limit}
    ]
    async for post in db_connection.db["posts"].aggregate(pipeline):
        items.append(map_post_to_response(post))

    total_pages = math.ceil(total / limit) if limit > 0 else 1
    return {"items": items, "total": total, "page": page, "limit": limit, "pages": total_pages}

async def get_post_by_id(policy_id: str):
    pipeline = [
        {"$match": {"_id": parse_policy_id(policy_id)}},
        {
            "$lookup": {
                "from": "comments",
                "localField": "_id",
                "foreignField": "post_id",
                "as": "comments_arr"
            }
        },
        {
            "$addFields": {
                "comment_count": {"$size": "$comments_arr"}
            }
        },
        {
            "$project": {
                "comments_arr": 0
            }
        }
    ]
    result = await db_connection.db["posts"].aggregate(pipeline).to_list(1)
    if not result:
        raise HTTPException(status_code=404, detail="Policy not found")
    return map_post_to_response(result[0])

async def get_comments_for_post(policy_id: str, page: int = 1, limit: int = 10):
    query = {"post_id": parse_policy_id(policy_id)}
    skip = (page - 1) * limit
    total = await db_connection.db["comments"].count_documents(query)
    
    cursor = db_connection.db["comments"].find(query).sort("created_at", -1).skip(skip).limit(limit)
    items = await cursor.to_list(length=None)
    
    # Map _id to id if necessary, or just return as is (FastAPI handles it usually if we convert _id)
    for item in items:
        item["id"] = str(item.pop("_id"))
        item["post_id"] = str(item["post_id"])
        
    total_pages = math.ceil(total / limit) if limit > 0 else 1
    return {"items": items, "total": total, "page": page, "limit": limit, "pages": total_pages}

async def process_comment_sentiment_bg(policy_id: str, email: str, comment_text: str, comment_id: str = None):
    """Background task to analyze sentiment and update the comment"""
    import asyncio
    max_retries = 3
    base_delay = 2.0
    
    for attempt in range(max_retries + 1):
        try:
            async with httpx.AsyncClient() as client:
                api_key = getattr(settings, "ML_SERVICE_API_KEY", None) or ""
                response = await client.post(
                    f"{settings.ML_SERVICE_URL}/analyze",
                    json={"texts": [comment_text]},
                    headers={"X-API-Key": api_key},
                    timeout=10.0
                )
                if response.status_code == 200:
                    analysis_result = response.json()
                    if analysis_result.get("results") and len(analysis_result["results"]) > 0:
                        first_result = analysis_result["results"][0]
                        
                        if "error" in first_result:
                            app_logger.error(f"ML Service returned error in prediction: {first_result['error']}")
                            # It's an internal error from ML, we can break and fail
                            break
                            
                        sentiment = first_result.get("label")
                        sentiment_score = first_result.get("score")
                        sentiment_model_version = first_result.get("model_version")
                        
                        # Update the specific comment in the database
                        match_cond = {"_id": ObjectId(comment_id)} if comment_id else {"author_email": email, "content": comment_text, "sentiment": "pending", "post_id": parse_policy_id(policy_id)}
                        await db_connection.db["comments"].update_one(
                            match_cond,
                            {
                                "$set": {
                                    "sentiment": sentiment,
                                    "sentiment_score": sentiment_score,
                                    "sentiment_model_version": sentiment_model_version
                                }
                            }
                        )
                        return # Success, exit background task
                elif 400 <= response.status_code < 500:
                    # Client error, don't retry
                    app_logger.error(f"Client error from ML service: {response.status_code}")
                    break
                else:
                    app_logger.warning(f"ML service returned {response.status_code}")
        except (httpx.RequestError, httpx.TimeoutException) as e:
            app_logger.warning(f"ML Service connection error on attempt {attempt + 1}: {e}")
        except Exception as e:
            app_logger.error(f"Unexpected ML Service Error: {e}")
            break
            
        if attempt < max_retries:
            delay = base_delay * (2 ** attempt)
            await asyncio.sleep(delay)
            
    # If we get here, all retries failed or a permanent error occurred
    app_logger.error(f"ML Service failed to process comment {comment_id or email} after {max_retries} retries. Marking as failed.")
    try:
        match_cond = {"_id": ObjectId(comment_id)} if comment_id else {"author_email": email, "content": comment_text, "sentiment": "pending", "post_id": parse_policy_id(policy_id)}
        await db_connection.db["comments"].update_one(
            match_cond,
            {
                "$set": {
                    "sentiment": "failed"
                }
            }
        )
    except Exception as e:
        app_logger.error(f"Failed to update comment status to failed: {e}")


async def add_comment_to_post(policy_id: str, email: str, comment_data: dict, background_tasks: BackgroundTasks) -> int:
    object_id = parse_policy_id(policy_id)
    
    # Check if post exists first
    post = await db_connection.db["posts"].find_one({"_id": object_id}, {"_id": 1})
    if not post:
        raise HTTPException(status_code=404, detail="Policy not found")
        
    # Mark sentiment as pending initially
    comment_data["sentiment"] = "pending"
    comment_data["post_id"] = object_id
    
    result = await db_connection.db["comments"].insert_one(comment_data)
    
    # Check rate limit using optimistic insert (max 3 comments per user per post)
    first_three_cursor = db_connection.db["comments"].find(
        {"post_id": object_id, "author_email": email},
        {"_id": 1}
    ).sort([("created_at", 1), ("_id", 1)]).limit(3)
    
    first_three = await first_three_cursor.to_list(length=3)
    allowed_ids = [c["_id"] for c in first_three]
    
    if result.inserted_id not in allowed_ids:
        # We exceeded the limit (we are 4th or later)
        await db_connection.db["comments"].delete_one({"_id": result.inserted_id})
        raise HTTPException(status_code=400, detail="You may only post three replies per policy")
        
    user_comment_count = len(allowed_ids)
    
    await db_connection.db["posts"].update_one(
        {"_id": object_id},
        {"$inc": {"comment_count": 1}}
    )
            
    if comment_data.get("content"):
        background_tasks.add_task(process_comment_sentiment_bg, policy_id, email, comment_data["content"], str(result.inserted_id))
            
    return max(0, 3 - user_comment_count)

async def delete_post_by_id(policy_id: str, user_role: str, user_email: str):
    query = {"_id": parse_policy_id(policy_id)}
    if user_role == "govt":
        query["author_email"] = user_email
        
    result = await db_connection.db["posts"].delete_one(query)
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Policy not found or not owned by you")
        
    # Delete associated comments
    await db_connection.db["comments"].delete_many({"post_id": parse_policy_id(policy_id)})

async def get_policy_sentiment(policy_id: str, user_email: str):
    user = await db_connection.db["users"].find_one({"email": user_email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    post = await db_connection.db["posts"].find_one({"_id": parse_policy_id(policy_id)})
    if not post:
        raise HTTPException(status_code=404, detail="Policy not found")
        
    department_name = user.get("department_name")
    
    # Allow if Central, or same department
    if department_name != "Central" and str(department_name).lower() != str(post.get("category")).lower():
        raise HTTPException(status_code=403, detail="You do not have permission to view analysis for this department")
        
    # Use MongoDB aggregation to count sentiments
    pipeline = [
        {"$match": {"post_id": post["_id"]}},
        {
            "$group": {
                "_id": {"$toUpper": "$sentiment"},
                "count": {"$sum": 1}
            }
        }
    ]
    
    sentiment_counts = await db_connection.db["comments"].aggregate(pipeline).to_list(length=None)
    
    total_comments = 0
    positive_count = 0
    negative_count = 0
    neutral_count = 0
    
    for sc in sentiment_counts:
        count = sc.get("count", 0)
        total_comments += count
        
        sentiment_label = sc.get("_id")
        if not sentiment_label or sentiment_label in ("PENDING", "FAILED"):
            continue
            
        if sentiment_label == "POSITIVE":
            positive_count += count
        elif sentiment_label == "NEGATIVE":
            negative_count += count
        elif sentiment_label == "NEUTRAL":
            neutral_count += count
            
    total_analyzed = positive_count + negative_count + neutral_count
    
    if total_analyzed == 0:
        overall = "No Analysis"
    elif positive_count > negative_count and positive_count > neutral_count:
        overall = "Positive"
    elif negative_count > positive_count and negative_count > neutral_count:
        overall = "Negative"
    elif neutral_count > positive_count and neutral_count > negative_count:
        overall = "Neutral"
    else:
        overall = "Mixed"

    analysis_result = {
        "results": [],
        "positive_count": positive_count,
        "negative_count": negative_count,
        "neutral_count": neutral_count,
        "overall_sentiment": overall,
        "analyzed_count": total_analyzed
    }

    return str(post["_id"]), total_comments, analysis_result

async def get_overall_sentiment(user_email: str):
    user = await db_connection.db["users"].find_one({"email": user_email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    department_name = user.get("department_name")
    
    match_stage = {}
    if department_name != "Central":
        match_stage["post.category"] = department_name

    category_group_id = "$post.category" if department_name == "Central" else "$post.title"

    pipeline = [
        {"$match": {"sentiment": {"$nin": ["pending", "failed"], "$exists": True}}},
        {"$lookup": {
            "from": "posts",
            "localField": "post_id",
            "foreignField": "_id",
            "as": "post"
        }},
        {"$unwind": "$post"},
        {"$match": match_stage},
        {"$facet": {
            "overall_stats": [
                {"$group": {
                    "_id": None,
                    "analyzed_count": {"$sum": 1},
                    "positive_count": {
                        "$sum": {"$cond": [{"$eq": [{"$toUpper": "$sentiment"}, "POSITIVE"]}, 1, 0]}
                    },
                    "negative_count": {
                        "$sum": {"$cond": [{"$eq": [{"$toUpper": "$sentiment"}, "NEGATIVE"]}, 1, 0]}
                    },
                    "neutral_count": {
                        "$sum": {"$cond": [{"$eq": [{"$toUpper": "$sentiment"}, "NEUTRAL"]}, 1, 0]}
                    }
                }}
            ],
            "category_stats": [
                {"$group": {
                    "_id": category_group_id,
                    "count": {"$sum": 1},
                    "positive": {
                        "$sum": {"$cond": [{"$eq": [{"$toUpper": "$sentiment"}, "POSITIVE"]}, 1, 0]}
                    },
                    "negative": {
                        "$sum": {"$cond": [{"$eq": [{"$toUpper": "$sentiment"}, "NEGATIVE"]}, 1, 0]}
                    },
                    "neutral": {
                        "$sum": {"$cond": [{"$eq": [{"$toUpper": "$sentiment"}, "NEUTRAL"]}, 1, 0]}
                    }
                }},
                {"$project": {
                    "category": {"$ifNull": ["$_id", "Uncategorized"]},
                    "count": 1,
                    "positive": 1,
                    "negative": 1,
                    "neutral": 1,
                    "_id": 0
                }},
                {"$sort": {"category": 1}}
            ],
            "date_stats": [
                {"$group": {
                    "_id": {
                        "$dateToString": {
                            "format": "%Y-%m-%d",
                            "date": {"$toDate": "$created_at"}
                        }
                    },
                    "count": {"$sum": 1}
                }},
                {"$match": {"_id": {"$ne": None}}},
                {"$project": {
                    "date": "$_id",
                    "count": 1,
                    "_id": 0
                }},
                {"$sort": {"date": 1}}
            ],
            "score_stats": [
                {"$match": {"sentiment_score": {"$exists": True, "$type": "number"}}},
                {"$group": {
                    "_id": {"$divide": [{"$trunc": {"$multiply": ["$sentiment_score", 10]}}, 10]},
                    "count": {"$sum": 1}
                }},
                {"$project": {
                    "score_bin": {"$toString": "$_id"},
                    "count": 1,
                    "_id": 0
                }},
                {"$sort": {"_id": 1}}
            ]
        }}
    ]
    
    # Execute the aggregation pipeline on comments collection
    result_cursor = db_connection.db["comments"].aggregate(pipeline)
    # The cursor will return exactly one document containing the facets
    result = await result_cursor.to_list(length=1)
    
    # Also fetch policy metrics separately to avoid complex facets on the entire comments collection
    policy_match = {}
    if department_name != "Central":
        policy_match["category"] = department_name
        
    policy_metrics_cursor = db_connection.db["posts"].aggregate([
        {"$match": policy_match},
        {"$group": {
            "_id": None,
            "policy_count": {"$sum": 1},
            "comment_count": {"$sum": {"$ifNull": ["$comment_count", 0]}}
        }}
    ])
    policy_metrics_result = await policy_metrics_cursor.to_list(length=1)
    policy_metrics = policy_metrics_result[0] if policy_metrics_result else {}
    if not result:
        # Fallback empty structure
        return {
            "policy_count": 0,
            "comment_count": 0,
            "overall_sentiment": "No Analysis",
            "sentiment_distribution": [
                {"name": "Positive", "value": 0},
                {"name": "Negative", "value": 0},
                {"name": "Neutral", "value": 0}
            ],
            "feedback_over_time": [],
            "category_comparison": [],
            "sentiment_scores": [],
            "analyzed_count": 0
        }
        
    facets = result[0] if result else {}
    
    policy_count = policy_metrics.get("policy_count", 0)
    comment_count = policy_metrics.get("comment_count", 0)
    
    overall_stats = facets.get("overall_stats", [{}])[0] if facets.get("overall_stats") else {}
    
    analyzed_count = overall_stats.get("analyzed_count", 0)
    positive_count = overall_stats.get("positive_count", 0)
    negative_count = overall_stats.get("negative_count", 0)
    neutral_count = overall_stats.get("neutral_count", 0)
    
    if analyzed_count == 0:
        overall = "No Analysis"
    elif positive_count > negative_count and positive_count > neutral_count:
        overall = "Positive"
    elif negative_count > positive_count and negative_count > neutral_count:
        overall = "Negative"
    elif neutral_count > positive_count and neutral_count > negative_count:
        overall = "Neutral"
    else:
        overall = "Mixed"

    category_comparison = facets.get("category_stats", [])
    feedback_over_time = facets.get("date_stats", [])
    formatted_scores = facets.get("score_stats", [])

    # Ensure format '1.0' instead of '1' for the histogram string
    for score in formatted_scores:
        if not '.' in score["score_bin"]:
            score["score_bin"] += ".0"

    return {
        "policy_count": policy_count,
        "comment_count": comment_count,
        "overall_sentiment": overall,
        "sentiment_distribution": [
            {"name": "Positive", "value": positive_count},
            {"name": "Negative", "value": negative_count},
            {"name": "Neutral", "value": neutral_count}
        ],
        "feedback_over_time": feedback_over_time,
        "category_comparison": category_comparison,
        "sentiment_scores": formatted_scores,
        "analyzed_count": analyzed_count
    }
