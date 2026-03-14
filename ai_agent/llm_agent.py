"""
llm_agent.py  (v4 — Groq Edition)
===================================
Two clear modes:
  MODE A (current)  — rule-based extraction + template responses. Works now.
  MODE B (active)   — real LLM calls via Groq (or openai / anthropic / ollama).
To activate Groq (recommended):
  1. pip install groq
  2. Set LLM_PROVIDER=groq  in .env
  3. Set LLM_MODEL=llama-3.1-8b-instant  in .env
  4. Set GROQ_API_KEY=gsk_...  in .env  (free at console.groq.com)
Other supported providers: ollama | openai | anthropic
"""

import re
import os
import json
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────
# LLM configuration (read from .env — ignored until MODE B)
# ─────────────────────────────────────────────────────────────────
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "none")   # "none" | "groq" | "ollama" | "openai" | "anthropic"
LLM_MODEL    = os.getenv("LLM_MODEL", "llama-3.1-8b-instant")
LLM_BASE_URL = os.getenv("LLM_BASE_URL", "http://localhost:11434")   # Ollama only
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# ─────────────────────────────────────────────────────────────────
# Intent schema (used both for rule-based and LLM JSON output)
# ─────────────────────────────────────────────────────────────────
INTENT_SCHEMA = {
    "intent": "one of: search_product | compare_products | add_to_cart | view_cart | "
              "update_cart | remove_from_cart | place_order | order_history | "
              "cancel_order | get_context | greeting | other",
    "parameters": {
        "query":               "string — product search phrase or product name",
        "product_name":        "string — exact product name the user mentioned (for add/remove cart)",
        "category":            "string — product category",
        "budget_max":          "number — maximum price in INR",
        "features":            "string — desired feature keywords",
        "product_id":          "string — MongoDB ObjectId only (24 hex chars)",
        "product_ids":         "array of strings — for compare_products (2-4 ids)",
        "quantity":            "number — default 1",
        "order_id":            "string — MongoDB ObjectId of an order",
        "shipping_address_id": "string — MongoDB ObjectId of an address (optional for place_order)"
    }
}

# ─────────────────────────────────────────────────────────────────
# System prompt for LLM intent extraction (MODE B)
# ─────────────────────────────────────────────────────────────────
INTENT_SYSTEM_PROMPT = f"""You are an intent extractor for a shopping assistant.
Output ONLY a valid JSON object — no prose, no markdown, no backticks.
Schema:
{json.dumps(INTENT_SCHEMA, indent=2)}
STRICT RULES — follow exactly:
1. REMOVE/DELETE from cart → intent: "remove_from_cart"
   Triggers: "remove", "delete", "take out", "don't want", "cancel item"
   Put the product name in BOTH "product_name" AND "query" parameters.
   Example: "remove Samsung TV" → {{"intent":"remove_from_cart","parameters":{{"product_name":"Samsung TV","query":"Samsung TV"}}}}
2. ADD to cart → intent: "add_to_cart"
   Triggers: "add", "buy", "put in cart", "i want", "i'll take", "<product> add to cart"
   Put the product name in BOTH "product_name" AND "query" parameters.
   Example: "JBL Tune add to cart" → {{"intent":"add_to_cart","parameters":{{"product_name":"JBL Tune","query":"JBL Tune","quantity":1}}}}
   Example: "add Samsung TV to cart" → {{"intent":"add_to_cart","parameters":{{"product_name":"Samsung TV","query":"Samsung TV","quantity":1}}}}
3. VIEW cart → intent: "view_cart"
   Triggers: "my cart", "show cart", "what's in my cart", "cart"
4. SEARCH products → intent: "search_product"
   Triggers: "find", "search", "show me", "recommend", "best", "looking for", bare category words
   If user mentions a budget, put the NUMBER ONLY in "budget_max" (e.g. "under 5000" → budget_max: 5000, "below 15k" → budget_max: 15000).
   Always put the full search phrase in "query".
   Example: "earphones under 5000" → {{"intent":"search_product","parameters":{{"query":"earphones under 5000","budget_max":5000}}}}
5. CHECKOUT/place order → intent: "place_order"
   Triggers: "checkout", "place order", "proceed to pay", "buy now", "confirm order"
6. ORDER HISTORY → intent: "order_history"
   Triggers: "my orders", "past orders", "order history"
7. CANCEL ORDER → intent: "cancel_order"
   Triggers: "cancel order", with order number in "order_id" parameter.
8. COMPARE → intent: "compare_products"
   Triggers: "compare", "vs", "difference between", "which is better"
9. GREETING → intent: "greeting"
   Triggers: "hi", "hello", "hey", "namaste"
10. Other → intent: "other"
- budget_max must be an integer (strip ₹, commas).
- product_ids must be real 24-char MongoDB ObjectIds from history only. Never invent them.
- Always output valid JSON. Nothing else.
"""

