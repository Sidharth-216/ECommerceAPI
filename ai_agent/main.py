"""
main.py
FastAPI entry point for the AI Shopping Agent.

This file is intentionally thin — it only:
  1. Creates the FastAPI app
  2. Loads shared services at startup (model + DB, once only)
  3. Defines routes and delegates to the right service

Run with:
    uvicorn main:app --reload --port 8000
"""

import os
import logging
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Load .env before importing services (they read env vars at import time)
load_dotenv()

from models import ChatRequest, ChatResponse, SearchRequest, SearchResponse
from orchestrator import ShoppingAgentOrchestrator
from semantic_search import SemanticSearchService

# ─────────────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# App init
# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="AI Shopping Agent",
    version="2.0.0",
    description="Conversational shopping assistant + semantic vector search"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],      # Tighten this in production to your frontend domain
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# Startup — load heavy resources ONCE so every request is instant
# ─────────────────────────────────────────────────────────────────────────────
orchestrator: ShoppingAgentOrchestrator = None
search_service: SemanticSearchService = None

@app.on_event("startup")
async def startup():
    global orchestrator, search_service
    logger.info("Starting AI Shopping Agent...")

    logger.info("Initialising LLM orchestrator...")
    orchestrator = ShoppingAgentOrchestrator()

    logger.info("Initialising semantic search service (loading model + DB)...")
    search_service = SemanticSearchService()

    logger.info("✅ AI Shopping Agent ready")


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "service": "AI Shopping Agent",
        "version": "2.0.0",
        "endpoints": {
            "chat":   "POST /chat   — conversational shopping assistant",
            "search": "POST /search — semantic product search",
            "health": "GET  /health — service health check"
        }
    }


@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "orchestrator":    orchestrator is not None,
            "semantic_search": search_service is not None
        }
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Conversational shopping assistant.
    Accepts a user message + conversation history, returns an AI response.
    The agent can search products, add to cart, place orders, etc.
    """
    if orchestrator is None:
        raise HTTPException(status_code=503, detail="Service not ready yet")
    try:
        return await orchestrator.process_message(request)
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search", response_model=SearchResponse)
async def semantic_search(request: SearchRequest):
    """
    Semantic vector search powered by MongoDB Atlas.

    - Embeds the query using all-MiniLM-L6-v2
    - Runs $vectorSearch aggregation in Atlas
    - Returns top-K products ranked by cosine similarity score

    Called by: .NET backend → SearchController → this endpoint
    Also used by the AI chat agent internally for product search.

    Body:
        { "query": "comfortable running shoes", "top_k": 5 }

    Response:
        { "results": [...], "query": "...", "total": 5 }
    """
    if search_service is None:
        raise HTTPException(status_code=503, detail="Search service not ready yet")
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    try:
        return search_service.search(request)
    except Exception as e:
        logger.error(f"Search error for query='{request.query}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))