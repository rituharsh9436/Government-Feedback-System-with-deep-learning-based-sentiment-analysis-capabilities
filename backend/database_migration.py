import asyncio
import sys
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR))
load_dotenv(BASE_DIR / ".env")

from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

async def migrate_database() -> None:
    client = AsyncIOMotorClient(settings.MONGO_URL)
    db = client[settings.DATABASE_NAME]

    print("Starting database migration...")

    # 1. Drop valid_aadhaar_numbers collection
    collection_name = "valid_aadhaar_numbers"
    if collection_name in await db.list_collection_names():
        await db.drop_collection(collection_name)
        print(f"Dropped collection '{collection_name}'")
    else:
        print(f"Collection '{collection_name}' does not exist, skipping drop.")

    # 2. Remove aadhaar_number and contact_number from all users
    result = await db["users"].update_many(
        {},
        {"$unset": {"aadhaar_number": "", "contact_number": ""}}
    )
    print(f"Updated {result.modified_count} users out of {result.matched_count} users to remove aadhaar_number and contact_number.")

    print("Database migration completed.")
    client.close()

if __name__ == "__main__":
    asyncio.run(migrate_database())
