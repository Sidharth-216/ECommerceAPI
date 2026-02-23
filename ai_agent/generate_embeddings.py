import os
from pymongo import MongoClient
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()

# ─────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────
MONGO_URI = os.getenv("MONGO_URI")           # Your Atlas connection string
DB_NAME = os.getenv("DB_NAME", "ecommerce")
COLLECTION_NAME = "products"
MODEL_NAME = "all-MiniLM-L6-v2"
BATCH_SIZE = 100                              # Process 100 products at a time

# ─────────────────────────────────────────
# INIT
# ─────────────────────────────────────────
print(f"Loading model: {MODEL_NAME}")
model = SentenceTransformer(MODEL_NAME)

client = MongoClient(MONGO_URI)
db = client[DB_NAME]
collection = db[COLLECTION_NAME]

# ─────────────────────────────────────────
# GENERATE EMBEDDINGS
# ─────────────────────────────────────────
def get_text_to_embed(product: dict) -> str:
    """
    Combine name + description into one string for embedding.
    More context = better search results.
    """
    name = product.get("name", "")
    description = product.get("description", "")
    category = product.get("category", "")
    return f"{name}. {category}. {description}"

# Fetch all products that don't have embeddings yet
products = list(collection.find(
    {"embedding": {"$exists": False}},
    {"_id": 1, "name": 1, "description": 1, "category": 1}
))

print(f"Found {len(products)} products without embeddings")

# Process in batches
for i in range(0, len(products), BATCH_SIZE):
    batch = products[i:i + BATCH_SIZE]
    texts = [get_text_to_embed(p) for p in batch]

    print(f"Generating embeddings for batch {i // BATCH_SIZE + 1}...")
    embeddings = model.encode(texts, show_progress_bar=True)

    # Save each embedding back to MongoDB
    for product, embedding in zip(batch, embeddings):
        collection.update_one(
            {"_id": product["_id"]},
            {"$set": {"embedding": embedding.tolist()}}
        )

print("✅ All embeddings generated and stored successfully!")
client.close()