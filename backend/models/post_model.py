from pydantic import BaseModel, Field
from datetime import datetime
from typing import List, Optional
from .user_model import PyObjectId

class PolicyComment(BaseModel):
    content: str = Field(min_length=1, max_length=2000)
    author_email: str = ""
    author_role: str = ""
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Policy(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    title: str
    department: str  # e.g., Transport, Health, Finance
    description: str
    is_active: bool = True
    comments: List[PolicyComment] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
