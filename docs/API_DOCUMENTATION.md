# API Documentation

This document outlines the key REST API endpoints implemented in the Backend API and ML Service.

## Authentication Endpoints (`backend/routes/auth_routes.py`)

### `POST /auth/signup/request-otp`
- **Purpose**: Initiates the signup process by sending an OTP to the provided email.
- **Body**: `OTPRequest` schema (email, password, full_name, role, department_id).
- **Rate Limit**: 5 requests per minute.
- **Response**: `200 OK` with a success message.

### `POST /auth/signup/verify-otp`
- **Purpose**: Verifies the OTP and creates the user account.
- **Body**: `OTPVerify` schema (email, otp).
- **Response**: `201 Created`. Returns whether the account is approved (Public) or pending (Govt).

### `POST /auth/login`
- **Purpose**: Authenticates a user.
- **Body**: OAuth2 Form Data (`username`, `password`).
- **Response**: Sets `access_token`, `refresh_token`, and `csrf_token` as cookies. Returns user role.

### `POST /auth/refresh`
- **Purpose**: Refreshes expired access tokens.
- **Headers**: Reads `refresh_token` from cookies.
- **Response**: Rotates refresh token and issues new access token as cookies.

### `POST /auth/logout`
- **Purpose**: Logs out the user.
- **Headers**: Requires authentication.
- **Response**: Clears cookies and adds token JTI to blocklist.

---

## Policy and Feedback Endpoints (`backend/routes/post_routes.py`)

### `POST /posts/`
- **Purpose**: Creates a new policy.
- **Authentication**: Requires `govt` role.
- **Body**: `PostCreate` schema (title, description, category).
- **Response**: `201 Created` with the new Post ID.

### `GET /posts/`
- **Purpose**: Retrieves a paginated list of policies with filtering and sorting.
- **Query Parameters**: `keyword`, `department`, `date_from`, `date_to`, `sort_date`, `sort_popularity`, `page`, `limit`.
- **Response**: Paginated `PostPaginatedResponse`.

### `GET /posts/{policy_id}/comments`
- **Purpose**: Retrieves paginated comments for a specific policy.
- **Response**: Paginated list of comments including sentiment scores.

### `POST /posts/{policy_id}/comments`
- **Purpose**: Submits feedback/comment for a policy.
- **Authentication**: Requires `public` role.
- **Body**: `PolicyComment` schema (content).
- **Response**: `201 Created`. (Triggers background sentiment analysis).

---

## Admin Analytics Endpoints (`backend/routes/admin_analytics_routes.py`)

### `GET /admin/analytics/overview`
- **Purpose**: Retrieves high-level aggregated statistics (total policies, total comments, sentiment distribution).
- **Authentication**: Requires `admin` role (or `govt` for their specific department).
- **Query Parameters**: `department`, `date_from`, `date_to`.

---

## ML Service Endpoints (`ml-service/app.py`)

### `POST /analyze`
- **Purpose**: Performs sentiment analysis on a batch of texts.
- **Security**: Requires `X-API-Key` header matching the server's environment variable.
- **Body**: `TextRequest` (list of text strings).
- **Response**: `AnalysisResponse` containing predictions (`label`: Positive/Negative/Neutral, `score`).

### `GET /health`
- **Purpose**: Basic health check. Returns `{"status": "ok"}`.

### `GET /ready`
- **Purpose**: Liveness probe. Returns `{"status": "ready"}` only if the Hugging Face model has successfully loaded into memory.
