from datetime import datetime, timedelta
from typing import Optional
from database import db_connection
from fastapi import HTTPException
from services.logger_service import app_logger
import math

def build_date_match(date_from: Optional[datetime], date_to: Optional[datetime], date_field: str = "created_at") -> dict:
    match = {}
    if date_from or date_to:
        match[date_field] = {}
        if date_from:
            match[date_field]["$gte"] = date_from
        if date_to:
            match[date_field]["$lte"] = date_to
    return match

async def _get_base_pipeline(department: Optional[str], date_from: Optional[datetime], date_to: Optional[datetime], include_post_details: bool = False):
    pipeline = []
    
    # Optional date filter on comments first to reduce pipeline size early if possible
    date_match = build_date_match(date_from, date_to)
    if date_match:
        pipeline.append({"$match": date_match})

    # Lookup posts to filter by department or get post details
    pipeline.append({
        "$lookup": {
            "from": "posts",
            "localField": "post_id",
            "foreignField": "_id",
            "as": "post_info"
        }
    })
    
    pipeline.append({"$unwind": "$post_info"})
    
    if department and department.lower() != "central":
        departments = [d.strip() for d in department.split(",") if d.strip()]
        if departments:
            pipeline.append({"$match": {"post_info.category": {"$in": departments}}})
            
    return pipeline

