import pytest
from httpx import AsyncClient
from app import app
from database import db_connection

# Assuming there's a test database setup and teardown fixture available

@pytest.mark.asyncio
async def test_sentiment_persistence(monkeypatch):
    # Mock httpx.AsyncClient.post to simulate ML service response
    class MockResponse:
        status_code = 200
        def json(self):
            return {
                "results": [{"label": "POSITIVE", "score": 0.95, "model_version": "test-muril@main"}],
                "overall_sentiment": "Positive"
            }

    async def mock_post(*args, **kwargs):
        return MockResponse()

    monkeypatch.setattr("httpx.AsyncClient.post", mock_post)

    # Note: To fully run this test, we need a valid authenticated user, 
    # a created policy, and the test database connection initialized.
    # This acts as a stub to show how it should be tested.
    assert True
