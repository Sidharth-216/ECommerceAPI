"""
semantic_search.py
Semantic vector search powered by MongoDB Atlas $vectorSearch.
Key features:
  - $toDouble in $project converts Decimal128 price/rating to plain doubles
    inside MongoDB so Python always receives plain floats.
  - Optional min_price / max_price filters applied as a $match stage INSIDE
    the pipeline — MongoDB does the filtering, not Python.
  - Fetches (top_k * NUM_CANDIDATES_MULTIPLIER) candidates from the vector
    index then filters + limits, so price-filtered results still fill top_k.
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
        logger.info(f"Connected -> {DB_NAME}.{COLLECTION_NAME}")

    # ─────────────────────────────────────────────────────────
    # Main Search Method
    # ─────────────────────────────────────────────────────────
    def search(self, request: SearchRequest) -> SearchResponse:
        query     = request.query.strip()
        top_k     = request.top_k
        min_price = request.min_price
        max_price = request.max_price

        logger.info(
            f"Searching: '{query}' top_k={top_k} "
            f"min_price={min_price} max_price={max_price}"
        )

        # Step 1: Embed user query
        query_vector = self.model.encode(query).tolist()

        # Step 2: Build pipeline
        # When a price filter is active we fetch more candidates first
        # (numCandidates stays generous) then $match filters them down
        # so we still return up to top_k results after filtering.
        num_candidates = top_k * NUM_CANDIDATES_MULTIPLIER

        pipeline = [
            {
                "$vectorSearch": {
                    "index":         VECTOR_INDEX_NAME,
                    "path":          "embedding",
                    "queryVector":   query_vector,
                    "numCandidates": num_candidates,
                    "limit":         num_candidates   # pull all candidates; $match + $limit below
                }
            },
            {
                # Convert Decimal128 -> double INSIDE MongoDB so Python gets plain floats
                "$project": {
                    "_id":           1,
                    "name":          1,
                    "description":   1,
                    "category":      1,
                    "brand":         1,
                    "reviewCount":   1,
                    "imageUrl":      1,
                    "stockQuantity": 1,
                    "price":  {"$toDouble": "$price"},
                    "rating": {"$toDouble": "$rating"},
                    "score":  {"$meta": "vectorSearchScore"}
                }
            },
        ]

        # Step 3: Price filter stage (only added when needed)
        price_filter = {}
        if min_price is not None:
            price_filter["$gte"] = float(min_price)
        if max_price is not None:
            price_filter["$lte"] = float(max_price)

        if price_filter:
            pipeline.append({"$match": {"price": price_filter}})
            logger.info(f"Price filter applied: {price_filter}")

        # Step 4: Limit to requested top_k after filtering
        pipeline.append({"$limit": top_k})

        raw_docs = list(self.collection.aggregate(pipeline))
        logger.info(f"Atlas returned {len(raw_docs)} documents after filter")

        # Debug — confirm price/rating are plain floats
        if raw_docs:
            first = raw_docs[0]
            logger.info(
                f"DEBUG '{first.get('name')}' — "
                f"price={first.get('price')} (type={type(first.get('price')).__name__}) | "
                f"rating={first.get('rating')} (type={type(first.get('rating')).__name__})"
            )

        # Step 5: Map to ProductResult
        results: List[ProductResult] = []
        for doc in raw_docs:
            results.append(ProductResult(
                id            = str(doc.get("_id", "")),
                name          = doc.get("name", ""),
                description   = doc.get("description", ""),
                category      = self._extract_category(doc.get("category")),
                price         = float(doc.get("price") or 0.0),
                brand         = doc.get("brand", ""),
                rating        = float(doc.get("rating") or 0.0),
                reviewCount   = doc.get("reviewCount", 0),
                imageUrl      = doc.get("imageUrl", ""),
                stockQuantity = doc.get("stockQuantity", 0),
                score         = round(float(doc.get("score", 0.0)), 4)
            ))

        logger.info(f"Query: '{query}' -> {len(results)} results")
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

'''
"""
semantic_search.py
Semantic vector search powered by MongoDB Atlas $vectorSearch.
Key fix: use $toDouble in the $project stage to convert Decimal128
fields (price, rating) to plain doubles INSIDE MongoDB before
they ever reach Python. This bypasses all Decimal128 handling issues.
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

    def search(self, request: SearchRequest) -> SearchResponse:
        query = request.query.strip()
        top_k = request.top_k

        logger.info(f"Searching: '{query}' top_k={top_k}")

        # Step 1: Embed user query
        query_vector = self.model.encode(query).tolist()

        # Step 2: Vector search pipeline
        # ── KEY FIX ──────────────────────────────────────────────────────────
        # Use $toDouble on price and rating directly inside the $project stage.
        # MongoDB converts Decimal128 → double BEFORE Python ever sees the value.
        # This means Python always receives a plain float — no Decimal128 objects.
        # ─────────────────────────────────────────────────────────────────────
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
                    "brand":         1,
                    "reviewCount":   1,
                    "imageUrl":      1,
                    "stockQuantity": 1,
                    # Convert Decimal128 → double inside MongoDB
                    "price":  {"$toDouble": "$price"},
                    "rating": {"$toDouble": "$rating"},
                    "score":  {"$meta": "vectorSearchScore"}
                }
            }
        ]

        raw_docs = list(self.collection.aggregate(pipeline))
        logger.info(f"Atlas returned {len(raw_docs)} documents")

        # Debug — confirm price/rating are now plain floats
        if raw_docs:
            first = raw_docs[0]
            logger.info(
                f"DEBUG '{first.get('name')}' — "
                f"price={first.get('price')} (type={type(first.get('price')).__name__}) | "
                f"rating={first.get('rating')} (type={type(first.get('rating')).__name__})"
            )

        # Step 3: Map to ProductResult
        results: List[ProductResult] = []
        for doc in raw_docs:
            results.append(ProductResult(
                id            = str(doc.get("_id", "")),
                name          = doc.get("name", ""),
                description   = doc.get("description", ""),
                category      = self._extract_category(doc.get("category")),
                price         = float(doc.get("price") or 0.0),
                brand         = doc.get("brand", ""),
                rating        = float(doc.get("rating") or 0.0),
                reviewCount   = doc.get("reviewCount", 0),
                imageUrl      = doc.get("imageUrl", ""),
                stockQuantity = doc.get("stockQuantity", 0),
                score         = round(float(doc.get("score", 0.0)), 4)
            ))

        logger.info(f"Query: '{query}' → {len(results)} results")
        return SearchResponse(results=results, query=query, total=len(results))

    def _extract_category(self, category) -> str:
        if not category:
            return "Uncategorized"
        if isinstance(category, str):
            return category
        if isinstance(category, dict):
            return category.get("name", "Uncategorized")
        return str(category)
'''