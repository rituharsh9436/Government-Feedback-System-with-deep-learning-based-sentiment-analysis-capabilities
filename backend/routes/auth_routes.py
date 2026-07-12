from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.security import OAuth2PasswordRequestForm

from database import db_connection
from models.user_model import UserInDB, UserRole
from schemas.user_schema import UserSignup
from services.auth_service import create_access_token, get_password_hash, verify_password
from services.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


def public_user(user: dict) -> dict:
    """Return account data without its password hash or Aadhaar number."""
    return {
        "id": str(user["_id"]),
        "full_name": user.get("full_name", ""),
        "email": user["email"],
        "contact_number": user.get("contact_number", ""),
        "department_name": user.get("department_name"),
        "department_id": user.get("department_id"),
        "role": user["role"],
        "is_approved": user.get("is_approved", True),
    }


def require_admin(current_user: dict) -> None:
    if current_user["role"] != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Administrator access required")


@router.post("/signup", status_code=status.HTTP_201_CREATED)
async def signup(user_data: UserSignup):
    if user_data.role == UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin accounts can only be created manually")

    if await db_connection.db["users"].find_one({"email": user_data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    if user_data.aadhaar_number and await db_connection.db["users"].find_one({"aadhaar_number": user_data.aadhaar_number}):
        raise HTTPException(status_code=400, detail="Aadhaar number already registered")

    requested_role = user_data.role
    new_user = {
        "full_name": user_data.full_name,
        "email": str(user_data.email),
        "hashed_password": get_password_hash(user_data.password),
        "contact_number": user_data.contact_number,
        "department_name": user_data.department_name if requested_role == UserRole.GOVT else None,
        "department_id": user_data.department_id if requested_role == UserRole.GOVT else None,
        "role": requested_role.value,
        "is_approved": requested_role == UserRole.PUBLIC,
    }
    if requested_role == UserRole.PUBLIC:
        new_user["aadhaar_number"] = user_data.aadhaar_number
    await db_connection.db["users"].insert_one(new_user)
    message = "Government account request submitted for admin approval" if requested_role == UserRole.GOVT else "Public account created"
    return {"message": message, "is_approved": new_user["is_approved"]}


@router.post("/login")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user_data = await db_connection.db["users"].find_one({"email": form_data.username})
    if not user_data or not verify_password(form_data.password, user_data["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if user_data["role"] == UserRole.GOVT.value and not user_data.get("is_approved", False):
        raise HTTPException(status_code=403, detail="Your government account is awaiting admin approval")

    user = UserInDB(**user_data)
    access_token = create_access_token(data={"sub": user.email, "role": user.role.value})
    return {"access_token": access_token, "token_type": "bearer", "role": user.role.value}


@router.get("/me")
async def me(current_user: dict = Depends(get_current_user)):
    user = await db_connection.db["users"].find_one({"email": current_user["email"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return public_user(user)


@router.get("/government-requests")
async def list_government_requests(current_user: dict = Depends(get_current_user)):
    require_admin(current_user)
    users = []
    cursor = db_connection.db["users"].find({"role": UserRole.GOVT.value, "is_approved": False})
    async for user in cursor:
        users.append(public_user(user))
    return users


@router.get("/users")
async def list_managed_users(current_user: dict = Depends(get_current_user)):
    require_admin(current_user)
    users = []
    async for user in db_connection.db["users"].find({"role": {"$in": [UserRole.PUBLIC.value, UserRole.GOVT.value]}}):
        users.append(public_user(user))
    return users


@router.post("/government-requests/{user_id}/approve")
async def approve_government_request(user_id: str, current_user: dict = Depends(get_current_user)):
    from bson import ObjectId
    require_admin(current_user)
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user id")
    result = await db_connection.db["users"].update_one(
        {"_id": ObjectId(user_id), "role": UserRole.GOVT.value, "is_approved": False},
        {"$set": {"is_approved": True}},
    )
    if not result.modified_count:
        raise HTTPException(status_code=404, detail="Pending government account not found")
    return {"message": "Government account approved"}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    from bson import ObjectId
    require_admin(current_user)
    if not ObjectId.is_valid(user_id):
        raise HTTPException(status_code=400, detail="Invalid user id")
    result = await db_connection.db["users"].delete_one(
        {"_id": ObjectId(user_id), "role": {"$in": [UserRole.PUBLIC.value, UserRole.GOVT.value]}},
    )
    if not result.deleted_count:
        raise HTTPException(status_code=404, detail="Public or government account not found")
    return {"message": "Account deleted"}
