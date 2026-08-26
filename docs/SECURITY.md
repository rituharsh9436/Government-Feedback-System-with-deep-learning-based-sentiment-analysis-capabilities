# Security

This document details the security mechanisms implemented in the Smart Government Feedback System.

## Implemented Security Mechanisms

### 1. Authentication & Authorization
- **JWT (JSON Web Tokens)**: The system uses asymmetric/symmetric signing (via `python-jose`) to issue Access and Refresh tokens.
- **HttpOnly Cookies**: Tokens are delivered to the client via `HttpOnly`, `Secure`, and `SameSite=none` cookies. This mitigates Cross-Site Scripting (XSS) attacks by preventing JavaScript from accessing the tokens.
- **Role-Based Access Control (RBAC)**: Enforced at the route level via FastAPI dependencies (e.g., `RequireRole(["admin"])`).

### 2. CSRF Protection
- **Double Submit Cookie Pattern**: A `csrf_token` is generated on login/refresh. It is set as a readable cookie. The frontend must read this cookie and attach it as an `X-CSRF-Token` HTTP header on state-changing requests. The backend verifies that the header matches the expected token format.

### 3. Password & Secret Management
- **Password Hashing**: User passwords and email OTPs are securely hashed using `bcrypt` (via `passlib`) before being stored in the database.
- **Environment Variables**: Sensitive credentials (e.g., MongoDB URL, Secret Keys, Brevo API Key) are excluded from source control and loaded via `.env` files.

### 4. Network Security & Rate Limiting
- **CORS (Cross-Origin Resource Sharing)**: Configured in `app.py` to strictly allow specific origins defined in `config.py`.
- **Rate Limiting**: The `slowapi` library is utilized to restrict the frequency of requests to critical endpoints (e.g., `/auth/login` is limited to 5 requests per minute per IP) to mitigate brute-force and DDoS attacks.
- **Security Headers**: A custom `SecurityHeadersMiddleware` is implemented in `backend/app.py` to inject strict HSTS, `X-Content-Type-Options: nosniff`, and `X-Frame-Options: DENY` headers.

### 5. Audit Logging
- An `audit_model.py` and `audit_service.py` track critical actions such as logins, logouts, profile updates, account deletions, and administrative approvals, providing a forensic trail in the event of an incident.

---

## Security Gaps & Recommendations

- **ML Service Authentication**: The ML service is protected by a static `X-API-Key`. If this key is compromised, unauthorized entities could consume compute resources. Ensure this key is a highly entropic, securely rotated secret.
- **Token Blocklist Expansion**: The current implementation adds the Refresh Token's `jti` to a blocklist on logout. It is recommended to also blocklist the Access Token's `jti` to prevent it from being used for its remaining lifespan (15 minutes).
- **Data Encryption at Rest**: Ensure that the MongoDB instance utilized in production is configured with Encryption at Rest.
