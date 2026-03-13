"""
orchestrator.py  (v3)
=====================
Coordinates LLMAgent ↔ APIClient ↔ AIChatController (/api/ai/*).
Key change from v2: jwt_token comes from ChatRequest and is forwarded
to APIClient so every .NET call is authenticated as the correct user.
No userId plumbing needed — the .NET controller reads the user from the JWT.
"""

import os
import logging
from typing import Dict, Any, Optional

from models import ChatRequest, ChatResponse
from llm_agent import LLMAgent
from api_client import APIClient

logger = logging.getLogger(__name__)

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:5033/api")


class ShoppingAgentOrchestrator:
    """
    Entry point for every chat message.
    Flow:
      1. Build APIClient with the user's JWT (from request.jwt_token)
      2. Extract intent via LLMAgent
      3. Execute the intent against /api/ai/* endpoints
      4. Generate a natural-language reply
      5. Return ChatResponse (response text + optional product list)
    """

    def __init__(self):
        self.llm_agent = LLMAgent()
        logger.info("✅ ShoppingAgentOrchestrator ready")

    async def process_message(self, request: ChatRequest) -> ChatResponse:
        # Build per-request API client with the user's token
        token      = request.jwt_token or ""

        # JWT diagnostics
        if not token:
            logger.warning("⚠️  NO JWT TOKEN received — /api/ai/* calls will return 401")
        else:
            logger.info(f"🔑 JWT received: ...{token[-12:]} (last 12 chars)")

        api_client = APIClient(API_BASE_URL, token)

        # Convert Message objects to plain dicts for the LLM agent
        history = [{"role": m.role, "content": m.content} for m in request.history]

        # 1. Intent extraction
        intent_data = self.llm_agent.extract_intent(request.message, history)
        logger.info(f"🎯 Intent: {intent_data['intent']} | params: {intent_data.get('parameters', {})}")

        # 2. Execute intent
        api_result = await self._execute_intent(intent_data, api_client)

        # API result diagnostics
        logger.info(
            f"📦 API result: success={api_result.get('success')} | "
            f"message={str(api_result.get('message', ''))[:80]} | "
            f"data_preview={str(api_result.get('data'))[:150]}"
        )

        # 3. Generate reply
        response_text = self.llm_agent.generate_response(intent_data, api_result)

        # 4. Extract product list for the frontend product cards (if any)
        products = None
        if intent_data['intent'] in ('search_product', 'compare_products'):
            data = api_result.get('data')
            if isinstance(data, list):
                products = data
            elif isinstance(data, dict):
                products = data.get('products')

        return ChatResponse(
            response=response_text,
            action=intent_data['intent'],
            data=api_result.get('data'),
            products=products,
        )

    async def _execute_intent(
        self,
        intent_data: Dict[str, Any],
        api_client: APIClient,
    ) -> Dict[str, Any]:
        """
        Routes intent to the correct /api/ai/* endpoint.
        Always returns { success, message, data } from APIClient.
        """
        intent = intent_data['intent']
        params = intent_data.get('parameters', {})

        # ── Search ────────────────────────────────────────────────
        if intent == 'search_product':
            query = (
                params.get('query') or
                params.get('category') or
                params.get('features') or
                ''
            )
            return api_client.search_products(query=query, top_k=5)

        # ── Compare ───────────────────────────────────────────────
        elif intent == 'compare_products':
            ids = params.get('product_ids', [])
            if len(ids) < 2:
                return {
                    'success': False,
                    'message': 'I need at least 2 product IDs to compare. Please share which products you want to compare.',
                    'data': None
                }
            return api_client.compare_products(ids)

        # ── Add to cart ───────────────────────────────────────────
        elif intent == 'add_to_cart':
            product_id = params.get('product_id')
            query      = params.get('query') or params.get('product_name') or ''

            # If LLM gave a name instead of a MongoDB ID, search for the product
            if not self._is_mongo_id(product_id) and query:
                search  = api_client.search_products(query=query, top_k=1)
                results = (search.get('data') or [])
                if results:
                    product_id = results[0].get('id')
                    logger.info(f"🔍 Resolved '{query}' → ID: {product_id}")

            if not product_id or not self._is_mongo_id(product_id):
                return {'success': False,
                        'message': f"I couldn't find a product matching '{query}'. Try searching first.",
                        'data': None}
            return api_client.add_to_cart(product_id, quantity=params.get('quantity', 1))

        elif intent == 'remove_from_cart':
            product_id   = params.get('product_id')
            product_name = params.get('product_name') or params.get('query') or ''

            # If no valid MongoDB ID, look up item in cart by name
            if not self._is_mongo_id(product_id):
                cart_result = api_client.get_cart()
                cart_items  = (cart_result.get('data') or {}).get('items') or []
                matched     = self._find_cart_item_by_name(cart_items, product_name)
                if matched:
                    product_id = self._get_product_id(matched)
                    logger.info(f"🛒 Matched '{product_name}' → productId: {product_id} | item keys: {list(matched.keys())}")
                else:
                    names = ', '.join(i.get('productName','?') for i in cart_items)
                    return {'success': False,
                            'message': f"Couldn't find '{product_name}' in cart. Cart has: {names}",
                            'data': None}

            if not product_id:
                return {'success': False,
                        'message': 'Which item would you like to remove?',
                        'data': None}
            return api_client.remove_from_cart(product_id)

        elif intent == 'view_cart':
            return api_client.get_cart()

        # ── Place order ───────────────────────────────────────────
        elif intent == 'place_order':
            address_id = params.get('shipping_address_id')

            if not address_id:
                # Strategy 1: try dedicated default address endpoint
                logger.info("🏠 Fetching default address...")
                addr_result = api_client.get_default_address()
                logger.info(f"🏠 get_default_address → success={addr_result.get('success')} data={str(addr_result.get('data'))[:200]}")

                if addr_result.get('success') and addr_result.get('data'):
                    addr_data  = addr_result['data']
                    address_id = (addr_data.get('id') or addr_data.get('Id') or addr_data.get('_id') or '')
                    logger.info(f"🏠 Default address resolved: {address_id}")

            if not address_id:
                # Strategy 2: get all addresses, pick the first one
                logger.info("🏠 No default — fetching all addresses as fallback...")
                all_addr = api_client.get_addresses()
                logger.info(f"🏠 get_addresses → success={all_addr.get('success')} data={str(all_addr.get('data'))[:300]}")

                addresses = all_addr.get('data') or []
                if isinstance(addresses, list) and addresses:
                    best = next((a for a in addresses if a.get('isDefault') or a.get('IsDefault')), addresses[0])
                    address_id = (best.get('id') or best.get('Id') or best.get('_id') or '')
                    logger.info(f"🏠 Fallback address resolved: {address_id} from {len(addresses)} addresses")

            if not address_id:
                logger.warning("🏠 No address found at all — user has no saved addresses")
                return {
                    'success': False,
                    'message': 'No shipping address found. Please add one from Profile → Addresses, then try again.',
                    'data': None
                }

            logger.info(f"🛒 Placing order with address_id={address_id}")
            return api_client.place_order(address_id)

        # ── Order history ─────────────────────────────────────────
        elif intent == 'order_history':
            return api_client.get_orders()

        # ── Cancel order ──────────────────────────────────────────
        elif intent == 'cancel_order':
            order_id = params.get('order_id')
            if not order_id:
                return {
                    'success': False,
                    'message': 'Please share the order number you want to cancel (e.g. ORD-20260301-XXXX).',
                    'data': None
                }
            return api_client.cancel_order(order_id)

        # ── Context (session bootstrap) ───────────────────────────
        elif intent == 'get_context':
            return api_client.get_context()

        # ── Greeting / other ──────────────────────────────────────
        else:
            return {'success': True, 'message': 'ok', 'data': None}

    # ── Helper utilities ──────────────────────────────────────────────────────

    @staticmethod
    def _is_mongo_id(value: str) -> bool:
        """Returns True if value looks like a 24-char MongoDB ObjectId."""
        import re
        return bool(value and re.match(r'^[0-9a-f]{24}$', str(value), re.IGNORECASE))

    @staticmethod
    def _get_product_id(item: dict) -> str:
        """Extract product ID from a cart item — handles different field name casings."""
        return (
            item.get('productId') or
            item.get('ProductId') or
            item.get('product_id') or
            item.get('id') or
            item.get('Id') or
            ''
        )

    @staticmethod
    def _find_cart_item_by_name(cart_items: list, name: str) -> dict:
        """
        Fuzzy-match a cart item by product name.
        Returns the first item whose productName contains all words from `name`.
        """
        if not name or not cart_items:
            return None
        name_lower = name.lower()
        # Filter out short/common words
        words = [w for w in name_lower.split() if len(w) > 2]
        # Try matching all words
        for item in cart_items:
            item_name = (item.get('productName') or item.get('ProductName') or '').lower()
            if all(w in item_name for w in words):
                return item
        # Fallback: match on first significant word
        if words:
            for item in cart_items:
                item_name = (item.get('productName') or item.get('ProductName') or '').lower()
                if words[0] in item_name:
                    return item
        return None