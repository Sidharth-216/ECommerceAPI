"""
main.py  (v2)
FastAPI entry point for the ShopAI agent.
Thin by design — only wires up services and routes.
Run locally:
    uvicorn main:app --reload --port 7860
On HF Spaces: started automatically via Dockerfile CMD.
"""

import os
import logging
import base64
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel

load_dotenv()

from models       import ChatRequest, ChatResponse, SearchRequest, SearchResponse
from orchestrator import ShoppingAgentOrchestrator
from semantic_search import SemanticSearchService


class SpeechTranscribeRequest(BaseModel):
    audio_base64: str
    mime_type: str = "audio/webm"
    language: str = "en"


class SpeechTranscribeResponse(BaseModel):
    text: str

# ─────────────────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="ShopAI Agent",
    version="2.0.0",
    description="Conversational shopping assistant + semantic vector search"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# Startup — load heavy resources ONCE
# ─────────────────────────────────────────────────────────────────────────────
orchestrator:   ShoppingAgentOrchestrator = None
search_service: SemanticSearchService     = None

@app.on_event("startup")
async def startup():
    global orchestrator, search_service

    logger.info("Starting ShopAI...")
    logger.info(f"API_BASE_URL = {os.getenv('API_BASE_URL', 'NOT SET')}")
    logger.info(f"MONGO_URI = {'SET' if os.getenv('MONGO_URI') else 'NOT SET'}")
    logger.info(f"DB_NAME = {os.getenv('DB_NAME', 'NOT SET')}")

    logger.info("Initialising semantic search service...")
    search_service = SemanticSearchService()

    logger.info("Initialising orchestrator...")
    try:
        orchestrator = ShoppingAgentOrchestrator()
        # Wire in the already-loaded search service so the orchestrator
        # can do instant local semantic search (no Render round-trip needed)
        if search_service:
            orchestrator.set_search_service(search_service)
        logger.info("✅ Orchestrator ready")
    except Exception as e:
        logger.error(f"❌ Orchestrator failed: {e}")

    logger.info(f"✅ Service ready on port {os.getenv('PORT', '7860')}")

    # Warm up Render.com free tier in the background so the first user request is fast.
    # We use a dummy JWT — the warmup just needs Render to boot, not authenticate.
    import asyncio
    async def _warmup():
        import time
        await asyncio.sleep(3)   # let HF Spaces finish startup first
        try:
            from api_client import APIClient
            dummy = APIClient(os.getenv("API_BASE_URL", ""), "warmup")
            logger.info("🔥 Sending warmup ping to Render.com...")
            dummy.warmup()
        except Exception as e:
            logger.warning(f"🔥 Warmup error: {e}")
    asyncio.create_task(_warmup())


# ─────────────────────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "service": "ShopAI Agent",
        "version": "2.0.0",
        "status":  "running",
        "endpoints": {
            "chat":   "POST /chat",
            "search": "POST /search",
            "speech": "POST /speech/transcribe",
            "health": "GET  /health",
            "docs":   "GET  /docs",
        }
    }


@app.get("/health")
async def health():
    return {
        "status":    "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "orchestrator":    orchestrator    is not None,
            "semantic_search": search_service  is not None,
        }
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chat endpoint. Accepts user message + history, returns AI response.
    jwt_token in the body is forwarded to .NET for authenticated API calls.
    """
    if orchestrator is None:
        raise HTTPException(status_code=503, detail="Orchestrator not ready")
    try:
        return await orchestrator.process_message(request)
    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/search", response_model=SearchResponse)
async def semantic_search(request: SearchRequest):
    """
    Semantic vector search via MongoDB Atlas.
    Called by the .NET SearchController as well as the chat agent internally.
    """
    if search_service is None:
        raise HTTPException(status_code=503, detail="Search service not ready")
    if not request.query or not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    try:
        return search_service.search(request)
    except Exception as e:
        logger.error(f"Search error for query='{request.query}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/speech/transcribe", response_model=SpeechTranscribeResponse)
async def speech_transcribe(request: SpeechTranscribeRequest):
    """
    Voice fallback endpoint used by the frontend when browser speech recognition
    is unavailable. Accepts base64-encoded audio and returns transcript text.
    """
    if not request.audio_base64 or not request.audio_base64.strip():
        raise HTTPException(status_code=400, detail="audio_base64 is required")

    groq_key = os.getenv("GROQ_API_KEY", "")
    if not groq_key:
        raise HTTPException(status_code=503, detail="Speech transcription is not configured")

    b64_payload = request.audio_base64.strip()
    if "," in b64_payload:
        b64_payload = b64_payload.split(",", 1)[1]

    try:
        audio_bytes = base64.b64decode(b64_payload, validate=True)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid base64 audio payload")

    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Audio payload is empty")

    max_bytes = 10 * 1024 * 1024
    if len(audio_bytes) > max_bytes:
        raise HTTPException(status_code=413, detail="Audio payload too large")

    extension = "webm"
    mime = (request.mime_type or "").lower()
    if "wav" in mime:
        extension = "wav"
    elif "mp4" in mime or "m4a" in mime:
        extension = "m4a"
    elif "ogg" in mime:
        extension = "ogg"

    model = os.getenv("STT_MODEL", "whisper-large-v3")

    try:
        from groq import Groq

        client = Groq(api_key=groq_key)
        transcription = client.audio.transcriptions.create(
            file=(f"voice.{extension}", audio_bytes),
            model=model,
            language=(request.language or "en")[:8],
            response_format="json",
            temperature=0,
        )

        text = getattr(transcription, "text", None)
        if text is None and isinstance(transcription, dict):
            text = transcription.get("text")

        text = (text or "").strip()
        if not text:
            raise HTTPException(status_code=422, detail="Could not transcribe audio")

        return SpeechTranscribeResponse(text=text)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Speech transcription error: {e}", exc_info=True)
        raise HTTPException(status_code=502, detail="Speech transcription failed")