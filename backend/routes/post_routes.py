from datetime import datetime
from typing import Literal, Optional

from fastapi import APIRouter, Depends, Query

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
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    recent: bool = False,
    sort: Literal["newest", "oldest", "most_replied"] = "newest",
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100)
):
    return await get_posts(
        keyword=keyword,
        date_from=date_from,
        date_to=date_to,
        recent=recent,
        sort=sort,
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
async def save_policy_comment(policy_id: str, comment: PolicyComment, user: dict = Depends(RequireRole(["public"]))):
    comment_data = {
        "content": comment.content,
        "author_email": user["email"],
        "author_role": "public",
        "created_at": datetime.utcnow()
    }
    remaining = await add_comment_to_post(policy_id, user["email"], comment_data)
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

