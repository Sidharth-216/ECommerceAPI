"""
llm_agent.py
Handles intent extraction and natural language response generation.
Currently uses rule-based extraction — swap the methods with actual LLM
calls (Mistral, Ollama, etc.) when ready without touching anything else.
"""

import re
from typing import List, Dict, Any
from models import ChatMessage


class LLMAgent:
    """
    LLM Agent responsible for:
    1. Understanding what the user wants (intent extraction)
    2. Turning API results into human-readable responses

    To plug in a real LLM (e.g. Mistral via Ollama), replace:
    - _rule_based_intent_extraction() → call your LLM with a JSON prompt
    - generate_response()             → call your LLM with a response prompt
    """

    def __init__(self):
        # When using a real LLM, initialize it here.
        # e.g. self.llm = Ollama(model="mistral")
        pass

    # ── Intent Extraction ──────────────────────────────────────────────────────

    def extract_intent(self, message: str, history: List[ChatMessage]) -> Dict[str, Any]:
        """
        Extracts user intent and parameters from a message.
        history is available for context (e.g. which product was mentioned earlier).
        """
        return self._rule_based_intent_extraction(message)

    def _rule_based_intent_extraction(self, message: str) -> Dict[str, Any]:
        """
        Rule-based fallback. Works well for demos.
        Replace with LLM call for production-grade understanding.

        Returns:
            {
              'intent': str,
              'parameters': { category, budget_max, features, product_id, quantity }
            }
        """
        msg = message.lower()

        # ── Search / Recommend ────────────────────────────────────────────────
        if any(w in msg for w in ['find', 'search', 'looking for', 'suggest', 'recommend', 'show me']):
            params = {}

            # Budget extraction
            if '₹' in message or 'rupees' in msg or 'rs' in msg or 'under' in msg or 'below' in msg:
                numbers = re.findall(r'\d+(?:,\d+)*', message)
                if numbers:
                    params['budget_max'] = int(numbers[0].replace(',', ''))

            # Category extraction
            categories = ['smartphone', 'laptop', 'headphone', 'watch', 'tablet',
                          'television', 'tv', 'earbuds', 'speaker', 'camera']
            for cat in categories:
                if cat in msg:
                    params['category'] = cat
                    break

            # Feature extraction
            for feature in ['camera', 'battery', 'gaming', 'lightweight', 'waterproof']:
                if feature in msg:
                    params['features'] = feature
                    break

            return {'intent': 'search_product', 'parameters': params}

        # ── Cart ──────────────────────────────────────────────────────────────
        if 'view cart' in msg or ('cart' in msg and 'show' in msg):
            return {'intent': 'view_cart', 'parameters': {}}

        if any(w in msg for w in ['add to cart', 'add this', 'add it']):
            return {'intent': 'add_to_cart', 'parameters': {}}

        if any(w in msg for w in ['cart', 'buy']):
            if any(w in msg for w in ['order', 'checkout', 'purchase']):
                return {'intent': 'place_order', 'parameters': {}}
            return {'intent': 'view_cart', 'parameters': {}}

        # ── Orders ────────────────────────────────────────────────────────────
        if any(w in msg for w in ['order', 'checkout', 'purchase', 'place order']):
            if 'history' in msg or 'previous' in msg or 'past' in msg:
                return {'intent': 'order_history', 'parameters': {}}
            return {'intent': 'place_order', 'parameters': {}}

        if 'order history' in msg or 'my orders' in msg:
            return {'intent': 'order_history', 'parameters': {}}

        # ── Greeting ──────────────────────────────────────────────────────────
        if any(w in msg for w in ['hi', 'hello', 'hey', 'good morning', 'good evening']):
            return {'intent': 'greeting', 'parameters': {}}

        return {'intent': 'other', 'parameters': {}}

    # ── Response Generation ────────────────────────────────────────────────────

    def generate_response(self, intent_data: Dict, api_results: Dict) -> str:
        """
        Converts API results into a natural-language reply.
        Each method handles one intent type cleanly.
        """
        intent = intent_data['intent']

        handlers = {
            'search_product':  self._respond_product_search,
            'add_to_cart':     self._respond_add_to_cart,
            'view_cart':       self._respond_view_cart,
            'place_order':     self._respond_place_order,
            'order_history':   self._respond_order_history,
            'greeting':        lambda _: "Hello! I'm your AI shopping assistant. How can I help you find products today?",
            'other':           lambda _: "I'm here to help you shop! Ask me to find products, add items to cart, or check your orders.",
        }

        handler = handlers.get(intent, handlers['other'])
        return handler(api_results)

    def _respond_product_search(self, results: Dict) -> str:
        products = results.get('products', [])
        if not products:
            return "I couldn't find products matching your criteria. Try different keywords or a higher budget."

        lines = [f"I found {len(products)} products for you:\n"]
        for i, p in enumerate(products[:3], 1):
            lines.append(f"{i}. **{p['name']}** by {p.get('brand', '')}")
            lines.append(f"   Price: ₹{p['price']}")
            lines.append(f"   Rating: {p.get('rating', 'N/A')}/5 ({p.get('reviewCount', 0)} reviews)")
            if not p.get('isAvailable', True):
                lines.append("   ⚠️ Currently out of stock")
            lines.append("")
        lines.append("Would you like me to add any of these to your cart?")
        return "\n".join(lines)

    def _respond_add_to_cart(self, results: Dict) -> str:
        if results.get('success'):
            name = results.get('product_name', 'the item')
            return f"Great! I've added **{name}** to your cart. Would you like to continue shopping or proceed to checkout?"
        return "I couldn't add that item — it might be out of stock. Want me to find a similar product?"

    def _respond_view_cart(self, results: Dict) -> str:
        cart = results.get('cart', {})
        items = cart.get('items', [])
        if not items:
            return "Your cart is currently empty. Would you like me to help you find some products?"

        lines = [f"You have {len(items)} items in your cart:\n"]
        total = 0
        for item in items:
            price = item['price']
            qty = item['quantity']
            lines.append(f"• {item['productName']} — ₹{price} × {qty}")
            total += price * qty
        lines.append(f"\n**Total: ₹{total:,.0f}**")
        lines.append("\nReady to checkout?")
        return "\n".join(lines)

    def _respond_place_order(self, results: Dict) -> str:
        if results.get('success'):
            order_number = results.get('order_number', '')
            return f"Your order #{order_number} has been placed successfully! I'll redirect you to payment now."
        return "There was an issue placing your order. Please try again or contact support."

    def _respond_order_history(self, results: Dict) -> str:
        orders = results.get('orders', [])
        if not orders:
            return "You don't have any previous orders yet."

        lines = ["Here are your recent orders:\n"]
        for order in orders[:5]:
            lines.append(f"• Order #{order['orderNumber']} — ₹{order['totalAmount']}")
            lines.append(f"  Status: {order['status']} | Date: {order['createdAt']}\n")
        return "\n".join(lines)