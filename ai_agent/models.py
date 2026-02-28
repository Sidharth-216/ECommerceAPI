"""
models.py
Pydantic request/response models for the AI Shopping Agent.
"""

from typing import List, Optional, Any
from pydantic import BaseModel, field_validator


# ─────────────────────────────────────────────────────────────
# Search Models
# ─────────────────────────────────────────────────────────────

class SearchRequest(BaseModel):
    query: str
    top_k: int = 5


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

    # Pydantic v2 validator — coerces any incoming price/rating to float
    # This catches Decimal128 objects if they somehow slip through
    @field_validator("price", "rating", mode="before")
    @classmethod
    def coerce_to_float(cls, v):
        if v is None:
            return 0.0
        if isinstance(v, (int, float)):
            return float(v)
        # bson.Decimal128
        type_name = type(v).__name__
        if type_name == "Decimal128":
            try:
                return float(v.to_decimal())
            except Exception:
                return float(str(v))
        # dict: { "$numberDecimal": "39999" }
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


# ─────────────────────────────────────────────────────────────
# Chat Models
# ─────────────────────────────────────────────────────────────

class Message(BaseModel):
    role:    str   # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message:  str
    userId:   Optional[str] = None
    history:  List[Message] = []


class ChatResponse(BaseModel):
    response:   str
    action:     Optional[str]            = None
    data:       Optional[Any]            = None
    products:   Optional[List[Any]]      = None
    confidence: Optional[float]          = None