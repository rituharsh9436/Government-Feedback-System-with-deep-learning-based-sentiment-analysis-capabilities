from fastapi import Depends, HTTPException, status, Request
from jose import JWTError, jwt
from config import settings
from database import db_connection
from services.auth_service import decode_token

async def get_current_user(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    jti = payload.get("jti")
    if not jti:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token structure")

    # Check blocklist
    is_revoked = await db_connection.db["token_blocklist"].find_one({"jti": jti})
    if is_revoked:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token has been revoked")

    email = payload.get("sub")
    role = payload.get("role")
    
    if email is None or role is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    # Verify user exists in DB and roles match
    user_record = await db_connection.db["users"].find_one({"email": email})
    if not user_record:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account no longer exists")
        
    if user_record.get("role") != role:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Role mismatch or changed")
        
    if role == "govt" and not user_record.get("is_approved", False):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Government account approval revoked")

    # CSRF Protection for state-changing requests
    if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
        csrf_cookie = request.cookies.get("csrf_token")
        csrf_header = request.headers.get("x-csrf-token")
        if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="CSRF token validation failed")

    return {"email": email, "role": role, "jti": jti}

class RequireRole:
    def __init__(self, allowed_roles: list[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, user: dict = Depends(get_current_user)):
        if user.get("role") not in self.allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")
        return user
