from pydantic import BaseModel, Field
from typing import Optional

class PostCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str = Field(min_length=10, max_length=10000)
    category: str = Field(min_length=2, max_length=100)
    location: str = Field(min_length=2, max_length=150)
    
