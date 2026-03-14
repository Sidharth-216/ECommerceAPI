"""
models.py  (v3)
Pydantic request/response models for the AI Shopping Agent.
ChatRequest now carries jwt_token so the orchestrator can forward it to .NET.
"""

from typing import List, Optional, Any
from pydantic import BaseModel, field_validator


# ─────────────────────────────────────────────────────────────────
# Search Models
# ─────────────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query:     str
    top_k:     int             = 5
    min_price: Optional[float] = None  # only show products >= this price
    max_price: Optional[float] = None  # only show products <= this price


class ProductResult(BaseModel):
    id:            str
    name:          str
    description:   str   = ""
    category:      str   = ""
    price:         float = 0.0
    brand:         str   = ""
    rating:        float = 0.0
    reviewCount:   int   = 0
    imageUrl:      str   = ""
    stockQuantity: int   = 0
    score:         float = 0.0

    @field_validator("price", "rating", mode="before")
    @classmethod
    def coerce_to_float(cls, v):
        if v is None:
            return 0.0
        if isinstance(v, (int, float)):
            return float(v)
        type_name = type(v).__name__
        if type_name == "Decimal128":
            try:
                return float(v.to_decimal())
            except Exception:
                return float(str(v))
        if isinstance(v, dict):
            nd = v.get("$numberDecimal")
            if nd is not None:
                return float(nd)
        try:
            return float(str(v))
        except Exception:
            return 0.0


class SearchResponse(BaseModel):
    results: List[ProductResult]
    query:   str
    total:   int


# ─────────────────────────────────────────────────────────────────
# Chat Models
# ─────────────────────────────────────────────────────────────────

class Message(BaseModel):
    role:    str    # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message:   str
    userId:    Optional[str] = None
    history:   List[Message] = []

    # JWT token forwarded from the React frontend.
    # The orchestrator passes this to APIClient which sends it as
    # Authorization: Bearer <token> to all /api/ai/* .NET endpoints.
    jwt_token: Optional[str] = None


class ChatResponse(BaseModel):
    response:   str
    action:     Optional[str]       = None
    data:       Optional[Any]       = None
    products:   Optional[List[Any]] = None
    confidence: Optional[float]     = None