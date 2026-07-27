from fastapi import APIRouter, Depends, HTTPException, Query, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from typing import Optional

from database import db_connection
from config import settings
from models.user_model import UserInDB, UserRole
from schemas.user_schema import UserSignup, UserLogin
from services.auth_service import create_access_token, create_refresh_token, get_password_hash, verify_password, generate_csrf_token, decode_token
from services.dependencies import get_current_user
from services.audit_service import log_audit_action
from rate_limiter import limiter
from datetime import datetime

router = APIRouter(prefix="/auth", tags=["Authentication"])

def public_user(user: dict) -> dict:
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
@limiter.limit("5/minute")
async def signup(request: Request, user_data: UserSignup):
    if user_data.role == UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin accounts can only be created manually")

    if await db_connection.db["users"].find_one({"email": user_data.email}):
        raise HTTPException(status_code=400, detail="Email already registered")

    requested_role = user_data.role
    if requested_role == UserRole.GOVT:
        valid_department = await db_connection.db[settings.VALID_DEPARTMENT_IDS_COLLECTION].find_one(
            {"department_id": user_data.department_id}
        )
        if not valid_department:
            raise HTTPException(status_code=400, detail="Invalid department ID")
    else:
        valid_aadhaar = await db_connection.db[settings.VALID_AADHAAR_NUMBERS_COLLECTION].find_one(
            {"aadhaar_number": user_data.aadhaar_number}
        )
        if not valid_aadhaar:
            raise HTTPException(status_code=400, detail="Aadhaar number is not in the valid Aadhaar register")
        if await db_connection.db["users"].find_one({"aadhaar_number": user_data.aadhaar_number}):
            raise HTTPException(status_code=400, detail="Aadhaar number already registered")

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
    await log_audit_action("signup", new_user["email"], details=f"Role: {requested_role.value}")
    
    message = "Government account request submitted for admin approval" if requested_role == UserRole.GOVT else "Public account created"
    return {"message": message, "is_approved": new_user["is_approved"]}


@router.post("/login")
@limiter.limit("5/minute")
async def login(request: Request, response: Response, form_data: OAuth2PasswordRequestForm = Depends()):
    user_data = await db_connection.db["users"].find_one({"email": form_data.username})
    if not user_data or not verify_password(form_data.password, user_data["hashed_password"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if user_data["role"] == UserRole.GOVT.value and not user_data.get("is_approved", False):
        raise HTTPException(status_code=403, detail="Your government account is awaiting admin approval")

    user = UserInDB(**user_data)
    access_token, _ = create_access_token(data={"sub": user.email, "role": user.role.value})
    refresh_token, _ = create_refresh_token(data={"sub": user.email, "role": user.role.value})
    csrf_token = generate_csrf_token()

    # Set HttpOnly Cookies
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="lax", max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="lax", max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400)
    response.set_cookie(key="csrf_token", value=csrf_token, httponly=False, secure=True, samesite="lax") # Readable by JS for headers

    await log_audit_action("login", user.email)
    return {"message": "Successfully logged in", "role": user.role.value, "csrf_token": csrf_token}

@router.post("/refresh")
@limiter.limit("10/minute")
async def refresh_token(request: Request, response: Response):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    jti = payload.get("jti")
    is_revoked = await db_connection.db["token_blocklist"].find_one({"jti": jti})
    if is_revoked:
        raise HTTPException(status_code=401, detail="Refresh token revoked")

    email = payload.get("sub")
    role = payload.get("role")
    
    # Revoke old refresh token (Rotation)
    await db_connection.db["token_blocklist"].insert_one({"jti": jti, "revoked_at": datetime.utcnow()})

    access_token, _ = create_access_token(data={"sub": email, "role": role})
    new_refresh_token, _ = create_refresh_token(data={"sub": email, "role": role})
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="lax", max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    response.set_cookie(key="refresh_token", value=new_refresh_token, httponly=True, secure=True, samesite="lax", max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400)
    
    return {"message": "Tokens refreshed successfully"}

@router.post("/logout")
async def logout(response: Response, current_user: dict = Depends(get_current_user)):
    jti = current_user.get("jti")
    if jti:
        await db_connection.db["token_blocklist"].insert_one({"jti": jti, "revoked_at": datetime.utcnow()})
        
    response.delete_cookie("access_token")
    response.delete_cookie("refresh_token")
    response.delete_cookie("csrf_token")
    
    await log_audit_action("logout", current_user["email"])
    return {"message": "Successfully logged out"}


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
        
    await log_audit_action("approve_government_request", current_user["email"], target_id=user_id)
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
        
    await log_audit_action("delete_user", current_user["email"], target_id=user_id)
    return {"message": "Account deleted"}
