from fastapi import APIRouter, Depends, HTTPException, Query, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from typing import Optional

from database import db_connection
from config import settings
from models.user_model import UserInDB, UserRole
from schemas.user_schema import UserSignup, UserLogin, UserResponse, UserPaginatedResponse
from schemas.otp_schema import OTPRequest, OTPVerify
from services.auth_service import create_access_token, create_refresh_token, get_password_hash, verify_password, generate_csrf_token, decode_token
from services.dependencies import get_current_user
from services.audit_service import log_audit_action
from services.email_service import send_otp_email
from rate_limiter import limiter
from datetime import datetime, timedelta
import secrets

router = APIRouter(prefix="/auth", tags=["Authentication"])

def map_user_to_response(user: dict) -> dict:
    user["id"] = str(user["_id"])
    return user


def require_admin(current_user: dict) -> None:
    if current_user["role"] != UserRole.ADMIN.value:
        raise HTTPException(status_code=403, detail="Administrator access required")

@router.post("/signup/request-otp", status_code=status.HTTP_200_OK)
@limiter.limit("5/minute")
async def request_otp(request: Request, user_data: OTPRequest):
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

    # Generate 6-digit OTP
    otp = "".join([str(secrets.randbelow(10)) for _ in range(6)])
    hashed_otp = get_password_hash(otp)

    # Calculate expiration (5 minutes)
    expires_at = datetime.utcnow() + timedelta(minutes=5)

    pending_user = {
        "email": str(user_data.email),
        "hashed_otp": hashed_otp,
        "user_data": user_data.model_dump(),
        "expires_at": expires_at,
        "attempts": 0
    }

    # Upsert the pending user
    await db_connection.db["pending_users"].update_one(
        {"email": str(user_data.email)},
        {"$set": pending_user},
        upsert=True
    )

    await send_otp_email(str(user_data.email), otp)
    await log_audit_action("request_otp", str(user_data.email))
    
    return {"message": "OTP sent to your email. It expires in 5 minutes."}

@router.post("/signup/verify-otp", status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def verify_otp(request: Request, verify_data: OTPVerify):
    email = str(verify_data.email)
    pending_record = await db_connection.db["pending_users"].find_one({"email": email})

    if not pending_record:
        raise HTTPException(status_code=400, detail="No pending signup found or OTP expired. Please request a new OTP.")

    if not verify_password(verify_data.otp, pending_record["hashed_otp"]):
        new_attempts = pending_record["attempts"] + 1
        if new_attempts >= 5:
            await db_connection.db["pending_users"].delete_one({"email": email})
            raise HTTPException(status_code=400, detail="Too many invalid attempts. Please request a new OTP.")
            
        await db_connection.db["pending_users"].update_one(
            {"email": email},
            {"$set": {"attempts": new_attempts}}
        )
        raise HTTPException(status_code=400, detail="Invalid OTP")

    # OTP is valid, create the user account
    user_data = pending_record["user_data"]
    requested_role = UserRole(user_data["role"])

    new_user = {
        "full_name": user_data["full_name"],
        "email": email,
        "hashed_password": get_password_hash(user_data["password"]),
        "department_name": user_data.get("department_name") if requested_role == UserRole.GOVT else None,
        "department_id": user_data.get("department_id") if requested_role == UserRole.GOVT else None,
        "role": requested_role.value,
        "is_approved": requested_role == UserRole.PUBLIC,
    }

    await db_connection.db["users"].insert_one(new_user)
    
    # Remove pending record
    await db_connection.db["pending_users"].delete_one({"email": email})
    
    await log_audit_action("signup", email, details=f"Role: {requested_role.value} (OTP Verified)")
    
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
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=True, samesite="none", max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400)
    response.set_cookie(key="csrf_token", value=csrf_token, httponly=False, secure=True, samesite="none") # Readable by JS for headers

    await log_audit_action("login", user.email)
    return {"message": "Successfully logged in", "role": user.role.value}

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
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=True, samesite="none", max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60)
    response.set_cookie(key="refresh_token", value=new_refresh_token, httponly=True, secure=True, samesite="none", max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400)
    
    return {"message": "Tokens refreshed successfully"}

@router.post("/logout")
async def logout(response: Response, current_user: dict = Depends(get_current_user)):
    jti = current_user.get("jti")
    if jti:
        await db_connection.db["token_blocklist"].insert_one({"jti": jti, "revoked_at": datetime.utcnow()})
        
    response.delete_cookie(key="access_token", secure=True, samesite="none")
    response.delete_cookie(key="refresh_token", secure=True, samesite="none")
    response.delete_cookie(key="csrf_token", secure=True, samesite="none")
    
    await log_audit_action("logout", current_user["email"])
    return {"message": "Successfully logged out"}


@router.get("/me", response_model=UserResponse)
async def me(current_user: dict = Depends(get_current_user)):
    user = await db_connection.db["users"].find_one({"email": current_user["email"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return map_user_to_response(user)


@router.get("/government-requests", response_model=UserPaginatedResponse)
async def list_government_requests(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    require_admin(current_user)
    skip = (page - 1) * limit
    
    query = {"role": UserRole.GOVT.value, "is_approved": False}
    total = await db_connection.db["users"].count_documents(query)
    
    users = []
    cursor = db_connection.db["users"].find(query).skip(skip).limit(limit)
    async for user in cursor:
        users.append(map_user_to_response(user))
        
    return {"items": users, "total": total, "page": page, "limit": limit}


@router.get("/users", response_model=UserPaginatedResponse)
async def list_managed_users(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    current_user: dict = Depends(get_current_user)
):
    require_admin(current_user)
    skip = (page - 1) * limit
    
    query = {"role": {"$in": [UserRole.PUBLIC.value, UserRole.GOVT.value]}}
    total = await db_connection.db["users"].count_documents(query)
    
    users = []
    cursor = db_connection.db["users"].find(query).skip(skip).limit(limit)
    async for user in cursor:
        users.append(map_user_to_response(user))
        
    return {"items": users, "total": total, "page": page, "limit": limit}


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
