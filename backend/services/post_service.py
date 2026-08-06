from datetime import datetime, timedelta
from typing import Literal, Optional, List
from bson import ObjectId
from fastapi import HTTPException
from database import db_connection

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

import httpx
from config import settings

async def get_policy_sentiment(policy_id: str, user_email: str):
    post = await db_connection.db["posts"].find_one({
        "_id": parse_policy_id(policy_id),
        "author_email": user_email
    })
    if not post:
        raise HTTPException(status_code=404, detail="Your policy was not found")
        
    comments = post.get("comments", [])
    texts = [c.get("content") for c in comments if c.get("content")]
    
    analysis_result = {"results": [], "overall_sentiment": "Neutral"}
    if texts:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings.ML_SERVICE_URL}/analyze",
                    json={"texts": texts},
                    timeout=30.0
                )
                if response.status_code == 200:
                    analysis_result = response.json()
        except Exception as e:
            print(f"ML Service Error: {e}")
            analysis_result["overall_sentiment"] = "Error connecting to ML service"

    return str(post["_id"]), len(comments), analysis_result

async def get_overall_sentiment(user_email: str):
    pipeline = [
        {"$match": {"author_email": user_email}},
        {"$project": {"comments": 1}}
    ]
    
    all_texts = []
    policy_count = 0
    comment_count = 0
    
    async for post in db_connection.db["posts"].aggregate(pipeline):
        policy_count += 1
        comments = post.get("comments", [])
        comment_count += len(comments)
        for c in comments:
            if c.get("content"):
                all_texts.append(c.get("content"))
                
    # Limit texts to avoid overwhelming the model on a huge dashboard load
    all_texts = all_texts[:100]
    
    analysis_result = {"results": [], "overall_sentiment": "Neutral"}
    if all_texts:
        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    f"{settings.ML_SERVICE_URL}/analyze",
                    json={"texts": all_texts},
                    timeout=60.0
                )
                if response.status_code == 200:
                    analysis_result = response.json()
        except Exception as e:
            print(f"ML Service Error: {e}")
            analysis_result["overall_sentiment"] = "Error connecting to ML service"

    return {
        "policy_count": policy_count,
        "comment_count": comment_count,
        "overall_sentiment": analysis_result["overall_sentiment"]
    }

