import pytest
from httpx import AsyncClient
from app import app
from database import db_connection
from models.user_model import UserRole
import time

@pytest.fixture
async def mock_admin_user():
    return {
        "id": "admin_test",
        "email": "admin@test.com",
        "role": UserRole.ADMIN,
        "full_name": "Admin Tester",
        "department_name": "Central"
    }

@pytest.fixture
async def mock_govt_user():
    return {
        "id": "govt_test",
        "email": "govt@test.com",
        "role": UserRole.GOVT,
        "department_id": "DEP1",
        "department_name": "Health",
        "full_name": "Govt Tester"
    }

@pytest.fixture
async def mock_public_user():
    return {
        "id": "public_test",
        "email": "public@test.com",
        "role": UserRole.PUBLIC,
        "full_name": "Public Tester"
    }

async def get_test_client_with_auth(user_data):
    # Mock the dependency injection for authentication
    from services.dependencies import get_current_user
    app.dependency_overrides[get_current_user] = lambda: user_data
    return AsyncClient(app=app, base_url="http://test")

@pytest.mark.asyncio
async def test_admin_analytics_auth_protection(mock_govt_user, mock_public_user):
    # Test Govt User
    client = await get_test_client_with_auth(mock_govt_user)
    response = await client.get("/admin/analytics/overview")
    assert response.status_code == 403
    assert response.json() == {"detail": "Insufficient permissions"}

    # Test Public User
    client = await get_test_client_with_auth(mock_public_user)
    response = await client.get("/admin/analytics/overview")
    assert response.status_code == 403
    assert response.json() == {"detail": "Insufficient permissions"}

@pytest.mark.asyncio
async def test_admin_analytics_overview(mock_admin_user):
    client = await get_test_client_with_auth(mock_admin_user)
    
    # Need to wait until db connects or mock db
    # We assume db is active if we get here in a full test suite
    response = await client.get("/admin/analytics/overview")
    assert response.status_code == 200
    
    data = response.json()
    assert "total_feedback" in data
    assert "sentiment" in data
    assert "positive" in data["sentiment"]

@pytest.mark.asyncio
async def test_admin_analytics_trends(mock_admin_user):
    client = await get_test_client_with_auth(mock_admin_user)
    response = await client.get("/admin/analytics/trends")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_admin_analytics_policies(mock_admin_user):
    client = await get_test_client_with_auth(mock_admin_user)
    response = await client.get("/admin/analytics/policies")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

@pytest.mark.asyncio
async def test_admin_analytics_confidence(mock_admin_user):
    client = await get_test_client_with_auth(mock_admin_user)
    response = await client.get("/admin/analytics/confidence")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
