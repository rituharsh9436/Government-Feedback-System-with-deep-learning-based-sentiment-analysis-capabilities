from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import Optional
import re
from models.user_model import UserRole

class UserSignup(BaseModel):
    full_name: str = Field(min_length=2, max_length=100, strip_whitespace=True)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    aadhaar_number: Optional[str] = Field(default=None, pattern=r"^\d{12}$")
    contact_number: str = Field(pattern=r"^\+?[1-9]\d{7,14}$", strip_whitespace=True)
    role: UserRole = UserRole.PUBLIC
    department_name: Optional[str] = Field(default=None, min_length=2, max_length=150, strip_whitespace=True)
    department_id: Optional[str] = Field(default=None, min_length=2, max_length=50, strip_whitespace=True)

    @field_validator("password")
    def validate_password_complexity(cls, v):
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError("Password must contain at least one special character")
        return v

    @model_validator(mode="after")
    def require_department_for_government_accounts(self):
        if self.role == UserRole.GOVT and (not self.department_name or not self.department_id):
            raise ValueError("Department name and department ID are required for government accounts")
        if self.role == UserRole.PUBLIC and not self.aadhaar_number:
            raise ValueError("Aadhaar number is required for public accounts")
        return self

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
