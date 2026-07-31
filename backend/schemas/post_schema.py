from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class PostCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=10, max_length=10000)
    category: str = Field(min_length=2, max_length=100)
    location: str = Field(min_length=2, max_length=150)

class CommentResponse(BaseModel):
    content: str
    author_email: str
    author_role: str
    created_at: datetime

class PostResponse(BaseModel):
    id: str
    title: str
    description: str
    category: str
    location: str
    author_email: str
    author_role: str
    created_at: datetime
    is_active: bool = True
    comments: list[CommentResponse] = []
    
    class Config:
        from_attributes = True

class PostPaginatedResponse(BaseModel):
    items: list[PostResponse]
    total: int
    page: int
    limit: int
