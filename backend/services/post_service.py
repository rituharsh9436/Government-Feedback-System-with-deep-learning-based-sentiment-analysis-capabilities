from datetime import datetime, timedelta
from typing import Literal, Optional, List
from bson import ObjectId
from fastapi import HTTPException
from database import db_connection
from services.logger_service import app_logger
import httpx
from config import settings

def parse_policy_id(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=400, detail="Invalid policy id")
    return ObjectId(value)

def map_post_to_response(post: dict) -> dict:
    post["id"] = str(post["_id"])
    return post

async def create_post(data: dict) -> str:
    result = await db_connection.db["posts"].insert_one(data)
    return str(result.inserted_id)

async def get_posts(
    keyword: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    recent: bool = False,
    sort: Literal["newest", "oldest", "most_replied"] = "newest",
    page: int = 1,
    limit: int = 10
):
    query = {}
    if keyword:
        query["$or"] = [
            {"title": {"$regex": keyword, "$options": "i"}},
            {"description": {"$regex": keyword, "$options": "i"}},
            {"category": {"$regex": keyword, "$options": "i"}}
        ]
    if recent:
        query.setdefault("created_at", {})["$gte"] = datetime.utcnow() - timedelta(days=7)
    if date_from:
        query.setdefault("created_at", {})["$gte"] = date_from
    if date_to:
        query.setdefault("created_at", {})["$lte"] = date_to

    skip = (page - 1) * limit
    total = await db_connection.db["posts"].count_documents(query)

    items = []
    if sort == "most_replied":
        # Add skip and limit to pipeline for pagination
        pipeline = [
            {"$match": query},
            {"$addFields": {"comment_count": {"$size": {"$ifNull": ["$comments", []]}}}},
            {"$sort": {"comment_count": -1, "created_at": -1}},
            {"$skip": skip},
            {"$limit": limit}
        ]
        async for post in db_connection.db["posts"].aggregate(pipeline):
            items.append(map_post_to_response(post))
    else:
        direction = 1 if sort == "oldest" else -1
        cursor = db_connection.db["posts"].find(query).sort("created_at", direction).skip(skip).limit(limit)
        async for post in cursor:
            items.append(map_post_to_response(post))

    return {"items": items, "total": total, "page": page, "limit": limit}

async def get_post_by_id(policy_id: str):
    post = await db_connection.db["posts"].find_one({"_id": parse_policy_id(policy_id)})
    if not post:
        raise HTTPException(status_code=404, detail="Policy not found")
    return map_post_to_response(post)

async def add_comment_to_post(policy_id: str, email: str, comment_data: dict) -> int:
    object_id = parse_policy_id(policy_id)
    
    # Analyze sentiment synchronously via ML service before inserting
    if comment_data.get("content"):
        try:
            async with httpx.AsyncClient() as client:
                api_key = getattr(settings, "ML_SERVICE_API_KEY", None) or ""
                response = await client.post(
                    f"{settings.ML_SERVICE_URL}/analyze",
                    json={"texts": [comment_data["content"]]},
                    headers={"X-API-Key": api_key},
                    timeout=10.0
                )
                if response.status_code == 200:
                    analysis_result = response.json()
                    if analysis_result.get("results") and len(analysis_result["results"]) > 0:
                        first_result = analysis_result["results"][0]
                        comment_data["sentiment"] = first_result.get("label")
                        comment_data["sentiment_score"] = first_result.get("score")
                        comment_data["sentiment_model_version"] = first_result.get("model_version")
        except Exception as e:
            app_logger.error(f"ML Service Error in add_comment_to_post: {e}")
            # Do not block comment creation if ML service is down
            pass
            
    # We want to allow a max of 3 comments per user per post atomically.
    query = {
        "_id": object_id,
        "$expr": {
            "$lt": [
                {"$size": {
                    "$filter": {
                        "input": {"$ifNull": ["$comments", []]},
                        "cond": {"$eq": ["$$this.author_email", email]}
                    }
                }},
                3
            ]
        }
    }
    
    result = await db_connection.db["posts"].update_one(
        query,
        {"$push": {"comments": comment_data}}
    )
    
    if result.modified_count == 0:
        # Check if the post exists to distinguish between "not found" and "limit reached"
        post = await db_connection.db["posts"].find_one({"_id": object_id}, {"_id": 1})
        if not post:
            raise HTTPException(status_code=404, detail="Policy not found")
        else:
            raise HTTPException(status_code=400, detail="You may only post three replies per policy")
            
    # Calculate remaining (not strictly atomic for the return value, but the insertion was safe)
    post = await db_connection.db["posts"].find_one({"_id": object_id}, {"comments": 1})
    replies = sum(1 for item in post.get("comments", []) if item.get("author_email") == email)
    return max(0, 3 - replies)

