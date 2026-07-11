from motor.motor_asyncio import AsyncIOMotorClient
from config import settings
import logging

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_connection = Database()

async def connect_to_mongo():
    try:
        db_connection.client = AsyncIOMotorClient(settings.MONGO_URL)
        db_connection.db = db_connection.client[settings.DATABASE_NAME]
        # Send a ping to confirm a successful connection
        await db_connection.client.admin.command('ping')
        print("Connected successfully to MongoDB Atlas!")
    except Exception as e:
        logging.error(f"Could not connect to MongoDB: {e}")

async def close_mongo_connection():
    if db_connection.client:
        db_connection.client.close()