"""
orchestrator.py  (v4 -- Agentic Edition)
=========================================
Thin coordinator. All reasoning now lives in ShoppingAgent (llm_agent.py).
This file only:
  1. Builds an authenticated APIClient from the JWT
  2. Calls ShoppingAgent.process()
  3. Wraps the result in ChatResponse
"""

import os
import logging
import json
import base64
import hashlib
from models import ChatRequest, ChatResponse
from llm_agent import ShoppingAgent
from api_client import APIClient

logger     = logging.getLogger(__name__)
API_BASE   = os.getenv("API_BASE_URL", "http://localhost:5033/api")


def _decode_jwt_payload(token: str):
    if not token or token.count(".") < 2:
        return {}
    try:
        payload_b64 = token.split(".")[1]
        payload_b64 += "=" * (-len(payload_b64) % 4)
        payload_raw = base64.urlsafe_b64decode(payload_b64.encode("utf-8"))
        payload = json.loads(payload_raw.decode("utf-8"))
        return payload if isinstance(payload, dict) else {}
    except Exception:
        return {}


def _derive_user_id(request: ChatRequest) -> str:
    explicit = (request.userId or "").strip()
    if explicit:
        return explicit

    payload = _decode_jwt_payload(request.jwt_token or "")
    for key in ("sub", "nameid", "userId", "id"):
        val = payload.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()

    token = request.jwt_token or ""
    if token:
        # Stable per-token fallback to avoid all users sharing one limiter bucket.
        return "jwt_" + hashlib.sha256(token.encode("utf-8")).hexdigest()[:16]

    return "anon"


class ShoppingAgentOrchestrator:

    def __init__(self, search_service=None):
        self.agent          = ShoppingAgent()
        self.search_service = search_service
        if search_service:
            self.agent.set_search_service(search_service)
        logger.info("ShoppingAgentOrchestrator ready (agentic mode)")

    def set_search_service(self, svc):
        self.search_service = svc
        self.agent.set_search_service(svc)
        logger.info("SemanticSearchService wired")

    async def process_message(self, request: ChatRequest) -> ChatResponse:
        token = request.jwt_token or ""
        if not token:
            logger.warning("No JWT token -- all /api/ai/* calls will return 401")

        api_client = APIClient(API_BASE, token)
        user_id    = _derive_user_id(request)

        # Convert Message objects to plain dicts
        history = [{"role": m.role, "content": m.content} for m in request.history]

        # The agent decides everything -- which tools, what order, final reply
        result = self.agent.process(
            user_message = request.message,
            history      = history,
            api_client   = api_client,
            user_id      = user_id,
        )

        logger.info("Agent result: action=%s | response_len=%d",
                    result.get("action"), len(result.get("response", "")))

        return ChatResponse(
            response = result.get("response", ""),
            action   = result.get("action"),
            data     = None,
            products = result.get("products"),
        )