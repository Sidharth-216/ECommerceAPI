"""
semantic_search.py (v2 - Optimized)
Semantic vector search powered by MongoDB Atlas $vectorSearch.

Key optimizations:
  - Embedding model loaded once at init (singleton pattern)
  - $toDouble in $project converts Decimal128 to float inside MongoDB
  - Price filters applied at DB level for faster results
  - Minimal logging to reduce latency
  - Connection pooling via MongoClient
"""

import os
import logging
from typing import List
from pymongo import MongoClient
from sentence_transformers import SentenceTransformer
from models import ProductResult, SearchRequest, SearchResponse

logger = logging.getLogger(__name__)

# Configuration
MONGO_URI                 = os.getenv("MONGO_URI")
DB_NAME                   = os.getenv("DB_NAME", "ECommerceDB")
COLLECTION_NAME           = "products"
MODEL_NAME                = "all-MiniLM-L6-v2"
VECTOR_INDEX_NAME         = "vector_index"
NUM_CANDIDATES_MULTIPLIER = 10


class SemanticSearchService:
    """
    Semantic search with MongoDB Atlas vector search.
    Models and connections are cached at class level for speed.
    """

    _model_cache = None
    _model_lock = __import__('threading').Lock()

    def __init__(self):
        logger.info(f"SemanticSearchService init: Loading embedding model '{MODEL_NAME}'")
        
        # Load model once, cache it (thread-safe)
        with SemanticSearchService._model_lock:
            if SemanticSearchService._model_cache is None:
                SemanticSearchService._model_cache = SentenceTransformer(MODEL_NAME)
                logger.info(f"✓ Embedding model loaded and cached")
            self.model = SemanticSearchService._model_cache

        logger.info(f"Connecting to MongoDB: {MONGO_URI[:30]}...")
        self.client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        self.db = self.client[DB_NAME]
        self.collection = self.db[COLLECTION_NAME]
        
        # Test connection
        try:
            self.client.admin.command('ping')
            logger.info(f"✓ Connected to {DB_NAME}.{COLLECTION_NAME}")
        except Exception as e:
            logger.error(f"MongoDB connection failed: {e}")
            raise

    def search(self, request: SearchRequest) -> SearchResponse:
        """
        Perform semantic vector search with optional price filtering.
        Returns top_k results from MongoDB vector index.
        """
        query = request.query.strip()
        top_k = int(request.top_k or 5)
        min_price = request.min_price
        max_price = request.max_price

        # Encode query to vector
        query_vector = self.model.encode(query).tolist()

        # Build MongoDB aggregation pipeline
        num_candidates = top_k * NUM_CANDIDATES_MULTIPLIER
        pipeline = [
            {
                "$vectorSearch": {
                    "index": VECTOR_INDEX_NAME,
                    "path": "embedding",
                    "queryVector": query_vector,
                    "numCandidates": num_candidates,
                    "limit": num_candidates
                }
            },
            {
                "$project": {
                    "_id": 1,
                    "name": 1,
                    "description": 1,
                    "category": 1,
                    "brand": 1,
                    "reviewCount": 1,
                    "imageUrl": 1,
                    "stockQuantity": 1,
                    "price": {"$toDouble": "$price"},  # Convert Decimal128 → double
                    "rating": {"$toDouble": "$rating"},
                    "score": {"$meta": "vectorSearchScore"}
                }
            }
        ]

        # Add price filter if specified
        if min_price is not None or max_price is not None:
            price_match = {}
            if min_price is not None:
                price_match["$gte"] = float(min_price)
            if max_price is not None:
                price_match["$lte"] = float(max_price)
            pipeline.append({"$match": {"price": price_match}})

        # Limit results
        pipeline.append({"$limit": top_k})

        # Execute pipeline
        try:
            raw_docs = list(self.collection.aggregate(pipeline))
        except Exception as e:
            logger.error(f"MongoDB aggregation error: {e}")
            return SearchResponse(results=[], query=query, total=0)

        # Map to ProductResult objects
        results = []
        for doc in raw_docs:
            try:
                results.append(ProductResult(
                    id=str(doc.get("_id", "")),
                    name=doc.get("name", ""),
                    description=doc.get("description", ""),
                    category=self._extract_category(doc.get("category")),
                    price=float(doc.get("price", 0.0) or 0.0),
                    brand=doc.get("brand", ""),
                    rating=float(doc.get("rating", 0.0) or 0.0),
                    reviewCount=int(doc.get("reviewCount", 0) or 0),
                    imageUrl=doc.get("imageUrl", ""),
                    stockQuantity=int(doc.get("stockQuantity", 0) or 0),
                    score=round(float(doc.get("score", 0.0) or 0.0), 4)
                ))
            except Exception as e:
                logger.warning(f"Failed to map product doc: {e}")
                continue

        logger.info(f"Search '{query}' → {len(results)} results")
        return SearchResponse(results=results, query=query, total=len(results))

    def _extract_category(self, category) -> str:
        """Extract category name from various formats."""
        if not category:
            return "Uncategorized"
        if isinstance(category, str):
            return category
        if isinstance(category, dict):
            return category.get("name") or category.get("_id") or "Uncategorized"
        return "Uncategorized"