from pydantic import BaseModel, Field, EmailStr, ConfigDict, GetCoreSchemaHandler
from pydantic_core import core_schema
from typing import Optional, Any
from bson import ObjectId
from enum import Enum
class PyObjectId(str):
    @classmethod
    def __get_pydantic_core_schema__(
        cls, _source_type: Any, _handler: GetCoreSchemaHandler
    ) -> core_schema.CoreSchema:
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.union_schema([
                core_schema.is_instance_schema(ObjectId),
                core_schema.chain_schema([
                    core_schema.str_schema(),
                    core_schema.no_info_plain_validator_function(cls.validate),
                ]),
            ]),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x)
            ),
        )

    @classmethod
    def validate(cls, v: Any) -> ObjectId:
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)



class UserRole(str, Enum):
    PUBLIC = "public"
    GOVT = "govt"
    ADMIN = "admin"

class UserInDB(BaseModel):
    id: Optional[PyObjectId] = Field(alias="_id", default=None)
    email: EmailStr
    hashed_password: str
    role: UserRole = UserRole.PUBLIC  # Default to public user
    full_name: str = ""
    aadhaar_number: Optional[str] = None
    contact_number: Optional[str] = None
    department_name: Optional[str] = None
    department_id: Optional[str] = None
    is_approved: bool = True
    
    model_config = ConfigDict(
        populate_by_name=True,
        arbitrary_types_allowed=True,
    )
