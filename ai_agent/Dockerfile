# ─────────────────────────────────────────────────────────────────────────────
# ShopAI Agent — Dockerfile
#
# Works for ALL deployment targets:
#   HF Spaces   → port 7860 (required)
#   EC2 / VPS   → port 7860 (or map with -p hostPort:7860)
#   Local       → docker run --env-file .env -p 7860:7860 shopai-agent
#
# Build:  docker build -t shopai-agent .
# Run:    docker run --env-file .env -p 7860:7860 shopai-agent
# ─────────────────────────────────────────────────────────────────────────────

FROM python:3.11-slim

WORKDIR /app

# System deps (build tools for compiled Python packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential curl \
    && rm -rf /var/lib/apt/lists/*

# Python deps — separate layer for Docker cache efficiency
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-bake the embedding model into the image.
# Container starts instantly — no model download at runtime.
RUN python -c "\
from sentence_transformers import SentenceTransformer; \
SentenceTransformer('all-MiniLM-L6-v2'); \
print('Embedding model ready')"

# Application source
COPY models.py .
COPY llm_agent.py .
COPY api_client.py .
COPY orchestrator.py .
COPY semantic_search.py .
COPY main.py .

# ─── Secrets — NEVER copy .env into the image ────────────────────────────────
# Inject environment variables at runtime via:
#
#   Local Docker:         docker run --env-file .env ...
#   Docker Compose:       env_file: [.env]
#   EC2 / any VPS:        export VAR=value  or use AWS Secrets Manager
#   HF Spaces:            Settings → Repository Secrets (injected automatically)
#   ECS / Fargate:        Task Definition → Environment variables
#   Kubernetes:           Secret → envFrom
# ─────────────────────────────────────────────────────────────────────────────

# 7860 is required by HF Spaces. For other hosts, map any port:
#   docker run -p 8080:7860 shopai-agent
EXPOSE 7860

# Healthcheck — used by Docker, ECS, and load balancers
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:7860/health || exit 1

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]

# docker compose up --build      # build image and start (first time)
# docker compose up              # start without rebuilding
# docker compose up -d           # start in background (detached)
# docker compose logs -f         # watch live logs
# docker compose down            # stop and remove container
# docker compose down --rmi all  # stop + delete image (full reset)