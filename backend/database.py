from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

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
        
        logger.info("Database indexes created successfully.")
    except Exception as e:
        logger.error(f"Error creating database indexes: {e}")

async def connect_to_mongo():
    try:
        db_connection.client = AsyncIOMotorClient(settings.MONGO_URL)
        db_connection.db = db_connection.client[settings.DATABASE_NAME]
        # Send a ping to confirm a successful connection
        await db_connection.client.admin.command('ping')
        logger.info("Connected successfully to MongoDB Atlas!")
        await create_indexes()
    except Exception as e:
        logger.error(f"Could not connect to MongoDB: {e}")

async def close_mongo_connection():
    if db_connection.client:
        db_connection.client.close()