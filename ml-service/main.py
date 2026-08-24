from fastapi import FastAPI, HTTPException, status, Security, Depends
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field
from typing import List, Optional
from transformers import pipeline
import os
import logging

logger = logging.getLogger("uvicorn.error")

app = FastAPI(title="ML Service")

sentiment_pipeline = None
model_version = "unknown"

# Security
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

def get_api_key(api_key_header: str = Security(api_key_header)):
    expected_key = os.getenv("ML_SERVICE_API_KEY")
    if not expected_key:
        logger.warning("ML_SERVICE_API_KEY is not configured on the server!")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Server misconfiguration")
    if api_key_header != expected_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API Key")
    return api_key_header

@app.on_event("startup")
async def load_model():
    global sentiment_pipeline, model_version
    model_id = os.getenv("MODEL_ID")
    model_revision = os.getenv("MODEL_REVISION", "main")
    model_subfolder = os.getenv("MODEL_SUBFOLDER")
    hf_token = os.getenv("HF_TOKEN")
    
    if not model_id:
        logger.warning("MODEL_ID environment variable not set. ML Service will not be able to process requests.")
        return
        
    try:
        logger.info(f"Loading model {model_id} (revision: {model_revision}, subfolder: {model_subfolder})...")
        kwargs = {}
        if model_revision:
            kwargs["revision"] = model_revision
        if model_subfolder:
            kwargs["model_kwargs"] = {"subfolder": model_subfolder}
            kwargs["tokenizer_kwargs"] = {"subfolder": model_subfolder}
        if hf_token:
            kwargs["token"] = hf_token
            
        sentiment_pipeline = pipeline("sentiment-analysis", model=model_id, tokenizer=model_id, **kwargs)
        model_version = f"{model_id}@{model_revision}"
        logger.info("Model loaded successfully.")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")

class TextRequest(BaseModel):
    texts: List[str] = Field(..., max_items=100) # batch size validation

class SentimentResult(BaseModel):
    label: str
    score: float
    model_version: Optional[str] = None

class AnalysisResponse(BaseModel):
    results: List[SentimentResult]
    overall_sentiment: str

@app.post("/analyze", response_model=AnalysisResponse, dependencies=[Depends(get_api_key)])
def analyze_sentiment(request: TextRequest):
    # This is a synchronous `def` endpoint, so FastAPI runs it in a threadpool,
    # preventing the CPU-bound inference from blocking the async event loop.
    if not sentiment_pipeline:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Model not loaded")
        
    if not request.texts:
        return AnalysisResponse(results=[], overall_sentiment="Neutral")
        
    # Filter empty texts
    texts = [t for t in request.texts if t.strip()]
    if not texts:
        return AnalysisResponse(results=[], overall_sentiment="Neutral")
        
    try:
        predictions = sentiment_pipeline(texts)
    except Exception as e:
        logger.error(f"Inference error: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Error during inference")
    
    # Map raw labels (LABEL_0, LABEL_1, LABEL_2) to readable strings
    label_mapping = {
        "LABEL_0": "Negative",
        "LABEL_1": "Neutral",
        "LABEL_2": "Positive"
    }
    
    results = []
    for p in predictions:
        raw_label = p['label']
        mapped_label = label_mapping.get(raw_label, raw_label)
        results.append(SentimentResult(label=mapped_label, score=p['score'], model_version=model_version))
    
    # Calculate overall sentiment
    positive_count = sum(1 for r in results if str(r.label).upper() == "POSITIVE")
    negative_count = sum(1 for r in results if str(r.label).upper() == "NEGATIVE")
    
    if positive_count > negative_count:
        overall = "Positive"
    elif negative_count > positive_count:
        overall = "Negative"
    else:
        overall = "Mixed"
        
    return AnalysisResponse(results=results, overall_sentiment=overall)

@app.get("/health")
def health_check():
    return {"status": "ok"}

@app.get("/ready")
def ready_check():
    if sentiment_pipeline:
        return {"status": "ready"}
    raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Model not loaded")

if __name__ == "__main__":
    import uvicorn
    # Hugging Face Spaces (Gradio SDK) routes external traffic to port 7860
    uvicorn.run(app, host="0.0.0.0", port=7860)
