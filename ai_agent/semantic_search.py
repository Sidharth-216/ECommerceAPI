"""
semantic_search.py
Semantic vector search powered by MongoDB Atlas $vectorSearch.

Production-safe version:
1) Use $vectorSearch to rank and return only _id + score
2) Fetch full product document separately
3) Properly handle Decimal128 fields
"""

import os
import logging
from typing import List
from pymongo import MongoClient
from sentence_transformers import SentenceTransformer
from bson.decimal128 import Decimal128
from models import ProductResult, SearchRequest, SearchResponse

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────
MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = os.getenv("DB_NAME", "ecommerce")
COLLECTION_NAME = "products"
MODEL_NAME = "all-MiniLM-L6-v2"
VECTOR_INDEX_NAME = "vector_index"
NUM_CANDIDATES_MULTIPLIER = 10


# ─────────────────────────────────────────────────────────────
# Semantic Search Service
# ─────────────────────────────────────────────────────────────
class SemanticSearchService:

    def __init__(self):
        logger.info(f"Loading embedding model: {MODEL_NAME}")
        self.model = SentenceTransformer(MODEL_NAME)
        logger.info("Embedding model loaded")

        logger.info("Connecting to MongoDB Atlas...")
        client = MongoClient(MONGO_URI)
        self.collection = client[DB_NAME][COLLECTION_NAME]
        logger.info(f"Connected → {DB_NAME}.{COLLECTION_NAME}")

    # ─────────────────────────────────────────────────────────
    # Main Search Method
    # ─────────────────────────────────────────────────────────
    def search(self, request: SearchRequest) -> SearchResponse:

        query = request.query.strip()
        top_k = request.top_k

        # 1️⃣ Embed user query
        query_vector = self.model.encode(query).tolist()

        # 2️⃣ Vector search → return only _id + score
        pipeline = [
            {
                "$vectorSearch": {
                    "index": VECTOR_INDEX_NAME,
                    "path": "embedding",
                    "queryVector": query_vector,
                    "numCandidates": top_k * NUM_CANDIDATES_MULTIPLIER,
                    "limit": top_k
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "score": {"$meta": "vectorSearchScore"}
                }
            }
        ]

        ranked_docs = list(self.collection.aggregate(pipeline))

        results: List[ProductResult] = []

        # 3️⃣ Fetch full documents using _id
        for ranked in ranked_docs:
            full_doc = self.collection.find_one({"_id": ranked["_id"]})

            if not full_doc:
                continue

            results.append(ProductResult(
                id=str(full_doc.get("_id", "")),
                name=full_doc.get("name", ""),
                description=full_doc.get("description", ""),
                category=self._extract_category(full_doc.get("category")),
                price=self._extract_decimal(full_doc.get("price")),
                brand=full_doc.get("brand", ""),
                rating=self._extract_decimal(full_doc.get("rating")),
                reviewCount=full_doc.get("reviewCount", 0),
                imageUrl=full_doc.get("imageUrl", ""),
                stockQuantity=full_doc.get("stockQuantity", 0),
                score=round(float(ranked.get("score", 0.0)), 4)
            ))

        logger.info(f"Query: '{query}' → {len(results)} results (top_k={top_k})")

        return SearchResponse(
            results=results,
            query=query,
            total=len(results)
        )

    # ─────────────────────────────────────────────────────────
    # Helpers
    # ─────────────────────────────────────────────────────────

    def _extract_category(self, category) -> str:
        if not category:
            return "Uncategorized"
        if isinstance(category, str):
            return category
        if isinstance(category, dict):
            return category.get("name", "Uncategorized")
        return str(category)

    def _extract_decimal(self, value) -> float:
        """
        Handles:
        - int
        - float
        - bson.decimal128.Decimal128
        """

        if value is None:
            return 0.0

        # Native numeric
        if isinstance(value, (int, float)):
            return float(value)

        # Proper Decimal128 handling
        if isinstance(value, Decimal128):
            return float(value.to_decimal())

        try:
            return float(value)
        except (TypeError, ValueError):
            return 0.0