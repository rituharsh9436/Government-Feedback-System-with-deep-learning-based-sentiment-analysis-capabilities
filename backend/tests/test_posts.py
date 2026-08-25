import pytest
from fastapi.testclient import TestClient
from app import app
from database import db_connection
import mongomock_motor
from unittest.mock import patch, MagicMock
from services.auth_service import create_access_token
import uuid
import httpx

client = TestClient(app, base_url="https://testserver")

@pytest.fixture(scope="module", autouse=True)
def setup_db():
    mock_client = mongomock_motor.AsyncMongoMockClient()
    mock_db = mock_client.get_database("test_db")
    db_connection.client = mock_client
    db_connection.db = mock_db
    yield

def get_auth_headers(email: str, role: str):
    token, _ = create_access_token({"sub": email, "role": role})
    # Since dependencies use cookies, we will set them on the client for the test.
    # Actually, we can return cookies dict.
    return {"access_token": token, "csrf_token": "dummy"}, {"x-csrf-token": "dummy"}

@pytest.mark.asyncio
async def test_authorization_matrix():
    # Setup users
    await db_connection.db["users"].insert_many([
        {"email": "public@example.com", "role": "public", "is_approved": True},
        {"email": "govtA@example.com", "role": "govt", "department_name": "DeptA", "department_id": "A", "is_approved": True},
        {"email": "govtB@example.com", "role": "govt", "department_name": "DeptB", "department_id": "B", "is_approved": True},
        {"email": "central@example.com", "role": "govt", "department_name": "Central", "department_id": "C", "is_approved": True},
        {"email": "admin@example.com", "role": "admin", "is_approved": True}
    ])
    
    # 1. public -> protected govt endpoint
    pub_cookies, pub_headers = get_auth_headers("public@example.com", "public")
    res = client.post("/posts/", json={"title": "Title 1", "description": "Description 1", "category": "DeptA", "location": "loc"}, cookies=pub_cookies, headers=pub_headers)
    assert res.status_code == 403
    
    # 2. public -> admin endpoint
    res = client.get("/auth/users", cookies=pub_cookies, headers=pub_headers)
    assert res.status_code == 403
    
    # 3. govt -> admin endpoint
    gov_cookies, gov_headers = get_auth_headers("govtA@example.com", "govt")
    res = client.get("/auth/users", cookies=gov_cookies, headers=gov_headers)
    assert res.status_code == 403

    # 4. govt dept A -> dept B analytics
    # Create a post in DeptB
    post_res = client.post("/posts/", json={"title": "Title 2", "description": "Description 2", "category": "DeptB", "location": "loc"}, cookies=gov_cookies, headers=gov_headers)
    assert post_res.status_code == 403 # govt A trying to create policy for DeptB

    govB_cookies, govB_headers = get_auth_headers("govtB@example.com", "govt")
    post_res = client.post("/posts/", json={"title": "Title 2", "description": "Description 2", "category": "DeptB", "location": "loc"}, cookies=govB_cookies, headers=govB_headers)
    assert post_res.status_code == 201
    post_id = post_res.json()["id"]

    res = client.get(f"/posts/{post_id}/sentiment", cookies=gov_cookies, headers=gov_headers)
    assert res.status_code == 403

    # 5. Central govt -> cross-department analytics
    central_cookies, central_headers = get_auth_headers("central@example.com", "govt")
    res = client.get(f"/posts/{post_id}/sentiment", cookies=central_cookies, headers=central_headers)
    assert res.status_code == 200

@pytest.mark.asyncio
async def test_feedback_limits_and_ml(monkeypatch):
    govB_cookies, govB_headers = get_auth_headers("govtB@example.com", "govt")
    post_res = client.post("/posts/", json={"title": "Title 3", "description": "Description 3", "category": "DeptB", "location": "loc"}, cookies=govB_cookies, headers=govB_headers)
    post_id = post_res.json()["id"]

    pub_cookies, pub_headers = get_auth_headers("public@example.com", "public")

    # 1. successful comment
    res = client.post(f"/posts/{post_id}/comments", json={"content": "Good"}, cookies=pub_cookies, headers=pub_headers)
    assert res.status_code == 201
    assert res.json()["remaining_replies"] == 2

    # 2. Add 2 more comments to hit the limit
    client.post(f"/posts/{post_id}/comments", json={"content": "Ok"}, cookies=pub_cookies, headers=pub_headers)
    res = client.post(f"/posts/{post_id}/comments", json={"content": "Bad"}, cookies=pub_cookies, headers=pub_headers)
    assert res.status_code == 201
    assert res.json()["remaining_replies"] == 0

    # 4th comment attempt
    res = client.post(f"/posts/{post_id}/comments", json={"content": "Limit"}, cookies=pub_cookies, headers=pub_headers)
    assert res.status_code == 400
    assert "three replies" in res.json()["detail"]

    # Test ML behavior via direct invocation of background task
    from services.post_service import process_comment_sentiment_bg
    from bson import ObjectId

    # Get a comment id
    post = await db_connection.db["posts"].find_one({"_id": ObjectId(post_id)})
    comments = await db_connection.db["comments"].find({"post_id": ObjectId(post_id)}).to_list(length=None)
    c_id = str(comments[0]["_id"])

    # ML success
    class MockResponse:
        status_code = 200
        def json(self):
            return {"results": [{"label": "POSITIVE", "score": 0.9}]}
    async def mock_post_success(*args, **kwargs):
        return MockResponse()
    
    monkeypatch.setattr("httpx.AsyncClient.post", mock_post_success)
    await process_comment_sentiment_bg(post_id, "public@example.com", "Good", c_id)
    comments = await db_connection.db["comments"].find({"post_id": ObjectId(post_id)}).to_list(length=None)
    assert comments[0]["sentiment"] == "POSITIVE"

    # ML permanent failure (e.g. 500 always)
    c_id2 = str(comments[1]["_id"])
    class MockResponse500:
        status_code = 500
    async def mock_post_fail(*args, **kwargs):
        return MockResponse500()
    monkeypatch.setattr("httpx.AsyncClient.post", mock_post_fail)
    
    # Let's override sleep to speed up test
    import asyncio
    monkeypatch.setattr(asyncio, "sleep", lambda x: None)
    
    await process_comment_sentiment_bg(post_id, "public@example.com", "Ok", c_id2)
    comments = await db_connection.db["comments"].find({"post_id": ObjectId(post_id)}).to_list(length=None)
    assert comments[1]["sentiment"] == "failed"
    
@pytest.mark.asyncio
async def test_analytics():
    govB_cookies, govB_headers = get_auth_headers("govtB@example.com", "govt")
    res = client.get("/posts/analytics/overall-sentiment", cookies=govB_cookies, headers=govB_headers)
    assert res.status_code == 200
    data = res.json()
    assert "overall_sentiment" in data
