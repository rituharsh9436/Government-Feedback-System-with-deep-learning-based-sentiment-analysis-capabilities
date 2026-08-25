import pymongo
from database import db_connection
from services.logger_service import app_logger

async def setup_indexes():
    app_logger.info("Ensuring database indexes...")
    try:
        # Unique index on user email
        await db_connection.db["users"].create_index(
            [("email", pymongo.ASCENDING)],
            unique=True,
            background=True,
            name="users_email_unique"
        )
        
        # TTL index on token_blocklist (7 days)
        await db_connection.db["token_blocklist"].create_index(
            [("revoked_at", pymongo.ASCENDING)],
            expireAfterSeconds=86400 * 7,
            background=True,
            name="token_blocklist_ttl"
        )

        # Index for comments (by post, sorted by date)
        await db_connection.db["comments"].create_index(
            [("post_id", pymongo.ASCENDING), ("created_at", pymongo.DESCENDING)],
            background=True,
            name="comments_post_id_created_at"
        )
        
        # Text indexes on posts
        await db_connection.db["posts"].create_index(
            [("title", pymongo.TEXT), ("description", pymongo.TEXT), ("category", pymongo.TEXT), ("location", pymongo.TEXT)],
            background=True,
            name="posts_text_search"
        )
        
        app_logger.info("Database indexes successfully ensured.")
    except Exception as e:
        app_logger.error(f"Error ensuring indexes: {e}")
