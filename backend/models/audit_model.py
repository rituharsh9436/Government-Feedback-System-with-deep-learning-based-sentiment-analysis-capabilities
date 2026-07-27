from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Any
from bson import ObjectId

class AuditLog(BaseModel):
    action: str = Field(..., description="Action performed")
    user_email: str = Field(..., description="Email of the user who performed the action")
    target_id: Optional[str] = Field(None, description="ID of the target resource (user, post, etc.)")
    details: Optional[str] = Field(None, description="Additional details about the action")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
