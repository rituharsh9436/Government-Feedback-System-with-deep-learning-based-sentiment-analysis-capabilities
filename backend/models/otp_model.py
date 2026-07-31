from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Any

class PendingUser(BaseModel):
    email: EmailStr
    hashed_otp: str
    user_data: dict[str, Any]
    expires_at: datetime
    attempts: int = 0
