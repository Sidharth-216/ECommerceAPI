"""
models.py
All Pydantic request/response models for the AI Shopping Agent.
Kept separate so every module can import without circular dependencies.
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any


# ── Chat Agent Models ──────────────────────────────────────────────────────────

class ChatMessage(BaseModel):
    role: str       # 'user' or 'assistant'
    content: str

class ChatRequest(BaseModel):
    user_id: int
    message: str
    conversation_history: List[ChatMessage] = []
    jwt_token: str

class ChatResponse(BaseModel):
    response: str
    action_taken: Optional[str] = None
    products: Optional[List[Dict[str, Any]]] = None
    requires_confirmation: bool = False


# ── Semantic Search Models ─────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query: str
    top_k: int = 5             # how many results to return

class ProductResult(BaseModel):
    id: str
    name: str
    description: str
    category: str
    price: float
    brand: str = ""
    rating: float = 0.0
    reviewCount: int = 0
    imageUrl: str = ""
    stockQuantity: int = 0
    score: float               # cosine similarity score from Atlas

class SearchResponse(BaseModel):
    results: List[ProductResult]
    query: str
    total: int