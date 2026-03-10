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
        "query":              "string — product search phrase",
        "category":           "string — product category",
        "budget_max":         "number — maximum price in INR",
        "features":           "string — desired feature keywords",
        "product_id":         "string — MongoDB ObjectId of a specific product",
        "product_ids":        "array of strings — for compare_products (2-4 ids)",
        "quantity":           "number — default 1",
        "order_id":           "string — MongoDB ObjectId of an order",
        "shipping_address_id":"string — MongoDB ObjectId of an address (optional for place_order)"
    }
}

# ─────────────────────────────────────────────────────────────────
# System prompt for LLM intent extraction (MODE B)
# ─────────────────────────────────────────────────────────────────
INTENT_SYSTEM_PROMPT = f"""You are an intent extractor for a shopping assistant.
Your job is to analyse the user's latest message and output ONLY a JSON object
matching this schema — no prose, no markdown, no backticks:
{json.dumps(INTENT_SCHEMA, indent=2)}
Rules:
- Always output valid JSON.
- If the user asks to search or find products, use search_product.
- If the user asks to compare two or more products, use compare_products.
- product_ids must be real MongoDB ObjectIds from the conversation history.
  If none are visible, return an empty list [].
- budget_max must be an integer (strip commas, currency symbols).
- For greetings or unclear input, use greeting or other.
- Do NOT invent product_ids. Only use ids explicitly mentioned in history.
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
        if any(w in msg for w in ['compare', ' vs ', 'versus', 'difference between', 'which is better', 'which one']):
            return {'intent': 'compare_products', 'parameters': {'product_ids': []}}

        # ── Search ───────────────────────────────────────────────
        search_triggers = [
            'find', 'search', 'looking for', 'suggest', 'recommend',
            'show me', 'need a', 'want a', 'best', 'good', 'top',
        ]
        if any(w in msg for w in search_triggers):
            params: Dict[str, Any] = {}

            # Budget
            if any(t in msg for t in ['₹', 'rupees', 'rs', 'under', 'below', 'budget', 'cheap', 'affordable']):
                numbers = re.findall(r'\d[\d,]*', message)
                if numbers:
                    params['budget_max'] = int(numbers[0].replace(',', ''))

            # Category
            categories = [
                'smartphone', 'phone', 'laptop', 'headphone', 'watch',
                'tablet', 'television', 'tv', 'earbuds', 'speaker',
                'camera', 'keyboard', 'mouse', 'charger', 'powerbank',
                'refrigerator', 'washing machine', 'air conditioner',
            ]
            for cat in categories:
                if cat in msg:
                    params['category'] = cat
                    break

            # Features
            for feat in ['camera', 'battery', 'gaming', 'lightweight', 'waterproof',
                         'wireless', '5g', 'fast charging', 'oled', 'amoled']:
                if feat in msg:
                    params['features'] = feat
                    break

            # Build query string for semantic search
            params['query'] = ' '.join(filter(None, [
                params.get('category', ''),
                params.get('features', ''),
                message if len(message) < 60 else ''
            ])).strip() or message

            return {'intent': 'search_product', 'parameters': params}

        # ── Cart operations ───────────────────────────────────────
        if any(w in msg for w in ['add to cart', 'add this', 'add it', 'put in cart', 'i\'ll take it']):
            return {'intent': 'add_to_cart', 'parameters': {'quantity': 1}}

        if any(w in msg for w in ['remove from cart', 'delete from cart', 'take out']):
            return {'intent': 'remove_from_cart', 'parameters': {}}

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
            return f"Sorry, I couldn't search right now. {result.get('message', '')}"
        products = result.get('data') or []
        if not products:
            return ("No products matched your search. Try different keywords or a wider budget.")
        lines = [f"Here are the top {min(len(products), 3)} results:\n"]
        for i, p in enumerate(products[:3], 1):
            price = p.get('price', 0)
            stock = "✅ In stock" if p.get('isAvailable', True) else "⚠️ Out of stock"
            lines.append(
                f"{i}. **{p['name']}** by {p.get('brand', 'N/A')}\n"
                f"   ₹{price:,}  |  ⭐ {p.get('rating', 'N/A')}/5  |  {stock}"
            )
        lines.append("\nWould you like to add one to your cart or compare them?")
        return "\n".join(lines)

    def _tpl_compare(self, result: Dict) -> str:
        if not result.get('success'):
            return f"I couldn't compare those products. {result.get('message', '')}"
        data       = result.get('data') or {}
        products   = data.get('products', [])
        highlights = data.get('highlights', [])
        if len(products) < 2:
            return "Please tell me which products you'd like to compare. You can say their names or share links."
        lines = ["Here's a quick comparison:\n"]
        for p in products:
            lines.append(
                f"**{p['name']}** ({p.get('brand', 'N/A')})\n"
                f"  Price: ₹{p.get('price', 0):,}  |  Rating: {p.get('rating', 'N/A')}★\n"
                f"  {'✅ In stock' if p.get('isAvailable') else '❌ Out of stock'}\n"
            )
        if highlights:
            lines.append("📊 Key takeaways:")
            lines.extend(highlights)
        lines.append("\nWould you like to add one of these to your cart?")
        return "\n".join(lines)

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
                return "You don't have a shipping address set. Please add one from your profile and try again."
            if 'empty' in msg.lower():
                return "Your cart is empty — add some items before placing an order."
            return f"Couldn't place your order: {msg}"
        order = result.get('data') or {}
        return (
            f"🎉 Order **{order.get('orderNumber', '')}** placed!\n"
            f"Total: ₹{order.get('totalAmount', 0):,}\n\n"
            "Taking you to the payment screen now. Please complete your UPI payment."
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
            return "I had trouble fetching your orders. Please try again."
        orders = result.get('data') or []
        if not orders:
            return "You don't have any orders yet. Start shopping!"
        lines = [f"Your recent orders ({len(orders)}):\n"]
        for o in orders[:5]:
            lines.append(
                f"• **{o['orderNumber']}** — ₹{o['totalAmount']:,}\n"
                f"  Status: {o['status']}  |  {o['createdAt']}"
            )
        return "\n".join(lines)