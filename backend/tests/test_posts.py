import pytest
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_get_all_posts():
    response = client.get("/posts/?page=1&limit=10")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data

def test_get_overall_sentiment_unauthorized():
    response = client.get("/posts/analytics/overall-sentiment")
    # Should fail because no auth token is provided
    assert response.status_code == 401
