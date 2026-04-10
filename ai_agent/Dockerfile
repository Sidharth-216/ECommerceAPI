FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (Docker layer caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the embedding model at BUILD time
# Container startup is instant — model is baked into the image
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Copy all source files
COPY models.py .
COPY llm_agent.py .
COPY api_client.py .
COPY orchestrator.py .
COPY semantic_search.py .
COPY main.py .

# ❌ REMOVED: COPY .env .
# Secrets are injected automatically from HF Space Settings → Repository Secrets
# They arrive as environment variables at runtime — no .env file needed

# HF Spaces REQUIRES port 7860 — port 8000 will NOT work
EXPOSE 7860

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]