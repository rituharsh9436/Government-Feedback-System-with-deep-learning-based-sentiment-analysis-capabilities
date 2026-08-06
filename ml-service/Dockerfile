FROM python:3.10-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
# Install PyTorch (CPU version for smaller image size, GPU version requires NVIDIA drivers on host)
RUN pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the model so it doesn't download on every start
RUN python -c "from transformers import pipeline; pipeline('sentiment-analysis', model='distilbert-base-uncased-finetuned-sst-2-english')"

COPY . .

EXPOSE 8001

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