async def delete_post_by_id(policy_id: str, user_role: str, user_email: str):
    query = {"_id": parse_policy_id(policy_id)}
    if user_role == "govt":
        query["author_email"] = user_email
        
    result = await db_connection.db["posts"].delete_one(query)
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Policy not found or not owned by you")

async def get_policy_sentiment(policy_id: str, user_email: str):
    post = await db_connection.db["posts"].find_one({
        "_id": parse_policy_id(policy_id),
        "author_email": user_email
    })
    if not post:
        raise HTTPException(status_code=404, detail="Your policy was not found")
        
    comments = post.get("comments", [])
    
    # Calculate overall sentiment from stored data
    positive_count = sum(1 for c in comments if str(c.get("sentiment")).upper() == "POSITIVE")
    negative_count = sum(1 for c in comments if str(c.get("sentiment")).upper() == "NEGATIVE")
    
    if positive_count > negative_count:
        overall = "Positive"
    elif negative_count > positive_count:
        overall = "Negative"
    else:
        overall = "Mixed" if (positive_count > 0 or negative_count > 0) else "Neutral"
        
    results = []
    for c in comments:
        if c.get("sentiment"):
            results.append({
                "label": c.get("sentiment"),
                "score": c.get("sentiment_score", 0),
                "model_version": c.get("sentiment_model_version")
            })

    analysis_result = {
        "results": results,
        "overall_sentiment": overall
    }

    return str(post["_id"]), len(comments), analysis_result

async def get_overall_sentiment(user_email: str):
    pipeline = [
        {"$match": {"author_email": user_email}},
        {"$project": {"comments": 1, "category": 1}}
    ]
    
    policy_count = 0
    comment_count = 0
    positive_count = 0
    negative_count = 0
    neutral_count = 0
    
    feedback_by_date = {}
    feedback_by_category = {}
    sentiment_scores = []
    
    async for post in db_connection.db["posts"].aggregate(pipeline):
        policy_count += 1
        comments = post.get("comments", [])
        comment_count += len(comments)
        category = post.get("category", "Uncategorized")
        
        if category not in feedback_by_category:
            feedback_by_category[category] = {"count": 0, "positive": 0, "negative": 0, "neutral": 0}
            
        for c in comments:
            feedback_by_category[category]["count"] += 1
            
            sentiment = str(c.get("sentiment")).upper()
            if sentiment == "POSITIVE":
                positive_count += 1
                feedback_by_category[category]["positive"] += 1
            elif sentiment == "NEGATIVE":
                negative_count += 1
                feedback_by_category[category]["negative"] += 1
            else:
                neutral_count += 1
                feedback_by_category[category]["neutral"] += 1
                
            # Date aggregation
            created_at = c.get("created_at")
            if created_at:
                if isinstance(created_at, str):
                    try:
                        parsed_date = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                        date_str = parsed_date.strftime("%Y-%m-%d")
                    except ValueError:
                        date_str = created_at[:10]
                else:
                    date_str = created_at.strftime("%Y-%m-%d")
                feedback_by_date[date_str] = feedback_by_date.get(date_str, 0) + 1
                
            # Score aggregation
            score = c.get("sentiment_score")
            if score is not None:
                # Bin to nearest 0.1
                bin_val = round(score, 1)
                sentiment_scores.append(bin_val)
                
    if positive_count > negative_count:
        overall = "Positive"
    elif negative_count > positive_count:
        overall = "Negative"
    else:
        overall = "Mixed" if (positive_count > 0 or negative_count > 0) else "Neutral"

    # Format feedback over time
    feedback_over_time = [{"date": k, "count": v} for k, v in sorted(feedback_by_date.items())]
    
    # Format category comparison
    category_comparison = []
    for cat, data in feedback_by_category.items():
        category_comparison.append({
            "category": cat,
            "count": data["count"],
            "positive": data["positive"],
            "negative": data["negative"],
            "neutral": data["neutral"]
        })
        
    # Format sentiment scores histogram
    score_bins = {}
    for s in sentiment_scores:
        score_bins[s] = score_bins.get(s, 0) + 1
    
    formatted_scores = [{"score_bin": f"{k:.1f}", "count": v} for k, v in sorted(score_bins.items())]

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
        "sentiment_scores": formatted_scores
    }
