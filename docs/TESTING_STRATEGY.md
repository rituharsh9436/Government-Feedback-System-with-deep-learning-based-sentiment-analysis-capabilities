# Testing Strategy

This document outlines the testing strategy currently implemented in the Smart Government Feedback System.

## Current Implementation

### 1. Backend Testing (`backend/tests/`)
- **Framework**: `pytest` and `pytest-asyncio`.
- **Mocking**: The `mongomock-motor` package is used to mock the MongoDB database, allowing unit and integration tests to run entirely in memory without requiring a live database instance.
- **API Testing**: The `httpx` AsyncClient is used in combination with FastAPI's TestClient to simulate HTTP requests against the router endpoints.

### 2. ML Service Testing (`ml-service/tests/`)
- **Load Testing**: A script named `test_load.py` exists in the `ml-service` root, indicating the presence of automated or manual load testing/benchmarking for the sentiment analysis batch queue.

### 3. Frontend Testing
- **Framework**: Jest and React Testing Library.
- **Presence**: Standard scaffolding files (`App.test.js`, `setupTests.js`) are present, indicating a foundational setup for component testing.

---

## Current Gaps

- **E2E Testing**: There is no evidence of End-to-End testing frameworks (like Cypress or Playwright) to test the integrated flow from the browser to the database.
- **CI Integration**: There are no GitHub Actions, GitLab CI, or Jenkins pipelines configured in the repository to automatically run these tests on pull requests or commits.
- **Test Coverage**: There is no configuration for generating or enforcing test coverage metrics (e.g., `pytest-cov`).

---

## Recommended Improvements

1. **Implement CI/CD**: Add a `.github/workflows/test.yml` file to automatically execute the `pytest` suite and the frontend Jest tests on every push to the `main` branch.
2. **Expand ML Service Tests**: Add unit tests for the ML Service's batch processor to ensure it correctly handles timeouts, empty batches, and inference exceptions.
3. **Frontend Component Tests**: Expand the React Testing Library suite to cover complex components like the Analytics Dashboards and the Auth forms.
4. **End-to-End Tests**: Introduce Cypress to automate testing of the full "Signup -> Publish Policy -> Comment -> View Analytics" workflow against a staging environment.
