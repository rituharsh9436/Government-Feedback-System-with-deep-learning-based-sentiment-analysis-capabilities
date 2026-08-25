from pydantic import BaseModel, Field, field_validator
from datetime import datetime
from typing import List, Optional
from .user_model import PyObjectId

import uuid

class PolicyComment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    content: str = Field(min_length=1, max_length=2000)
    author_email: str = ""
    author_role: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

    @field_validator("content")
    def validate_content(cls, v):
        if not v or not str(v).strip():
            raise ValueError("Comment content cannot be empty or just whitespace")
        return v


class Policy(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    title: str
    description: str
    is_active: bool = True
    comments: List[PolicyComment] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
