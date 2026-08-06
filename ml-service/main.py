from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
from transformers import pipeline

app = FastAPI(title="ML Service")

# Load a lightweight, pre-trained sentiment analysis model
sentiment_pipeline = pipeline("sentiment-analysis", model="distilbert-base-uncased-finetuned-sst-2-english")

class TextRequest(BaseModel):
    texts: List[str]

class SentimentResult(BaseModel):
    label: str
    score: float

class AnalysisResponse(BaseModel):
    results: List[SentimentResult]
    overall_sentiment: str

@app.post("/analyze", response_model=AnalysisResponse)
async def analyze_sentiment(request: TextRequest):
    if not request.texts:
        return AnalysisResponse(results=[], overall_sentiment="Neutral")
        
    predictions = sentiment_pipeline(request.texts)
    
    results = [SentimentResult(label=p['label'], score=p['score']) for p in predictions]
    
    # Calculate overall sentiment
    positive_count = sum(1 for r in results if r.label == "POSITIVE")
    negative_count = sum(1 for r in results if r.label == "NEGATIVE")
    
    if positive_count > negative_count:
        overall = "Positive"
    elif negative_count > positive_count:
        overall = "Negative"
    else:
        overall = "Mixed"
        
    return AnalysisResponse(results=results, overall_sentiment=overall)

@app.get("/health")
async def health_check():
    return {"status": "ok"}
