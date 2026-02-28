"""
semantic_search.py
Semantic vector search powered by MongoDB Atlas $vectorSearch.
"""

import os
import logging
from typing import List
from pymongo import MongoClient
from sentence_transformers import SentenceTransformer
from models import ProductResult, SearchRequest, SearchResponse

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────
MONGO_URI                 = os.getenv("MONGO_URI")
DB_NAME                   = os.getenv("DB_NAME", "ecommerce")
COLLECTION_NAME           = "products"
MODEL_NAME                = "all-MiniLM-L6-v2"
VECTOR_INDEX_NAME         = "vector_index"
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

        logger.info(f"Searching: '{query}' top_k={top_k}")

        # Step 1: Embed user query
        query_vector = self.model.encode(query).tolist()

        # Step 2: Vector search — project ALL needed fields in one pipeline
        # No second find_one needed — gets everything in one Atlas call
        pipeline = [
            {
                "$vectorSearch": {
                    "index":         VECTOR_INDEX_NAME,
                    "path":          "embedding",
                    "queryVector":   query_vector,
                    "numCandidates": top_k * NUM_CANDIDATES_MULTIPLIER,
                    "limit":         top_k
                }
            },
            {
                "$project": {
                    "_id":           1,
                    "name":          1,
                    "description":   1,
                    "category":      1,
                    "price":         1,
                    "brand":         1,
                    "rating":        1,
                    "reviewCount":   1,
                    "imageUrl":      1,
                    "stockQuantity": 1,
                    "score":         {"$meta": "vectorSearchScore"}
                }
            }
        ]

        raw_docs = list(self.collection.aggregate(pipeline))
        logger.info(f"Atlas returned {len(raw_docs)} documents")

        # Debug log — shows actual Python type of price/rating so we know what to handle
        if raw_docs:
            first = raw_docs[0]
            logger.info(
                f"DEBUG first doc '{first.get('name')}' — "
                f"price type={type(first.get('price')).__name__} val={first.get('price')} | "
                f"rating type={type(first.get('rating')).__name__} val={first.get('rating')}"
            )

        # Step 3: Map to ProductResult
        results: List[ProductResult] = []
        for doc in raw_docs:
            price  = self._extract_decimal(doc.get("price"))
            rating = self._extract_decimal(doc.get("rating"))

            results.append(ProductResult(
                id            = str(doc.get("_id", "")),
                name          = doc.get("name", ""),
                description   = doc.get("description", ""),
                category      = self._extract_category(doc.get("category")),
                price         = price,
                brand         = doc.get("brand", ""),
                rating        = rating,
                reviewCount   = doc.get("reviewCount", 0),
                imageUrl      = doc.get("imageUrl", ""),
                stockQuantity = doc.get("stockQuantity", 0),
                score         = round(float(doc.get("score", 0.0)), 4)
            ))

        logger.info(f"Query: '{query}' → {len(results)} results")
        return SearchResponse(results=results, query=query, total=len(results))

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
        Handles all MongoDB numeric formats:
        - None
        - int / float  (most common)
        - bson.Decimal128  (pymongo native object for NumberDecimal fields)
        - dict {"$numberDecimal": "39999"}  (extended JSON format)
        - anything else → try float(str(value))
        """
        if value is None:
            return 0.0

        # Plain Python number
        if isinstance(value, (int, float)):
            return float(value)

        # Check type name first (avoids import errors if bson not available)
        type_name = type(value).__name__
        if type_name == "Decimal128":
            try:
                return float(value.to_decimal())
            except Exception:
                # Fallback: str(Decimal128("39999")) → "39999"
                try:
                    return float(str(value))
                except Exception:
                    return 0.0

        # Explicit import check (belt and suspenders)
        try:
            from bson.decimal128 import Decimal128 as D128
            if isinstance(value, D128):
                return float(value.to_decimal())
        except ImportError:
            pass

        # Extended JSON dict: { "$numberDecimal": "39999" }
        if isinstance(value, dict):
            nd = value.get("$numberDecimal")
            if nd is not None:
                try:
                    return float(nd)
                except (TypeError, ValueError):
                    return 0.0

        # Last resort
        try:
            return float(str(value))
        except (TypeError, ValueError):
            logger.warning(f"Cannot convert to float: {value!r} type={type_name}")
            return 0.0