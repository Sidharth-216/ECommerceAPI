'''import os
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
'''

"""
generate_embeddings.py

Generates semantic embeddings for all products in MongoDB.
Re-embeds ALL products (removes old embedding first) to ensure
consistency with the improved text template.

Run this script once locally whenever you want to refresh embeddings.
"""

import os
from pymongo import MongoClient
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
from bson.decimal128 import Decimal128

load_dotenv()

# ─────────────────────────────────────────
# CONFIG
# ─────────────────────────────────────────
MONGO_URI        = os.getenv("MONGO_URI")
DB_NAME          = os.getenv("DB_NAME", "ecommerce")
COLLECTION_NAME  = "products"
MODEL_NAME       = "all-MiniLM-L6-v2"
BATCH_SIZE       = 50   # Smaller batch = safer on low RAM machines
FORCE_REEMBED    = True  # True = regenerate ALL embeddings (recommended after text change)

# ─────────────────────────────────────────
# INIT
# ─────────────────────────────────────────
print(f"Loading model: {MODEL_NAME}")
model = SentenceTransformer(MODEL_NAME)

client = MongoClient(MONGO_URI)
collection = client[DB_NAME][COLLECTION_NAME]
print(f"Connected to MongoDB → {DB_NAME}.{COLLECTION_NAME}")


# ─────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────

def extract_decimal(value) -> str:
    """Convert MongoDB Decimal128 or plain number to a clean string."""
    if value is None:
        return ""
    if isinstance(value, Decimal128):
        return str(value.to_decimal())
    if isinstance(value, (int, float)):
        return str(value)
    if isinstance(value, dict) and "$numberDecimal" in value:
        return str(value["$numberDecimal"])
    return str(value)


def extract_category(category) -> str:
    """Handle category as string or { _id: 0, name: 'Mobiles' } object."""
    if not category:
        return ""
    if isinstance(category, str):
        return category
    if isinstance(category, dict):
        return category.get("name", "")
    return str(category)


def extract_specifications(specs) -> str:
    """
    Convert specifications dict to a readable sentence.
    e.g. { storage: "128GB", color: "Black" } → "128GB Black"
    """
    if not specs or not isinstance(specs, dict):
        return ""
    parts = []
    for key, val in specs.items():
        if val:
            parts.append(str(val))
    return " ".join(parts)


def get_text_to_embed(product: dict) -> str:
    """
    Build a rich, context-dense text string for embedding.

    Template:
        {name} by {brand}. Category: {category}. Price: ₹{price}.
        {description}. Specs: {specifications}.

    Why each field matters:
    - name        → core identity, most searches match this
    - brand       → "Apple phone", "Samsung TV", etc.
    - category    → "mobile phone", "laptop", etc.
    - price       → "phone under 80000" type queries
    - description → detailed features, use cases
    - specs       → storage, color, display, battery (very search-relevant)
    - brand again → reinforcing brand boosts cosine similarity for brand queries
    """
    name        = product.get("name", "").strip()
    brand       = product.get("brand", "").strip()
    category    = extract_category(product.get("category", ""))
    price       = extract_decimal(product.get("price"))
    description = product.get("description", "").strip()
    specs       = extract_specifications(product.get("specifications"))

    parts = []

    if name:
        parts.append(name)
    if brand:
        parts.append(f"by {brand}")
    if category:
        parts.append(f"Category: {category}")
    if price:
        parts.append(f"Price: Rs {price}")
    if description:
        parts.append(description)
    if specs:
        parts.append(f"Specifications: {specs}")
    if brand:
        # Repeat brand at end — reinforces brand similarity scoring
        parts.append(f"Brand: {brand}")

    text = ". ".join(parts)

    # Truncate to 512 chars — all-MiniLM-L6-v2 has 256 token limit,
    # beyond which it truncates anyway. 512 chars ≈ 120 tokens safely.
    return text[:512]


# ─────────────────────────────────────────
# FETCH PRODUCTS
# ─────────────────────────────────────────

# Fetch fields needed for embedding (no need to load the embedding array itself)
projection = {
    "_id":            1,
    "name":           1,
    "brand":          1,
    "description":    1,
    "category":       1,
    "price":          1,
    "specifications": 1,
}

if FORCE_REEMBED:
    # Re-embed everything — needed whenever get_text_to_embed changes
    print("FORCE_REEMBED=True → fetching ALL products")
    products = list(collection.find({}, projection))
else:
    # Only embed products missing embeddings
    print("Fetching products without embeddings...")
    products = list(collection.find({"embedding": {"$exists": False}}, projection))

print(f"Found {len(products)} products to embed")

if len(products) == 0:
    print("Nothing to do. Set FORCE_REEMBED=True to regenerate all embeddings.")
    client.close()
    exit()

# ─────────────────────────────────────────
# PREVIEW — show first 3 texts before processing
# ─────────────────────────────────────────
print("\n── Preview of embedding text (first 3 products) ──")
for p in products[:3]:
    text = get_text_to_embed(p)
    print(f"  [{p.get('name', 'Unknown')}]")
    print(f"  → {text}")
    print()

confirm = input("Proceed with embedding? (yes/no): ").strip().lower()
if confirm not in ("yes", "y"):
    print("Aborted.")
    client.close()
    exit()

# ─────────────────────────────────────────
# GENERATE AND SAVE EMBEDDINGS
# ─────────────────────────────────────────
total_processed = 0

for i in range(0, len(products), BATCH_SIZE):
    batch = products[i:i + BATCH_SIZE]
    texts = [get_text_to_embed(p) for p in batch]

    batch_num = i // BATCH_SIZE + 1
    total_batches = (len(products) + BATCH_SIZE - 1) // BATCH_SIZE
    print(f"Batch {batch_num}/{total_batches} — generating {len(batch)} embeddings...")

    embeddings = model.encode(texts, show_progress_bar=True)

    for product, embedding in zip(batch, embeddings):
        collection.update_one(
            {"_id": product["_id"]},
            {"$set": {"embedding": embedding.tolist()}}
        )

    total_processed += len(batch)
    print(f"  ✅ {total_processed}/{len(products)} done")

print(f"\n✅ All {total_processed} embeddings generated and stored successfully!")
client.close()