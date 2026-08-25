# Project Audit Report

This document contains a comprehensive end-to-end diagnosis of the Smart Government Feedback System codebase. While many issues from previous audits have been resolved (e.g., async def deadlocks, missing DB indexes, IDORs, and OTP logic flaws), I have identified several **critical** new issues across performance, privacy, infrastructure, and availability.

> [!IMPORTANT]
> The codebase contains a severe performance bug that bypasses database indexes, a global rate-limiting flaw in containerized environments, and a privacy leak upon account deletion.

## User Review Required
Please review the findings below. **No code has been modified yet.** Once you approve this diagnosis, I will proceed to apply the fixes across the stack.

---

## 1. Performance & Database Query Bugs

### 1.1 Text Index Bypass (Full Collection Scan)
- **Location:** `backend/services/post_service.py` -> `get_posts()`
- **Issue:** The query uses `$regex` with `$options: "i"` across `title`, `description`, and `category` fields to implement the keyword search. Although a text index is created in `database.py` (`[("title", "text"), ("description", "text")]`), the `$regex` query completely ignores it, forcing MongoDB to perform a full collection scan. For a `description` field of up to 5000 characters, this will cause catastrophic performance degradation at scale.
- **Proposed Fix:** Modify the query to use `{"$text": {"$search": keyword}}` instead of the `$or` `$regex` array.

## 2. Infrastructure & Reliability Issues

### 2.1 Global Rate-Limiter Blocking (Proxy Header Issue)
- **Location:** `backend/rate_limiter.py` and `backend/Dockerfile`
- **Issue:** The `slowapi` limiter uses `get_remote_address`. However, because the backend is containerized and `uvicorn` is started in `Dockerfile` without the `--proxy-headers` flag, FastAPI does not parse `X-Forwarded-For`. As a result, the "remote address" defaults to the IP of the Docker proxy or load balancer. 
- **Impact:** All users share the same rate-limit bucket. Once a few requests are made, **every user** will be blocked globally by HTTP 429 Too Many Requests.
- **Proposed Fix:** Add the `--proxy-headers` flag to the uvicorn command in `backend/Dockerfile`.

### 2.2 Cold-Start Event Loop Starvation in ML Service
- **Location:** `ml-service/main.py` -> `load_model()`
- **Issue:** The HuggingFace `pipeline()` initialization is a heavy, synchronous operation (downloading/loading gigabytes into memory). It is currently called directly inside the `async def load_model()` startup event. This blocks the main thread, causing the `/health` and `/ready` endpoints to become completely unresponsive during model loading.
- **Impact:** Container orchestrators (Docker Compose / Kubernetes) that rely on `healthcheck` timeouts (currently set to 10s) will mistakenly kill and restart the container in an infinite crash-loop before it finishes loading.
- **Proposed Fix:** Offload the synchronous model loading to a background thread using `asyncio.to_thread` to keep the event loop responsive.

## 3. Data Privacy & Integrity

### 3.1 Orphaned Data & GDPR Violation on Account Deletion
- **Location:** `backend/routes/auth_routes.py` -> `delete_me()` and `delete_user()`
- **Issue:** When a user or admin deletes an account, the user document is removed from the `users` collection. However, their `author_email` is left intact on all policies and comments they created in the `posts` collection.
- **Impact:** This violates data privacy expectations (and laws like GDPR) by retaining PII indefinitely after account deletion. It also orphans data, breaking relational integrity.
- **Proposed Fix:** Implement anonymization upon deletion (e.g., updating `author_email` to `"deleted_user"` across `posts` and `comments`), or cascade the deletion based on business requirements.

## 4. Logical & UX Bugs

### 4.1 Sentiment Analysis Metric Corruption
- **Location:** `backend/services/post_service.py` -> `get_policy_sentiment()`
- **Issue:** To calculate sentiment, the code filters `analyzed_comments = [c for c in comments if c.get("sentiment")]`. Because `"pending"` and `"failed"` are truthy strings, unanalyzed comments are incorrectly counted. 
- **Impact:** When a policy only has pending comments, the backend calculates all 0s and defaults to returning `Overall: Mixed` instead of `No Analysis`. The UI blindly renders this incorrect "Mixed" state.
- **Proposed Fix:** Filter out `"pending"` and `"failed"` when building the `analyzed_comments` list, exactly as it is done securely in `get_overall_sentiment()`.

## Open Questions

1. **Deletion Policy:** For orphaned posts/comments (Issue 3.1), would you prefer to **anonymize** the data (replace email with "Deleted User") so the sentiment analytics remain accurate, or **cascade delete** all posts and comments tied to that user? (Anonymization is highly recommended for analytics integrity).
2. **Category Selection UX:** Currently, the frontend `PolicyForm` forces a Government user to post policies exclusively into their own assigned department. While the backend allows "Central" admins to post into any department, the UI disables the input. Should we enable the category dropdown for "Central" government users?
