from fastapi import FastAPI, HTTPException, status, Security, Depends
from fastapi.security import APIKeyHeader
from pydantic import BaseModel, Field
from typing import List, Optional
from transformers import pipeline
import os
import logging
import asyncio

logger = logging.getLogger("uvicorn.error")

app = FastAPI(title="ML Service")

sentiment_pipeline = None
model_version = "unknown"

# Queue for batch processing
batch_queue = asyncio.Queue()

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

def _do_load_model(model_id, kwargs, model_revision):
    global sentiment_pipeline, model_version
    try:
        logger.info(f"Loading model {model_id} (revision: {model_revision})...")
        pipe = pipeline("sentiment-analysis", model=model_id, tokenizer=model_id, **kwargs)
        sentiment_pipeline = pipe
        model_version = f"{model_id}@{model_revision}"
        logger.info("Model loaded successfully.")
    except Exception as e:
        logger.error(f"Failed to load model: {e}")

async def batch_processor():
    """Background task to pull from queue, batch texts, and run inference."""
    logger.info("Batch processor started.")
    while True:
        try:
            items = []
            item = await batch_queue.get()
            items.append(item)
            
            # Wait up to 50ms to accumulate more items for the batch
            try:
                # Accumulate up to 32 requests in a batch (or whatever fits)
                while len(items) < 32:
                    item = await asyncio.wait_for(batch_queue.get(), timeout=0.05)
                    items.append(item)
            except asyncio.TimeoutError:
                pass
                
            # Flatten texts from all requests
            flat_texts = []
            lengths = []
            for item in items:
                flat_texts.extend(item["texts"])
                lengths.append(len(item["texts"]))
                
            try:
                if flat_texts:
                    # Run CPU-bound inference in threadpool
                    predictions = await asyncio.to_thread(sentiment_pipeline, flat_texts)
                else:
                    predictions = []
            except Exception as e:
                logger.error(f"Inference error in batch processor: {e}")
                predictions = [{"error": str(e)}] * len(flat_texts)
                
            # Distribute predictions back to futures
            idx = 0
            for item, length in zip(items, lengths):
                batch_preds = predictions[idx:idx+length]
                idx += length
                
                if not item["future"].done():
                    if batch_preds and isinstance(batch_preds[0], dict) and "error" in batch_preds[0]:
                        item["future"].set_exception(Exception(batch_preds[0]["error"]))
                    else:
                        item["future"].set_result(batch_preds)
                        
            # Mark tasks as done
            for _ in items:
                batch_queue.task_done()
                
        except Exception as e:
            logger.error(f"Unexpected error in batch processor: {e}")
            await asyncio.sleep(1)

@app.on_event("startup")
async def load_model():
    model_id = os.getenv("MODEL_ID")
    model_revision = os.getenv("MODEL_REVISION", "main")
    model_subfolder = os.getenv("MODEL_SUBFOLDER")
    hf_token = os.getenv("HF_TOKEN")
    
    if not model_id:
        logger.warning("MODEL_ID environment variable not set. ML Service will not be able to process requests.")
        return
        
    kwargs = {}
    if model_revision:
        kwargs["revision"] = model_revision
    if model_subfolder:
        kwargs["model_kwargs"] = {"subfolder": model_subfolder}
        kwargs["tokenizer_kwargs"] = {"subfolder": model_subfolder}
    if hf_token:
        kwargs["token"] = hf_token
        
    # Load model in a background thread to allow FastAPI to start serving health checks immediately
    asyncio.create_task(asyncio.to_thread(_do_load_model, model_id, kwargs, model_revision))
    
    # Start the batch processor
    asyncio.create_task(batch_processor())

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
async def analyze_sentiment(request: TextRequest):
    if not sentiment_pipeline:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Model not loaded")
        
    if not request.texts:
        return AnalysisResponse(results=[], overall_sentiment="Neutral")
        
    # Filter empty texts
    texts = [t for t in request.texts if t.strip()]
    if not texts:
        return AnalysisResponse(results=[], overall_sentiment="Neutral")
        
    loop = asyncio.get_running_loop()
    future = loop.create_future()
    
    # Queue the request for batch processing
    await batch_queue.put({
        "texts": texts,
        "future": future
    })
    
    # Wait for the batch processor to complete this request
    try:
        predictions = await future
    except Exception as e:
        logger.error(f"Inference error propagated to request: {e}")
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