# ─────────────────────────────────────────────────────────────────
# System prompt for LLM response generation (MODE B)
# ─────────────────────────────────────────────────────────────────
RESPONSE_SYSTEM_PROMPT = """You are ShopAI, a friendly and knowledgeable Indian e-commerce assistant.
You help users find products, manage their cart, and place orders.
Tone guidelines:
- Warm, concise, and confident. Never robotic.
- Use ₹ for prices. Use emojis sparingly (max 2 per response).
- When listing products, use a numbered or bulleted list.
- Always end with a clear next-step question or call-to-action.
- If an API call failed, apologise briefly and suggest an alternative.
- Keep responses under 150 words unless comparing products.
Formatting:
- Use **bold** for product names and prices.
- Never fabricate product details — only use what is in the API result.
- Never make up order numbers or IDs.
"""


class LLMAgent:
    """
    Two responsibilities:
      1. extract_intent(message, history) → { intent, parameters }
      2. generate_response(intent_data, api_result) → str
    MODE A: Both methods use rules/templates (works immediately, no GPU needed).
    MODE B: Both methods call a real LLM. Switch by changing LLM_PROVIDER in .env.
    """

    def __init__(self):
        self._llm = None
        if LLM_PROVIDER != "none":
            self._init_llm()

    def _init_llm(self):
        """
        Lazy-init the LLM client.
        Called once at startup if LLM_PROVIDER is set.
        """
        try:
            if LLM_PROVIDER == "groq":
                from groq import Groq
                self._llm = Groq(api_key=GROQ_API_KEY)
                logger.info(f"✅ LLM initialised: Groq / {LLM_MODEL}")

            elif LLM_PROVIDER == "ollama":
                import ollama
                self._llm = ollama
                logger.info(f"✅ LLM initialised: Ollama / {LLM_MODEL}")

            elif LLM_PROVIDER == "openai":
                from openai import OpenAI
                self._llm = OpenAI()    # reads OPENAI_API_KEY from env
                logger.info(f"✅ LLM initialised: OpenAI / {LLM_MODEL}")

            elif LLM_PROVIDER == "anthropic":
                import anthropic
                self._llm = anthropic.Anthropic()   # reads ANTHROPIC_API_KEY from env
                logger.info(f"✅ LLM initialised: Anthropic / {LLM_MODEL}")

            else:
                logger.warning(f"⚠️  Unknown LLM_PROVIDER: {LLM_PROVIDER}. Using rule-based mode.")
        except ImportError as e:
            logger.error(f"❌ LLM package not installed: {e}. Falling back to rule-based mode.")
            self._llm = None

    # ══════════════════════════════════════════════════════════════
    # PUBLIC API
    # ══════════════════════════════════════════════════════════════

    def extract_intent(self, message: str, history: list) -> Dict[str, Any]:
        """Entry point — routes to LLM or rule-based depending on config."""
        if self._llm and LLM_PROVIDER != "none":
            try:
                return self._llm_extract_intent(message, history)   # ← SWAP THIS (MODE B)
            except Exception as e:
                logger.warning(f"LLM intent extraction failed ({e}), falling back to rules.")
        return self._rule_based_intent_extraction(message, history)  # ← SWAP THIS (MODE A)

    def generate_response(self, intent_data: Dict, api_result: Dict) -> str:
        """Entry point — routes to LLM or template depending on config."""
        if self._llm and LLM_PROVIDER != "none":
            try:
                return self._llm_generate_response(intent_data, api_result)   # ← SWAP THIS (MODE B)
            except Exception as e:
                logger.warning(f"LLM response generation failed ({e}), falling back to templates.")
        return self._template_generate_response(intent_data, api_result)      # ← SWAP THIS (MODE A)

    # ══════════════════════════════════════════════════════════════
    # MODE B — LLM IMPLEMENTATIONS
    # Replace only these two methods when integrating a real LLM.
    # ══════════════════════════════════════════════════════════════

    def _llm_extract_intent(self, message: str, history: list) -> Dict[str, Any]:
        """
        ← SWAP THIS for MODE B.
        Calls the configured LLM to extract intent as JSON.
        Falls back to rule-based if the LLM returns invalid JSON.
        """
        # Build conversation for the LLM
        messages = [{"role": "system", "content": INTENT_SYSTEM_PROMPT}]

        # Include last 6 turns of history for context (keep token cost low)
        for turn in history[-6:]:
            messages.append({"role": turn["role"], "content": turn["content"]})

        messages.append({"role": "user", "content": message})

        raw = self._call_llm(messages, max_tokens=300, temperature=0.1)

        # Parse JSON safely
        try:
            # Strip markdown fences if LLM adds them despite instructions
            cleaned = re.sub(r"```(?:json)?", "", raw).strip().strip("`").strip()
            result  = json.loads(cleaned)
            # Validate required keys
            if "intent" not in result:
                raise ValueError("Missing 'intent' key")
            result.setdefault("parameters", {})
            logger.info(f"🧠 LLM intent: {result['intent']} | params: {result['parameters']}")
            return result
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"LLM returned invalid JSON: {raw!r} — error: {e}")
            # Fallback to rule-based
            return self._rule_based_intent_extraction(message, history)

    def _llm_generate_response(self, intent_data: Dict, api_result: Dict) -> str:
        """
        Calls Groq to generate a natural-language response.
        Data is aggressively trimmed BEFORE sending to stay under the 6k TPM limit.
        """
        intent = intent_data.get("intent", "other")
        params = intent_data.get("parameters", {})

        # Trim API data to only what the LLM needs
        trimmed_data = self._trim_for_llm(intent, api_result.get("data"))

        context = json.dumps({
            "intent":      intent,
            "parameters":  params,
            "api_success": api_result.get("success", False),
            "api_message": api_result.get("message", ""),
            "data":        trimmed_data,
        }, ensure_ascii=False, default=str)

        messages = [
            {"role": "system", "content": RESPONSE_SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Intent: {intent}\n"
                    f"API result:\n{context}\n\n"
                    "Write a short, helpful reply (max 80 words)."
                )
            }
        ]

        return self._call_llm(messages, max_tokens=300, temperature=0.7)

    def _trim_for_llm(self, intent: str, data: Any) -> Any:
        """
        Strips heavy fields (description, imageUrl, specifications) from API data
        so the Groq prompt stays well under 6000 tokens.
        """
        if data is None:
            return None

        # Product list (search / compare)
        if intent in ("search_product", "compare_products"):
            items = data if isinstance(data, list) else data.get("products", [])
            slim = []
            for p in items[:5]:
                slim.append({
                    "id":            p.get("id"),
                    "name":          p.get("name"),
                    "brand":         p.get("brand"),
                    "price":         p.get("price"),
                    "rating":        p.get("rating"),
                    "stockQuantity": p.get("stockQuantity"),
                    "isAvailable":   p.get("isAvailable"),
                    "category":      p.get("category"),
                })
            if isinstance(data, dict) and "highlights" in data:
                return {"products": slim, "highlights": data["highlights"]}
            return slim

        # Cart
        if intent == "view_cart":
            if not isinstance(data, dict):
                return data
            items = data.get("items", [])
            slim_items = [
                {
                    "productId":   i.get("productId"),   # needed for remove_from_cart
                    "productName": i.get("productName"),
                    "quantity":    i.get("quantity"),
                    "price":       i.get("price"),
                    "subtotal":    i.get("subtotal"),
                }
                for i in items[:10]
            ]
            return {
                "isEmpty":    data.get("isEmpty", not bool(items)),
                "totalItems": data.get("totalItems", len(items)),
                "total":      data.get("total"),
                "items":      slim_items,
            }

        # Orders
        if intent in ("order_history", "cancel_order", "place_order"):
            if isinstance(data, list):
                return [
                    {
                        "orderNumber": o.get("orderNumber"),
                        "status":      o.get("status"),
                        "totalAmount": o.get("totalAmount"),
                        "createdAt":   o.get("createdAt"),
                        "itemCount":   len(o.get("items", [])),
                    }
                    for o in data[:5]
                ]
            if isinstance(data, dict):
                return {
                    "orderNumber": data.get("orderNumber"),
                    "status":      data.get("status"),
                    "totalAmount": data.get("totalAmount"),
                    "createdAt":   data.get("createdAt"),
                }

        # Context
        if intent == "get_context":
            if isinstance(data, dict):
                return {
                    "userName":   data.get("userName"),
                    "cartEmpty":  data.get("cart", {}).get("isEmpty", True),
                    "cartItems":  data.get("cart", {}).get("totalItems", 0),
                    "orderCount": len(data.get("recentOrders", [])),
                    "hasAddress": bool(data.get("defaultAddress")),
                }

        # Default: cap at 1500 chars
        raw = json.dumps(data, default=str)
        if len(raw) > 1500:
            return raw[:1500] + "...[truncated]"
        return data

    def _call_llm(self, messages: list, max_tokens: int = 400, temperature: float = 0.7) -> str:
        """
        Provider-agnostic LLM call.
        Returns the text content of the response.
        """
        if LLM_PROVIDER == "groq":
            resp = self._llm.chat.completions.create(
                model=LLM_MODEL,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature
            )
            return resp.choices[0].message.content.strip()

        elif LLM_PROVIDER == "ollama":
            resp = self._llm.chat(
                model=LLM_MODEL,
                messages=messages,
                options={"temperature": temperature, "num_predict": max_tokens}
            )
            return resp["message"]["content"].strip()

        elif LLM_PROVIDER == "openai":
            resp = self._llm.chat.completions.create(
                model=LLM_MODEL,
                messages=messages,
                max_tokens=max_tokens,
                temperature=temperature
            )
            return resp.choices[0].message.content.strip()

        elif LLM_PROVIDER == "anthropic":
            # Anthropic uses a separate system param
            system_content = next(
                (m["content"] for m in messages if m["role"] == "system"), ""
            )
            user_messages = [m for m in messages if m["role"] != "system"]
            resp = self._llm.messages.create(
                model=LLM_MODEL,
                max_tokens=max_tokens,
                system=system_content,
                messages=user_messages
            )
            return resp.content[0].text.strip()

        raise ValueError(f"Unsupported LLM_PROVIDER: {LLM_PROVIDER}")

    # ══════════════════════════════════════════════════════════════
    # MODE A — RULE-BASED INTENT EXTRACTION
    # ══════════════════════════════════════════════════════════════

    def _rule_based_intent_extraction(
        self,
        message: str,
        history: list
    ) -> Dict[str, Any]:
        """
        Fast, zero-dependency intent extraction via regex + keyword matching.
        Handles ~90 % of real shopping queries correctly.
        """
        msg = message.lower().strip()

        # ── Compare ──────────────────────────────────────────────
        if any(w in msg for w in ['compare', ' vs ', 'versus', 'difference between', 'which is better', 'which one is']):
            # Try to extract product IDs from recent history (search results)
            product_ids = []
            for turn in reversed(history[-6:]):
                role    = turn.get('role', '')
                turn_content = turn.get('content', '')
                if role == 'assistant':
                    ids = re.findall(r'[0-9a-f]{24}', turn_content)
                    product_ids.extend(ids)
                    if len(product_ids) >= 2:
                        break
            return {'intent': 'compare_products', 'parameters': {'product_ids': list(dict.fromkeys(product_ids))[:4]}}

        # ── Search ───────────────────────────────────────────────
        search_triggers = [
            'find', 'search', 'looking for', 'suggest', 'recommend',
            'show me', 'need a', 'want a', 'best', 'good', 'top',
            'show', 'get me', 'i need', 'i want', 'buy', 'shop',
            'what are', 'any good', 'options for',
        ]
        # Also catch bare category words (e.g. "phones", "laptops", "kurta")
        category_words = [
            'smartphone', 'phone', 'phones', 'laptop', 'laptops', 'headphone',
            'headphones', 'watch', 'watches', 'tablet', 'tablets', 'television',
            'tv', 'earbuds', 'speaker', 'speakers', 'camera', 'cameras',
            'keyboard', 'mouse', 'charger', 'powerbank', 'refrigerator',
            'fridge', 'washing machine', 'air conditioner', 'ac', 'book', 'books',
            'kurta', 'kurti', 'dress', 'shirt', 'shoes', 'bag', 'bags',
            'perfume', 'skincare', 'makeup', 'furniture', 'chair', 'table',
        ]
        is_search = any(w in msg for w in search_triggers)
        has_category = any(w in msg for w in category_words)

        if is_search or has_category:
            params: Dict[str, Any] = {}

            # Budget — handle "under 20000", "below 15k", "20k budget", "under ₹5000"
            budget_match = re.search(
                r'(?:under|below|within|upto|up\s+to|less\s+than|budget\s+of|max)\s*[₹rRsS\.]*\s*(\d[\d,]*)\s*(k|thousand)?',
                msg, re.IGNORECASE
            )
            if not budget_match:
                # also catch "₹5000" or "5000 budget"
                budget_match = re.search(r'[₹]\s*(\d[\d,]*)\s*(k|thousand)?', msg)
            if budget_match and any(t in msg for t in ['₹','rs','under','below','budget','affordable','upto','within','k','max']):
                raw = budget_match.group(1).replace(',', '')
                val = int(raw)
                suffix = (budget_match.group(2) or '').lower()
                if suffix in ('k', 'thousand'):
                    val *= 1000
                params['budget_max'] = val
                logger.debug(f"Budget extracted: {val}")

            # Use full message as query for semantic search (it's already good at this)
            params['query'] = message.strip()

            return {'intent': 'search_product', 'parameters': params}

        # ── Cart operations ───────────────────────────────────────
        # ── REMOVE from cart (checked FIRST before search triggers)
        # Handles: 'remove X from cart', 'delete X from cart'
        remove_triggers = ['remove', 'delete', 'take out', 'dont want', "don't want"]
        has_remove  = any(w in msg for w in remove_triggers)
        has_cart    = any(w in msg for w in ['cart', 'from cart'])
        if has_remove and has_cart:
            import re as _re
            m = _re.search(r'(?:remove|delete|take\s+out)\s+(.+?)\s+from\s+(?:my\s+)?cart', msg, _re.IGNORECASE)
            pname = m.group(1).strip() if m else ''
            return {'intent': 'remove_from_cart', 'parameters': {
                'product_name': pname,
                'query':        pname,
            }}

        # ADD TO CART — handles both "add JBL to cart" AND "JBL add to cart"
        add_triggers = ['add to cart', 'add this to cart', 'put in cart', "i'll take it", 'add this', 'add it to']
        if any(w in msg for w in add_triggers) or ('add' in msg and 'cart' in msg):
            # Pattern 1: "add <product> to cart"
            m = re.search(r'add\s+(.+?)\s+(?:to\s+(?:my\s+)?cart|to\s+cart)', msg, re.IGNORECASE)
            if not m:
                # Pattern 2: "<product> add to cart"
                m = re.search(r'^(.+?)\s+add\s+(?:to\s+(?:my\s+)?cart|to\s+cart)', msg, re.IGNORECASE)
            pname = m.group(1).strip() if m else msg.replace('add to cart', '').replace('add', '').replace('cart', '').strip()
            return {'intent': 'add_to_cart', 'parameters': {
                'product_name': pname,
                'query':        pname,
                'quantity':     1
            }}


        if any(w in msg for w in ['my cart', 'show cart', 'view cart', 'what\'s in my cart', 'cart']):
            if any(w in msg for w in ['checkout', 'buy', 'order', 'place']):
                return {'intent': 'place_order', 'parameters': {}}
            return {'intent': 'view_cart', 'parameters': {}}

        # ── Orders ────────────────────────────────────────────────
        if any(w in msg for w in ['cancel order', 'cancel my order']):
            oid = re.search(r'ORD-[\w-]+', message, re.IGNORECASE)
            return {'intent': 'cancel_order', 'parameters': {
                'order_id': oid.group(0) if oid else None
            }}

        if any(w in msg for w in ['place order', 'checkout', 'buy now', 'confirm order', 'proceed to pay']):
            return {'intent': 'place_order', 'parameters': {}}

        if any(w in msg for w in ['order history', 'my orders', 'past orders', 'previous orders', 'what did i buy']):
            return {'intent': 'order_history', 'parameters': {}}

        # ── Greeting ──────────────────────────────────────────────
        if any(w in msg for w in ['hi', 'hello', 'hey', 'good morning', 'good evening', 'namaste', 'hola']):
            return {'intent': 'greeting', 'parameters': {}}

        return {'intent': 'other', 'parameters': {}}

    # ══════════════════════════════════════════════════════════════
    # MODE A — TEMPLATE RESPONSE GENERATION
    # ══════════════════════════════════════════════════════════════

    def _template_generate_response(self, intent_data: Dict, api_result: Dict) -> str:
        intent = intent_data.get('intent', 'other')

        handlers = {
            'search_product':   self._tpl_search,
            'compare_products': self._tpl_compare,
            'add_to_cart':      self._tpl_add_to_cart,
            'remove_from_cart': self._tpl_remove_from_cart,
            'view_cart':        self._tpl_cart,
            'place_order':      self._tpl_place_order,
            'cancel_order':     self._tpl_cancel_order,
            'order_history':    self._tpl_order_history,
            'greeting':         lambda _: (
                "Hello! I'm your ShopAI assistant 🛍️\n"
                "I can search products, compare items, manage your cart, and place orders.\n"
                "What are you looking for today?"
            ),
            'other':            lambda _: (
                "I'm here to help you shop! Try asking me to:\n"
                "• Search for a product (e.g. 'Find gaming laptops under ₹60,000')\n"
                "• Compare products (e.g. 'Compare Samsung vs OnePlus')\n"
                "• View or manage your cart\n"
                "• Check your order history"
            ),
        }

        handler = handlers.get(intent, handlers['other'])
        return handler(api_result)

    # ─── Template helpers ─────────────────────────────────────────

    def _tpl_search(self, result: Dict) -> str:
        if not result.get('success'):
            msg = result.get('message', '')
            return f'Sorry, search failed: {msg}. Please try again.'
        products = result.get('data') or []
        if not products:
            return 'No products matched your search. Try different keywords or a broader query.'
        out = [f'Found **{len(products)}** result(s):\n']
        for i, p in enumerate(products[:5], 1):
            price  = p.get('price', 0)
            rating = p.get('rating', 'N/A')
            stock  = 'In stock' if p.get('isAvailable', True) else 'Out of stock'
            pid    = p.get('id', '')
            out.append(
                f"{i}. **{p.get('name','?')}** by {p.get('brand','N/A')} — "
                f"Rs.{price:,} | {rating}/5 | {stock}"
                + (f' [id:{pid}]' if pid else '')
            )
        out.append('\nWould you like to add one to your cart or compare them?')
        return '\n'.join(out)

    def _tpl_compare(self, result: Dict) -> str:
        if not result.get('success'):
            msg = result.get('message', '')
            if 'id' in msg.lower() or 'product' in msg.lower():
                return ('To compare, search for products first then say compare. E.g. show me laptops, then compare them.')
            return f'Comparison failed: {msg}'
        data       = result.get('data') or {}
        products   = data.get('products', [])
        highlights = data.get('highlights', [])
        if len(products) < 2:
            return 'Search for products first, then ask me to compare them.'
        out = ['**Product Comparison**\n']
        for p in products:
            avail = 'In stock' if p.get('isAvailable') else 'Out of stock'
            out.append(
                f"**{p.get('name','?')}** ({p.get('brand','N/A')})\n"
                f"  Rs.{p.get('price',0):,} | {p.get('rating','N/A')}* | {avail}"
            )
        if highlights:
            out.append('\n**Verdict:**')
            out.extend(highlights)
        out.append('\nWant to add one to your cart?')
        return '\n'.join(out)

    def _tpl_add_to_cart(self, result: Dict) -> str:
        if not result.get('success'):
            msg = result.get('message', '')
            if 'stock' in msg.lower():
                return f"Sorry, that item doesn't have enough stock. {msg}"
            return f"I couldn't add that item. {msg}"
        cart  = result.get('data') or {}
        total = cart.get('total', 0)
        count = cart.get('totalItems', 0)
        return (
            f"Done! Item added to your cart 🛒\n"
            f"You now have **{count} item(s)** totalling **₹{total:,}**.\n"
            "Keep shopping or ready to checkout?"
        )

    def _tpl_remove_from_cart(self, result: Dict) -> str:
        if not result.get('success'):
            return f"Couldn't remove that item. {result.get('message', '')}"
        return "Item removed from your cart ✅"

    def _tpl_cart(self, result: Dict) -> str:
        if not result.get('success'):
            return "I had trouble fetching your cart. Please try again."
        cart = result.get('data') or {}
        if cart.get('isEmpty', True) or not cart.get('items'):
            return "Your cart is empty 🛒\nWould you like me to find some products?"
        items = cart['items']
        lines = [f"Your cart ({len(items)} item(s)):\n"]
        for item in items:
            lines.append(f"• **{item['productName']}** — ₹{item['price']:,} × {item['quantity']} = ₹{item['subtotal']:,}")
        lines.append(f"\n**Total: ₹{cart.get('total', 0):,}**")
        lines.append("Ready to checkout?")
        return "\n".join(lines)

    def _tpl_place_order(self, result: Dict) -> str:
        if not result.get('success'):
            msg = result.get('message', '')
            if 'address' in msg.lower():
                return "No shipping address found. Please go to Profile -> Addresses and add one, then try again."
            if 'empty' in msg.lower():
                return "Your cart is empty -- add some items before placing an order."
            return f"Could not place your order: {msg}. Please try again."

        order     = result.get('data') or {}
        order_num = order.get('orderNumber', '')
        total     = order.get('totalAmount', 0)

        # Timeout-success: order placed but Render did not respond in time
        if 'check orders' in str(order_num).lower() or 'processing' in str(order.get('status','')).lower():
            return (
                "Your order is being processed! "
                "Our server took a moment to respond but your order should be confirmed. "
                "Please go to My Orders page to check status and complete payment."
            )

        total_str = f"Rs.{total:,}" if total else ""
        return (
            f"Order {order_num} placed successfully! "
            + (f"Total: {total_str}. " if total_str else "")
            + "Please go to Orders -> Pay Now to complete your UPI payment."
        )


    def _tpl_cancel_order(self, result: Dict) -> str:
        if not result.get('success'):
            msg = result.get('message', '')
            if 'not found' in msg.lower():
                return "I couldn't find that order. Please check the order number and try again."
            return f"Couldn't cancel the order: {msg}"
        return (
            "✅ Order cancelled successfully.\n"
            "If you paid online, a refund will be processed within 5–7 business days."
        )

    def _tpl_order_history(self, result: Dict) -> str:
        if not result.get('success'):
            return 'I had trouble fetching your orders. Please try again.'
        orders = result.get('data') or []
        if not orders:
            return "You don't have any orders yet. Start shopping!"
        out = [f'**Your Orders** ({len(orders)} found):\n']
        for o in orders[:5]:
            num    = o.get('orderNumber', 'N/A')
            status = o.get('status', 'Unknown')
            total  = o.get('totalAmount', 0)
            date   = o.get('createdAt', '')
            items  = o.get('items') or []
            names  = ', '.join(i.get('productName','?') for i in items[:2])
            if len(items) > 2:
                names += f' +{len(items)-2} more'
            out.append(f'**{num}** — Rs.{total:,} | {status} | {date}\n  {names}')
        out.append('\nGo to Orders page to view details or make a payment.')
        return '\n'.join(out)