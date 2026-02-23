FROM python:3.11-slim

WORKDIR /app

# Install dependencies first (Docker layer caching — reinstall only if requirements change)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download the embedding model at BUILD time
# This means container startup is instant — model is baked into the image
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Copy all source files
COPY models.py .
COPY llm_agent.py .
COPY api_client.py .
COPY orchestrator.py .
COPY semantic_search.py .
COPY main.py .
COPY .env .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]