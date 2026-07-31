from pydantic import BaseModel, EmailStr, Field
from schemas.user_schema import UserSignup

class OTPRequest(UserSignup):
    pass

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)