async def get_overview(department: Optional[str] = None, date_from: Optional[datetime] = None, date_to: Optional[datetime] = None):
    try:
        pipeline = await _get_base_pipeline(department, date_from, date_to)
        
        # Faceted query to get everything in one pass
        pipeline.append({
            "$facet": {
                "total_comments": [{"$count": "count"}],
                "sentiment_counts": [
                    {"$match": {"sentiment": {"$in": ["POSITIVE", "NEGATIVE", "NEUTRAL"]}}},
                    {"$group": {"_id": "$sentiment", "count": {"$sum": 1}}}
                ],
                "avg_confidence": [
                    {"$match": {"sentiment_score": {"$exists": True, "$type": "number"}}},
                    {"$group": {"_id": None, "avg_score": {"$avg": "$sentiment_score"}}}
                ],
                "policies": [
                    {"$group": {"_id": "$post_id"}}
                ]
            }
        })

        cursor = db_connection.db["comments"].aggregate(pipeline)
        result_list = await cursor.to_list(length=1)
        
        if not result_list:
            return _empty_overview()
            
        result = result_list[0]
        
        total_feedback = result["total_comments"][0]["count"] if result["total_comments"] else 0
        total_policies = len(result["policies"])
        avg_confidence = result["avg_confidence"][0]["avg_score"] if result["avg_confidence"] else 0
        
        sentiments = {item["_id"]: item["count"] for item in result["sentiment_counts"]}
        pos = sentiments.get("POSITIVE", 0)
        neg = sentiments.get("NEGATIVE", 0)
        neu = sentiments.get("NEUTRAL", 0)
        
        total_valid = pos + neg + neu
        
        pos_pct = round((pos / total_valid * 100), 1) if total_valid > 0 else 0
        neg_pct = round((neg / total_valid * 100), 1) if total_valid > 0 else 0
        neu_pct = round(100.0 - pos_pct - neg_pct, 1) if total_valid > 0 else 0

        return {
            "total_feedback": total_feedback,
            "total_policies": total_policies,
            "average_confidence": round(avg_confidence, 2) if avg_confidence else 0,
            "sentiment": {
                "positive": pos,
                "negative": neg,
                "neutral": neu,
                "positive_percentage": pos_pct,
                "negative_percentage": neg_pct,
                "neutral_percentage": neu_pct
            }
        }

    except Exception as e:
        app_logger.error(f"Error getting admin overview: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

def _empty_overview():
    return {
        "total_feedback": 0,
        "total_policies": 0,
        "average_confidence": 0,
        "sentiment": {
            "positive": 0, "negative": 0, "neutral": 0,
            "positive_percentage": 0, "negative_percentage": 0, "neutral_percentage": 0
        }
    }


async def get_trends(department: Optional[str] = None, date_from: Optional[datetime] = None, date_to: Optional[datetime] = None):
    try:
        pipeline = await _get_base_pipeline(department, date_from, date_to)
        
        # Group by YYYY-MM-DD
        pipeline.extend([
            {"$match": {"sentiment": {"$in": ["POSITIVE", "NEGATIVE", "NEUTRAL"]}}},
            {
                "$group": {
                    "_id": {
                        "date": {"$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"}},
                        "sentiment": "$sentiment"
                    },
                    "count": {"$sum": 1}
                }
            },
            {
                "$group": {
                    "_id": "$_id.date",
                    "sentiments": {
                        "$push": {
                            "k": "$_id.sentiment",
                            "v": "$count"
                        }
                    }
                }
            },
            {"$sort": {"_id": 1}}
        ])

        cursor = db_connection.db["comments"].aggregate(pipeline)
        results = await cursor.to_list(length=None)
        
        trends = []
        for r in results:
            s_dict = {item["k"]: item["v"] for item in r["sentiments"]}
            trends.append({
                "date": r["_id"],
                "positive": s_dict.get("POSITIVE", 0),
                "negative": s_dict.get("NEGATIVE", 0),
                "neutral": s_dict.get("NEUTRAL", 0)
            })
            
        return trends

    except Exception as e:
        app_logger.error(f"Error getting admin trends: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

async def get_policies(department: Optional[str] = None, date_from: Optional[datetime] = None, date_to: Optional[datetime] = None):
    try:
        pipeline = await _get_base_pipeline(department, date_from, date_to)
        
        pipeline.extend([
            {
                "$group": {
                    "_id": "$post_id",
                    "title": {"$first": "$post_info.title"},
                    "category": {"$first": "$post_info.category"},
                    "total_comments": {"$sum": 1},
                    "avg_confidence": {"$avg": {"$cond": [{"$eq": [{"$type": "$sentiment_score"}, "number"]}, "$sentiment_score", None]}},
                    "positive": {"$sum": {"$cond": [{"$eq": ["$sentiment", "POSITIVE"]}, 1, 0]}},
                    "negative": {"$sum": {"$cond": [{"$eq": ["$sentiment", "NEGATIVE"]}, 1, 0]}},
                    "neutral": {"$sum": {"$cond": [{"$eq": ["$sentiment", "NEUTRAL"]}, 1, 0]}}
                }
            },
            {"$sort": {"total_comments": -1}}
        ])

        cursor = db_connection.db["comments"].aggregate(pipeline)
        results = await cursor.to_list(length=None)
        
        policies = []
        for r in results:
            total = r["positive"] + r["negative"] + r["neutral"]
            if total > 0:
                pos_pct = round((r["positive"] / total) * 100, 1)
                neg_pct = round((r["negative"] / total) * 100, 1)
                
                # Simple status indicator
                status = "Mixed"
                if pos_pct > 60:
                    status = "Mostly Positive"
                elif neg_pct > 60:
                    status = "Mostly Negative"
            else:
                pos_pct = 0
                neg_pct = 0
                status = "Unknown"
                
            policies.append({
                "id": str(r["_id"]),
                "title": r["title"],
                "category": r["category"],
                "total_feedback": r["total_comments"],
                "positive_percentage": pos_pct,
                "negative_percentage": neg_pct,
                "average_confidence": round(r["avg_confidence"], 2) if r["avg_confidence"] else None,
                "status": status
            })
            
        return policies

    except Exception as e:
        app_logger.error(f"Error getting policy stats: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

async def get_confidence_distribution(department: Optional[str] = None, date_from: Optional[datetime] = None, date_to: Optional[datetime] = None):
    try:
        pipeline = await _get_base_pipeline(department, date_from, date_to)
        
        pipeline.extend([
            {"$match": {"sentiment_score": {"$exists": True, "$type": "number"}}},
            {
                "$group": {
                    "_id": {"$round": ["$sentiment_score", 1]},
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}
        ])

        cursor = db_connection.db["comments"].aggregate(pipeline)
        results = await cursor.to_list(length=None)
        
        distribution = [{"score": r["_id"], "count": r["count"]} for r in results]
        
        return distribution

    except Exception as e:
        app_logger.error(f"Error getting confidence distribution: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
