from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
from services.logger_service import app_logger
import asyncio

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_connection = Database()

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
    except Exception as e:
        app_logger.error(f"Could not connect to MongoDB: {e}")
        # Depending on deployment strategy, we could sys.exit(1) here if DB is strictly required at startup.
        # But we'll let it retry logic or kubernetes handles restart.

async def close_mongo_connection():
    if db_connection.client:
        app_logger.info("Closing MongoDB connection...")
        db_connection.client.close()