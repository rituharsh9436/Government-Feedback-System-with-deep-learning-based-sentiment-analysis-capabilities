from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, Query, HTTPException, BackgroundTasks

from database import db_connection
from models.post_model import PolicyComment
from schemas.post_schema import PostCreate, PostResponse, PostPaginatedResponse
from services.dependencies import get_current_user, RequireRole
from services.post_service import (
    create_post as service_create_post,
    get_posts,
    get_post_by_id,
    add_comment_to_post,
    delete_post_by_id,
    get_policy_sentiment as service_get_policy_sentiment,
    get_overall_sentiment as service_get_overall_sentiment
)

router = APIRouter(prefix="/posts", tags=["Policies"])

@router.post("/", status_code=201)
async def create_post(data: PostCreate, user: dict = Depends(RequireRole(["govt"]))):
    user_record = await db_connection.db["users"].find_one({"email": user["email"]})
    if not user_record or data.category.lower() != str(user_record.get("department_name")).lower():
        if user_record and user_record.get("department_name") != "Central":
            raise HTTPException(status_code=403, detail="Category must match your assigned department")

    post = data.model_dump()
    post.update({
        "author_email": user["email"],
        "author_role": "govt",
        "created_at": datetime.utcnow(),
        "comments": []
    })
    post_id = await service_create_post(post)
    return {"id": post_id, "message": "Policy published"}

@router.get("/", response_model=PostPaginatedResponse)
async def get_all_posts(
    keyword: Optional[str] = None,
    department: Optional[str] = None,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    recent: bool = False,
    sort_date: Optional[Literal["newest", "oldest"]] = "newest",
    sort_name: Optional[Literal["asc", "desc"]] = None,
    sort_popularity: Optional[Literal["most_replied", "least_replied"]] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100)
):
    return await get_posts(
        keyword=keyword,
        department=department,
        date_from=date_from,
        date_to=date_to,
        recent=recent,
        sort_date=sort_date,
        sort_name=sort_name,
        sort_popularity=sort_popularity,
        page=page,
        limit=limit
    )

@router.get("/analytics/overall-sentiment")
async def overall_sentiment(user: dict = Depends(RequireRole(["govt"]))):
    totals = await service_get_overall_sentiment(user["email"])
    totals["analysis_status"] = "completed"
    return totals

@router.get("/{policy_id}", response_model=PostResponse)
async def get_post(policy_id: str):
    return await get_post_by_id(policy_id)

@router.post("/{policy_id}/comments", status_code=201)
async def save_policy_comment(
    policy_id: str, 
    comment: PolicyComment, 
    background_tasks: BackgroundTasks,
    user: dict = Depends(RequireRole(["public"]))
):
    comment_data = {
        "content": comment.content,
        "author_email": user["email"],
        "author_role": "public",
        "created_at": datetime.utcnow()
    }
    remaining = await add_comment_to_post(policy_id, user["email"], comment_data, background_tasks)
    return {"message": "Comment added successfully", "remaining_replies": remaining}

@router.delete("/{policy_id}")
async def delete_post(policy_id: str, user: dict = Depends(RequireRole(["admin", "govt"]))):
    await delete_post_by_id(policy_id, user["role"], user["email"])
    return {"message": "Policy deleted"}

@router.get("/{policy_id}/sentiment")
async def policy_sentiment(policy_id: str, user: dict = Depends(RequireRole(["govt"]))):
    pid, count, analysis = await service_get_policy_sentiment(policy_id, user["email"])
    return {
        "policy_id": pid,
        "comment_count": count,
        "analysis_status": "completed",
        "analysis": analysis
    }

