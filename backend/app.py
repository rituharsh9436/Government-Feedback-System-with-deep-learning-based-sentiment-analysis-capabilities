from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from starlette.middleware.base import BaseHTTPMiddleware
import time

from database import connect_to_mongo, close_mongo_connection, db_connection
from routes.auth_routes import router as auth_router
from routes.post_routes import router as post_router
from routes.admin_analytics_routes import router as admin_analytics_router
from config import settings
from rate_limiter import limiter
from services.logger_service import app_logger

class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        response = await call_next(request)
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        return response

app = FastAPI(title="Smart Government Feedback API", version="1.0.0")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    app_logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error. Please try again later."},
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(SecurityHeadersMiddleware)

app.include_router(post_router)
app.include_router(auth_router)
app.include_router(admin_analytics_router)

START_TIME = time.time()

@app.get("/health", tags=["Monitoring"])
async def health_check():
    db_status = "ok" if db_connection.client else "disconnected"
    return {"status": "healthy", "database": db_status}

@app.get("/metrics", tags=["Monitoring"])
async def metrics():
    uptime = time.time() - START_TIME
    return {"uptime_seconds": uptime}

@app.on_event("startup")
async def startup_db_client():
    app_logger.info("Application starting up...")
    await connect_to_mongo()
    from services.db_init import setup_indexes
    await setup_indexes()

@app.on_event("shutdown")
async def shutdown_db_client():
    app_logger.info("Application shutting down...")
    await close_mongo_connection()
