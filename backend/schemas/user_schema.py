from pydantic import BaseModel, EmailStr, Field
from models.user_model import UserRole

class UserSignup(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    aadhaar_number: str = Field(pattern=r"^\d{12}$")
    contact_number: str = Field(pattern=r"^\+?[1-9]\d{7,14}$")
    role: UserRole = UserRole.PUBLIC

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
