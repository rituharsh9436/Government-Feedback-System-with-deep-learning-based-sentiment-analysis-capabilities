import pytest
from fastapi.testclient import TestClient
from main import app
import os

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

# The /ready endpoint and /analyze endpoint behavior depend on whether the model is loaded.
# Assuming the test runs with a lightweight model or we mock the pipeline.
# Since we might not want to download a huge model in CI for simple unit tests, 
# we can just test the validation of the /analyze endpoint.

def test_analyze_empty_texts():
    # If the model is not loaded, it might return 503, but if it is loaded, it should return Neutral
    # Let's just check validation first.
    response = client.post("/analyze", json={"texts": []})
    assert response.status_code in [200, 503]
    if response.status_code == 200:
        assert response.json()["overall_sentiment"] == "Neutral"

def test_analyze_validation_error():
    response = client.post("/analyze", json={"invalid": "payload"})
    assert response.status_code == 422
