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
        api_client = APIClient(API_BASE_URL, token)

        # Convert Message objects to plain dicts for the LLM agent
        history = [{"role": m.role, "content": m.content} for m in request.history]

        # 1. Intent extraction
        intent_data = self.llm_agent.extract_intent(request.message, history)
        logger.info(f"🎯 Intent: {intent_data['intent']} | params: {intent_data.get('parameters', {})}")

        # 2. Execute intent
        api_result = await self._execute_intent(intent_data, api_client)

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
            if not product_id:
                return {
                    'success': False,
                    'message': 'Which product would you like to add? Please share its name or ID.',
                    'data': None
                }
            return api_client.add_to_cart(product_id, quantity=params.get('quantity', 1))

        # ── Remove from cart ──────────────────────────────────────
        elif intent == 'remove_from_cart':
            product_id = params.get('product_id')
            if not product_id:
                return {
                    'success': False,
                    'message': 'Which item would you like to remove from your cart?',
                    'data': None
                }
            return api_client.remove_from_cart(product_id)

        # ── View cart ─────────────────────────────────────────────
        elif intent == 'view_cart':
            return api_client.get_cart()

        # ── Place order ───────────────────────────────────────────
        elif intent == 'place_order':
            # address_id is optional — backend auto-resolves default
            return api_client.place_order(params.get('shipping_address_id'))

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