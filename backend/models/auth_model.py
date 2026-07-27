from pydantic import BaseModel, Field
from datetime import datetime

class TokenBlocklist(BaseModel):
    jti: str = Field(..., description="JWT ID")
    revoked_at: datetime = Field(default_factory=datetime.utcnow)
