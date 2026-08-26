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

    # Query for comments that have unanalyzed sentiment
    query = {
        "$or": [
            {"sentiment": {"$exists": False}},
            {"sentiment": {"$in": ["pending", "failed"]}}
        ]
    }
    
    processed_ids = set()
    processed_count = 0
    failed_count = 0
    
    ml_service_url = f"{settings.ML_SERVICE_URL}/analyze"
    api_key = getattr(settings, "ML_SERVICE_API_KEY", None) or ""

    async with httpx.AsyncClient(timeout=60.0) as client:
        while True:
            current_query = dict(query)
            if processed_ids:
                current_query["_id"] = {"$nin": list(processed_ids)}
                
            batch = await db_connection.db["comments"].find(current_query).limit(BATCH_SIZE).to_list(length=BATCH_SIZE)
            
            if not batch:
                break
                
            comments_to_process = []
            for comment in batch:
                processed_ids.add(comment["_id"])
                if not comment.get("content") or not comment.get("content").strip():
                    continue
                comments_to_process.append(comment)
                
            if not comments_to_process:
                continue
                
            texts = [c["content"] for c in comments_to_process]
            logger.info(f"Processing batch of size {len(comments_to_process)}...")
            
            bulk_operations = []
            try:
                response = await client.post(
                    ml_service_url,
                    json={"texts": texts},
                    headers={"X-API-Key": api_key}
                )
                
                if response.status_code == 200:
                    analysis_data = response.json()
                    results = analysis_data.get("results", [])
                    
                    if len(results) != len(comments_to_process):
                        logger.error(f"Mismatch in ML service response: expected {len(comments_to_process)} results, got {len(results)}")
                        failed_count += len(comments_to_process)
                        continue
                        
                    for j, result in enumerate(results):
                        c = comments_to_process[j]
                        update_op = UpdateOne(
                            {"_id": c["_id"]},
                            {
                                "$set": {
                                    "sentiment": result.get("label"),
                                    "sentiment_score": result.get("score"),
                                    "sentiment_model_version": result.get("model_version")
                                }
                            }
                        )
                        bulk_operations.append(update_op)
                        processed_count += 1
                else:
                    logger.error(f"ML service returned status {response.status_code}: {response.text}")
                    failed_count += len(comments_to_process)
            except Exception as e:
                logger.error(f"Error calling ML service for batch: {e}")
                failed_count += len(comments_to_process)

            if bulk_operations:
                try:
                    result = await db_connection.db["comments"].bulk_write(bulk_operations, ordered=False)
                    logger.info(f"Bulk update complete. Modified {result.modified_count} documents.")
                except Exception as e:
                    logger.error(f"Error executing bulk write: {e}")
            
    logger.info(f"Migration finished. Successfully analyzed: {processed_count}, Failed: {failed_count}")
    
    if standalone:
        await close_mongo_connection()

if __name__ == "__main__":
    asyncio.run(analyze_comments())
