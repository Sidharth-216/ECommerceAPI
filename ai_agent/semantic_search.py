"""
semantic_search.py
Semantic vector search powered by MongoDB Atlas $vectorSearch.

Responsibility: ONLY this file touches the embedding model and MongoDB.
The chat agent never needs to know how search works internally.

Flow:
    User query string
        → embed with all-MiniLM-L6-v2 (384-d vector)
        → $vectorSearch aggregation in MongoDB Atlas
        → top-K results with similarity scores
        → return as ProductResult list
"""

import os
import logging
from typing import List
from pymongo import MongoClient
from sentence_transformers import SentenceTransformer
from models import ProductResult, SearchRequest, SearchResponse

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────
# Configuration (all from .env)
# ─────────────────────────────────────────────────────────────────────────────
MONGO_URI         = os.getenv("MONGO_URI")
DB_NAME           = os.getenv("DB_NAME", "ecommerce")
COLLECTION_NAME   = "products"
MODEL_NAME        = "all-MiniLM-L6-v2"
VECTOR_INDEX_NAME = "vector_index"       # Must match your Atlas index name exactly
NUM_CANDIDATES_MULTIPLIER = 10           # numCandidates = top_k * this value


# ─────────────────────────────────────────────────────────────────────────────
# Singleton loader — model and DB client are loaded ONCE at startup
# ─────────────────────────────────────────────────────────────────────────────
class SemanticSearchService:
    """
    Wraps the embedding model + MongoDB Atlas vector search.
    Instantiated once in main.py and reused for every request.
    """

    def __init__(self):
        logger.info(f"Loading embedding model: {MODEL_NAME}")
        self.model = SentenceTransformer(MODEL_NAME)
        logger.info("Embedding model loaded")

        logger.info("Connecting to MongoDB Atlas...")
        client = MongoClient(MONGO_URI)
        self.collection = client[DB_NAME][COLLECTION_NAME]
        logger.info(f"Connected → {DB_NAME}.{COLLECTION_NAME}")

    def search(self, request: SearchRequest) -> SearchResponse:
        """
        Run semantic search for a user query.

        Steps:
          1. Embed the query string → 384-d float vector
          2. Run $vectorSearch aggregation in Atlas (fast HNSW lookup)
          3. Project only needed fields + similarity score
          4. Map to ProductResult models
        """
        query = request.query.strip()
        top_k = request.top_k

        # Step 1: Embed query
        query_vector = self.model.encode(query).tolist()

        # Step 2: Atlas $vectorSearch
        # numCandidates = top_k * 10 gives Atlas enough candidates to rank well.
        # Increase multiplier if you notice poor result quality.
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
                    # Atlas injects the cosine similarity score here
                    "score": {"$meta": "vectorSearchScore"}
                }
            }
        ]

        raw = list(self.collection.aggregate(pipeline))

        # Step 3: Map to ProductResult — handle MongoDB's $numberDecimal format
        results: List[ProductResult] = []
        for doc in raw:
            results.append(ProductResult(
                id=str(doc.get("_id", "")),
                name=doc.get("name", ""),
                description=doc.get("description", ""),
                category=self._extract_category(doc.get("category")),
                price=self._extract_decimal(doc.get("price", 0)),
                brand=doc.get("brand", ""),
                rating=self._extract_decimal(doc.get("rating", 0)),
                reviewCount=doc.get("reviewCount", 0),
                imageUrl=doc.get("imageUrl", ""),
                stockQuantity=doc.get("stockQuantity", 0),
                score=round(doc.get("score", 0.0), 4)
            ))

        logger.info(f"Query: '{query}' → {len(results)} results (top_k={top_k})")
        return SearchResponse(results=results, query=query, total=len(results))

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _extract_category(self, category) -> str:
        """
        Your MongoDB stores category as { _id: 0, name: "Televisions" }.
        This handles that object format as well as plain strings.
        """
        if not category:
            return "Uncategorized"
        if isinstance(category, str):
            return category
        if isinstance(category, dict):
            return category.get("name", "Uncategorized")
        return str(category)

    def _extract_decimal(self, value) -> float:
        """
        MongoDB Decimal128 serializes as { $numberDecimal: "39999" } in some drivers.
        Handles both raw float/int and the extended JSON format.
        """
        if value is None:
            return 0.0
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, dict) and "$numberDecimal" in value:
            return float(value["$numberDecimal"])
        try:
            return float(value)
        except (TypeError, ValueError):
            return 0.0