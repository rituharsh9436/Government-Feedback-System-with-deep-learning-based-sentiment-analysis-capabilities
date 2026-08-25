import asyncio
import os
import sys
import httpx
from pymongo import UpdateOne
import logging

from database import connect_to_mongo, close_mongo_connection, db_connection
from config import settings

# Configure basic logging for the script
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

BATCH_SIZE = 50

async def analyze_comments(standalone: bool = True):
    logger.info("Starting comment analysis migration...")
    
    if standalone:
        # Initialize DB connection
        await connect_to_mongo()
        if db_connection.db is None:
            logger.error("Failed to connect to the database. Exiting.")
            return

    # Query for posts that have unanalyzed comments
    # A comment is unanalyzed if `sentiment` is missing, 'pending', or 'failed'
    query = {
        "comments": {
            "$elemMatch": {
                "$or": [
                    {"sentiment": {"$exists": False}},
                    {"sentiment": {"$in": ["pending", "failed"]}}
                ]
            }
        }
    }
    
    posts_cursor = db_connection.db["posts"].find(query)
    
    comments_to_process = []
    
    async for post in posts_cursor:
        post_id = post["_id"]
        for comment in post.get("comments", []):
            sentiment = comment.get("sentiment")
            if not sentiment or sentiment in ["pending", "failed"]:
                # If comment text is completely empty, skip it or mark as Neutral
                if not comment.get("content") or not comment.get("content").strip():
                    continue
                    
                comments_to_process.append({
                    "post_id": post_id,
                    "comment_id": comment.get("id"),
                    "author_email": comment.get("author_email"),
                    "content": comment.get("content"),
                    "original_comment": comment
                })
                
    logger.info(f"Found {len(comments_to_process)} comments requiring analysis.")
    
    if not comments_to_process:
        logger.info("No comments to process. Exiting.")
        if standalone:
            await close_mongo_connection()
        return

    ml_service_url = f"{settings.ML_SERVICE_URL}/analyze"
    api_key = getattr(settings, "ML_SERVICE_API_KEY", None) or ""
    
    bulk_operations = []
    processed_count = 0
    failed_count = 0
    
    async with httpx.AsyncClient(timeout=60.0) as client:
        # Process in batches
        for i in range(0, len(comments_to_process), BATCH_SIZE):
            batch = comments_to_process[i:i + BATCH_SIZE]
            texts = [c["content"] for c in batch]
            
            logger.info(f"Processing batch {i // BATCH_SIZE + 1}, size {len(batch)}...")
            
            try:
                response = await client.post(
                    ml_service_url,
                    json={"texts": texts},
                    headers={"X-API-Key": api_key}
                )
                
                if response.status_code == 200:
                    analysis_data = response.json()
                    results = analysis_data.get("results", [])
                    
                    if len(results) != len(batch):
                        logger.error(f"Mismatch in ML service response: expected {len(batch)} results, got {len(results)}")
                        failed_count += len(batch)
                        continue
                        
                    for j, result in enumerate(results):
                        c = batch[j]
                        
                        match_cond = {}
                        if c["comment_id"]:
                            match_cond["id"] = c["comment_id"]
                        else:
                            # Fallback if comment has no ID (should be rare)
                            match_cond["author_email"] = c["author_email"]
                            match_cond["content"] = c["content"]
                            
                        # Prepare update operation
                        update_op = UpdateOne(
                            {
                                "_id": c["post_id"],
                                "comments": {"$elemMatch": match_cond}
                            },
                            {
                                "$set": {
                                    "comments.$.sentiment": result.get("label"),
                                    "comments.$.sentiment_score": result.get("score"),
                                    "comments.$.sentiment_model_version": result.get("model_version")
                                }
                            }
                        )
                        bulk_operations.append(update_op)
                        processed_count += 1
                        
                else:
                    logger.error(f"ML service returned status {response.status_code}: {response.text}")
                    failed_count += len(batch)
            except Exception as e:
                logger.error(f"Error calling ML service for batch: {e}")
                failed_count += len(batch)

    if bulk_operations:
        logger.info(f"Executing {len(bulk_operations)} bulk update operations on database...")
        try:
            result = await db_connection.db["posts"].bulk_write(bulk_operations, ordered=False)
            logger.info(f"Bulk update complete. Modified {result.modified_count} documents.")
        except Exception as e:
            logger.error(f"Error executing bulk write: {e}")
            
    logger.info(f"Migration finished. Successfully analyzed: {processed_count}, Failed: {failed_count}")
    
    if standalone:
        await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(analyze_comments())
