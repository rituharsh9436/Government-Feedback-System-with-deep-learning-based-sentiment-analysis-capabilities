from datetime import datetime, timedelta
from typing import Literal, Optional

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query

from database import db_connection
from models.post_model import PolicyComment
from schemas.post_schema import PostCreate
from services.dependencies import get_current_user, RequireRole

router = APIRouter(prefix="/posts", tags=["Policies"])


def parse_policy_id(value: str) -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=400, detail="Invalid policy id")
    return ObjectId(value)


def serialize(post: dict) -> dict:
    post["_id"] = str(post["_id"])
    return post


@router.post("/", status_code=201)
async def create_post(data: PostCreate, user: dict = Depends(RequireRole(["govt"]))):
    post = data.model_dump()
    post.update({"author_email": user["email"], "author_role": "govt", "created_at": datetime.utcnow(), "comments": []})
    result = await db_connection.db["posts"].insert_one(post)
    return {"id": str(result.inserted_id), "message": "Policy published"}


@router.get("/")
async def get_all_posts(
    keyword: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    recent: bool = False,
    sort: Literal["newest", "oldest", "most_replied"] = "newest",
):
    query = {}
    if keyword:
        query["$or"] = [{"title": {"$regex": keyword, "$options": "i"}}, {"description": {"$regex": keyword, "$options": "i"}}, {"category": {"$regex": keyword, "$options": "i"}}]
    if recent:
        query.setdefault("created_at", {})["$gte"] = datetime.utcnow() - timedelta(days=7)
    if date_from:
        query.setdefault("created_at", {})["$gte"] = date_from
    if date_to:
        query.setdefault("created_at", {})["$lte"] = date_to

    if sort == "most_replied":
        pipeline = [{"$match": query}, {"$addFields": {"comment_count": {"$size": "$comments"}}}, {"$sort": {"comment_count": -1, "created_at": -1}}]
        return [serialize(post) async for post in db_connection.db["posts"].aggregate(pipeline)]
    direction = 1 if sort == "oldest" else -1
    return [serialize(post) async for post in db_connection.db["posts"].find(query).sort("created_at", direction)]


@router.get("/analytics/overall-sentiment")
async def overall_sentiment(user: dict = Depends(RequireRole(["govt"]))):
    pipeline = [{"$match": {"author_email": user["email"]}}, {"$project": {"comment_count": {"$size": "$comments"}}}, {"$group": {"_id": None, "policy_count": {"$sum": 1}, "comment_count": {"$sum": "$comment_count"}}}]
    data = [item async for item in db_connection.db["posts"].aggregate(pipeline)]
    totals = data[0] if data else {"policy_count": 0, "comment_count": 0}
    return {"policy_count": totals["policy_count"], "comment_count": totals["comment_count"], "analysis_status": "pending_sentiment_script"}


@router.get("/{policy_id}")
async def get_post(policy_id: str):
    post = await db_connection.db["posts"].find_one({"_id": parse_policy_id(policy_id)})
    if not post:
        raise HTTPException(status_code=404, detail="Policy not found")
    return serialize(post)


@router.post("/{policy_id}/comments", status_code=201)
async def save_policy_comment(policy_id: str, comment: PolicyComment, user: dict = Depends(RequireRole(["public"]))):
    object_id = parse_policy_id(policy_id)
    post = await db_connection.db["posts"].find_one({"_id": object_id}, {"comments": 1})
    if not post:
        raise HTTPException(status_code=404, detail="Policy not found")
    replies = sum(1 for item in post.get("comments", []) if item.get("author_email") == user["email"])
    if replies >= 3:
        raise HTTPException(status_code=400, detail="You may only post three replies per policy")
    comment_data = {"content": comment.content, "author_email": user["email"], "author_role": "public", "created_at": datetime.utcnow()}
    await db_connection.db["posts"].update_one({"_id": object_id}, {"$push": {"comments": comment_data}})
    return {"message": "Comment added successfully", "remaining_replies": 2 - replies}


@router.delete("/{policy_id}")
async def delete_post(policy_id: str, user: dict = Depends(RequireRole(["admin", "govt"]))):
    query = {"_id": parse_policy_id(policy_id)}
    if user["role"] == "govt":
        query["author_email"] = user["email"]
    result = await db_connection.db["posts"].delete_one(query)
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Policy not found or not owned by you")
    return {"message": "Policy deleted"}


@router.get("/{policy_id}/sentiment")
async def policy_sentiment(policy_id: str, user: dict = Depends(RequireRole(["govt"]))):
    post = await db_connection.db["posts"].find_one({"_id": parse_policy_id(policy_id), "author_email": user["email"]})
    if not post:
        raise HTTPException(status_code=404, detail="Your policy was not found")
    return {"policy_id": str(post["_id"]), "comment_count": len(post.get("comments", [])), "analysis_status": "pending_sentiment_script"}
