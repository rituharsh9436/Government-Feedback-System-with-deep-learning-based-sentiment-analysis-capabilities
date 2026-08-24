from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
from services.logger_service import app_logger
import asyncio

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_connection = Database()

async def create_indexes():
    """Create necessary database indexes on startup."""
    try:
        # Unique index for user emails
        await db_connection.db["users"].create_index("email", unique=True)
        
        # TTL index for token blocklist (expires after 7 days = 604800 seconds)
        await db_connection.db["token_blocklist"].create_index(
            "created_at", expireAfterSeconds=604800
        )
        
        # TTL index for pending_users (expires automatically based on expires_at)
        await db_connection.db["pending_users"].create_index(
            "expires_at", expireAfterSeconds=0
        )
        
        # Indexes for posts
        await db_connection.db["posts"].create_index("created_at")
        await db_connection.db["posts"].create_index("category")
        await db_connection.db["posts"].create_index([("title", "text"), ("description", "text")])
        
        app_logger.info("Database indexes created successfully.")
    except Exception as e:
        app_logger.error(f"Error creating database indexes: {e}")

async def connect_to_mongo():
    try:
        # Configure connection pooling for production
        db_connection.client = AsyncIOMotorClient(
            settings.MONGO_URL,
            maxPoolSize=50,
            minPoolSize=10,
            serverSelectionTimeoutMS=5000
        )
        db_connection.db = db_connection.client[settings.DATABASE_NAME]
        
        # Send a ping to confirm a successful connection
        await db_connection.client.admin.command('ping')
        app_logger.info("Connected successfully to MongoDB Atlas!")
        await create_indexes()
    except Exception as e:
        app_logger.error(f"Could not connect to MongoDB: {e}")
        # Depending on deployment strategy, we could sys.exit(1) here if DB is strictly required at startup.
        # But we'll let it retry logic or kubernetes handles restart.

async def close_mongo_connection():
    if db_connection.client:
        app_logger.info("Closing MongoDB connection...")
        db_connection.client.close()