import pymongo
from pymongo.errors import OperationFailure
from database import db_connection
from services.logger_service import app_logger

async def safe_create_index(collection_name: str, keys: list, options: dict):
    """
    Safely creates an index. If an index with the same keys already exists 
    but with a different name or options, it handles it gracefully instead of 
    throwing an IndexOptionsConflict.
    """
    coll = db_connection.db[collection_name]
    
    # Check if this is a text index
    is_text_index = any(k[1] == pymongo.TEXT for k in keys)
    
    try:
        existing = await coll.index_information()
        
        conflict_name = None
        for name, info in existing.items():
            if name == options.get("name"):
                # If name matches exactly, assume it's our index.
                # If options changed (e.g. unique flag), motor will throw OperationFailure below.
                continue
                
            if not is_text_index:
                # For regular indexes, compare keys exactly
                if info.get("key") == keys:
                    conflict_name = name
                    break
            else:
                # For text indexes, compare the weights (text fields)
                if info.get("weights"):
                    if is_text_index:
                        existing_text_fields = set(info["weights"].keys())
                        desired_text_fields = set(k[0] for k in keys if k[1] == pymongo.TEXT)
                        if existing_text_fields == desired_text_fields:
                            conflict_name = name
                            break
                        else:
                            app_logger.warning(
                                f"Text index '{name}' on '{collection_name}' exists with different fields. "
                                f"Dropping it to recreate."
                            )
                            await coll.drop_index(name)
                            # After dropping, it won't conflict. We continue to create it below.
                        
        if conflict_name:
            # We have an existing index with the same keys but a different name.
            # Let's check if critical constraints like 'unique' match.
            existing_unique = existing[conflict_name].get("unique", False)
            desired_unique = options.get("unique", False)
            
            if existing_unique != desired_unique:
                app_logger.warning(
                    f"Index '{conflict_name}' on '{collection_name}' has mismatched 'unique' option "
                    f"(existing: {existing_unique}, desired: {desired_unique}). Dropping and recreating."
                )
                await coll.drop_index(conflict_name)
                # Fall through to create_index below
            else:
                app_logger.info(
                    f"Equivalent index '{conflict_name}' already exists on '{collection_name}' for keys {keys}. "
                    f"Skipping creation of new index '{options.get('name')}'. "
                )
                return
                
        # Attempt creation
        await coll.create_index(keys, **options)
        
    except OperationFailure as e:
        app_logger.error(f"Error ensuring index '{options.get('name')}' on '{collection_name}': {e}")
        # Re-raise so startup fails if an important index fails
        raise

async def setup_indexes():
    app_logger.info("Ensuring database indexes...")
    try:
        indexes_to_create = [
            {
                "collection": "users",
                "keys": [("email", pymongo.ASCENDING)],
                "options": {"unique": True, "background": True, "name": "users_email_unique"}
            },
            {
                "collection": "token_blocklist",
                "keys": [("revoked_at", pymongo.ASCENDING)],
                "options": {"expireAfterSeconds": 86400 * 7, "background": True, "name": "token_blocklist_ttl"}
            },
            {
                "collection": "pending_users",
                "keys": [("expires_at", pymongo.ASCENDING)],
                "options": {"expireAfterSeconds": 0, "background": True, "name": "pending_users_ttl"}
            },
            {
                "collection": "comments",
                "keys": [("post_id", pymongo.ASCENDING), ("created_at", pymongo.DESCENDING)],
                "options": {"background": True, "name": "comments_post_id_created_at"}
            },
            {
                "collection": "comments",
                "keys": [("post_id", pymongo.ASCENDING), ("author_email", pymongo.ASCENDING)],
                "options": {"background": True, "name": "comments_post_id_author_email"}
            },
            {
                "collection": "comments",
                "keys": [("created_at", pymongo.DESCENDING), ("sentiment", pymongo.ASCENDING)],
                "options": {"background": True, "name": "comments_created_at_sentiment"}
            },
            {
                "collection": "comments",
                "keys": [("sentiment_score", pymongo.DESCENDING)],
                "options": {"background": True, "name": "comments_sentiment_score"}
            },
            {
                "collection": "posts",
                "keys": [("title", pymongo.TEXT), ("description", pymongo.TEXT), ("category", pymongo.TEXT), ("location", pymongo.TEXT)],
                "options": {"background": True, "name": "posts_text_search"}
            },
            {
                "collection": "posts",
                "keys": [("created_at", pymongo.ASCENDING)],
                "options": {"background": True, "name": "posts_created_at"}
            },
            {
                "collection": "posts",
                "keys": [("category", pymongo.ASCENDING)],
                "options": {"background": True, "name": "posts_category"}
            }
        ]

        for idx in indexes_to_create:
            await safe_create_index(idx["collection"], idx["keys"], idx["options"])
            
        # Clean up obsolete index from token_blocklist if it exists
        try:
            blocklist_indexes = await db_connection.db["token_blocklist"].index_information()
            if "created_at_1" in blocklist_indexes:
                app_logger.info("Dropping obsolete index 'created_at_1' on 'token_blocklist'.")
                await db_connection.db["token_blocklist"].drop_index("created_at_1")
        except Exception as e:
            app_logger.warning(f"Could not check/drop obsolete token_blocklist index: {e}")

        # Clean up obsolete text index from posts if it exists (the one with only title/description)
        try:
            posts_indexes = await db_connection.db["posts"].index_information()
            for name, info in posts_indexes.items():
                if info.get("weights"):
                    existing_fields = set(info["weights"].keys())
                    desired_fields = {"title", "description", "category", "location"}
                    if existing_fields != desired_fields and existing_fields == {"title", "description"}:
                        app_logger.info(f"Dropping obsolete text index '{name}' on 'posts'.")
                        await db_connection.db["posts"].drop_index(name)
        except Exception as e:
            app_logger.warning(f"Could not check/drop obsolete posts index: {e}")
            
        app_logger.info("Database indexes successfully ensured.")
    except Exception as e:
        app_logger.error(f"Failed to ensure all indexes: {e}")
