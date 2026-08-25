import pytest
from fastapi.testclient import TestClient
from app import app
from database import db_connection
import mongomock_motor
from unittest.mock import patch, MagicMock

client = TestClient(app, base_url="https://testserver")

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    mock_client = mongomock_motor.AsyncMongoMockClient()
    mock_db = mock_client.get_database("test_db")
    db_connection.client = mock_client
    db_connection.db = mock_db
    yield

@pytest.mark.asyncio
async def test_signup_admin_blocked():
    response = client.post("/auth/signup/request-otp", json={
        "full_name": "Admin User",
        "email": "admin@example.com",
        "password": "Password@123",
        "role": "admin"
    })
    assert response.status_code == 403

@pytest.mark.asyncio
async def test_signup_and_login_public():
    from services.auth_service import get_password_hash
    user_data = {
        "full_name": "Test Public",
        "email": "public@example.com",
        "hashed_password": get_password_hash("Password@123"),
        "role": "public",
        "is_approved": True
    }
    await db_connection.db["users"].insert_one(user_data)
    
    response = client.post("/auth/login", data={
        "username": "public@example.com",
        "password": "Password@123"
    })
    assert response.status_code == 200
    assert "access_token" in response.cookies
    
    response_invalid = client.post("/auth/login", data={
        "username": "public@example.com",
        "password": "wrong"
    })
    assert response_invalid.status_code == 401

@pytest.mark.asyncio
async def test_logout_idempotent():
    from services.auth_service import get_password_hash
    user_data = {
        "full_name": "Test Logout",
        "email": "logout@example.com",
        "hashed_password": get_password_hash("Password@123"),
        "role": "public",
        "is_approved": True
    }
    await db_connection.db["users"].insert_one(user_data)
    
    # Use a new TestClient instance to ensure clean cookie jar
    local_client = TestClient(app, base_url="https://testserver")
    
    login_response = local_client.post("/auth/login", data={
        "username": "logout@example.com",
        "password": "Password@123"
    })
    assert login_response.status_code == 200
    
    headers = {"x-csrf-token": local_client.cookies.get("csrf_token")}
    
    logout_res1 = local_client.post("/auth/logout", headers=headers)
    assert logout_res1.status_code == 200
    
    logout_res2 = local_client.post("/auth/logout", headers=headers)
    assert logout_res2.status_code == 401
