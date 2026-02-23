"""
orchestrator.py
Coordinates between LLMAgent (what does the user want?) and
APIClient (go do it). Single Responsibility: workflow only.

No LLM logic here. No HTTP calls here. Just orchestration.
"""

from typing import Dict, Any
from models import ChatRequest, ChatResponse
from llm_agent import LLMAgent
from api_client import APIClient
import os


# Backend URL — reads from .env via os.getenv
API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:5033/api")


class ShoppingAgentOrchestrator:
    """
    Main entry point for processing a user chat message.

    Flow:
        1. Extract intent (LLMAgent)
        2. Call appropriate backend APIs (APIClient)
        3. Generate natural language reply (LLMAgent)
        4. Return structured ChatResponse
    """

    def __init__(self):
        self.llm_agent = LLMAgent()

    async def process_message(self, request: ChatRequest) -> ChatResponse:
        # Build API client for this user's session
        api_client = APIClient(API_BASE_URL, request.jwt_token)

        # Step 1: Understand what the user wants
        intent_data = self.llm_agent.extract_intent(
            request.message,
            request.conversation_history
        )

        # Step 2: Execute the intent against backend APIs
        api_results = await self._execute_intent(
            intent_data,
            api_client,
            user_id=str(request.user_id)
        )

        # Step 3: Convert results into a human-readable reply
        response_text = self.llm_agent.generate_response(intent_data, api_results)

        return ChatResponse(
            response=response_text,
            action_taken=intent_data['intent'],
            products=api_results.get('products'),
            requires_confirmation=self._requires_confirmation(intent_data['intent'])
        )

    async def _execute_intent(
        self,
        intent_data: Dict[str, Any],
        api_client: APIClient,
        user_id: str
    ) -> Dict[str, Any]:
        """
        Routes intent to the right API calls.
        Returns a dict that llm_agent.generate_response() understands.
        """
        intent = intent_data['intent']
        params = intent_data.get('parameters', {})

        # ── Product Search ─────────────────────────────────────────────────
        if intent == 'search_product':
            results = api_client.search_products(
                category=params.get('category'),
                max_price=params.get('budget_max'),
                features=params.get('features')
            )
            return results

        # ── Add to Cart ────────────────────────────────────────────────────
        elif intent == 'add_to_cart':
            product_id = params.get('product_id')
            if not product_id:
                # Can't add without knowing which product — ask LLM to clarify
                return {
                    'success': False,
                    'error': 'product_id_missing',
                    'product_name': None
                }
            return api_client.add_to_cart(user_id, product_id, quantity=1)

        # ── View Cart ──────────────────────────────────────────────────────
        elif intent == 'view_cart':
            return api_client.view_cart(user_id)

        # ── Place Order ────────────────────────────────────────────────────
        elif intent == 'place_order':
            # First fetch default address for the user
            addr_result = api_client.get_default_address(user_id)
            if not addr_result['success']:
                return {'success': False, 'error': 'no_address_found'}

            address = addr_result.get('address', {})
            address_id = address.get('id') or address.get('_id')
            if not address_id:
                return {'success': False, 'error': 'no_address_found'}

            return api_client.confirm_order(str(address_id))

        # ── Order History ──────────────────────────────────────────────────
        elif intent == 'order_history':
            return api_client.get_order_history()

        # ── Greeting / Other ───────────────────────────────────────────────
        else:
            return {}

    def _requires_confirmation(self, intent: str) -> bool:
        """Intents that should ask user 'Are you sure?' before acting."""
        return intent in ('add_to_cart', 'place_order')