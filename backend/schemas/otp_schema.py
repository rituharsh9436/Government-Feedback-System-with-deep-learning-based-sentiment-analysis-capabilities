from pydantic import BaseModel, EmailStr, Field, field_validator
from schemas.user_schema import UserSignup

class OTPRequest(UserSignup):
    pass

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)

    @field_validator("email", mode="before")
    def lowercase_email(cls, v):
        return v.lower() if isinstance(v, str) else v
