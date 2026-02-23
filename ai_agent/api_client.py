"""
api_client.py
HTTP client that talks to your .NET backend APIs.
All endpoint paths updated to match your MongoDB routes (/mongo/...).

Follows Dependency Inversion: depends on API contracts, not implementation details.
If a route changes in .NET, only this file needs updating.
"""

import requests
from typing import List, Dict, Any, Optional


class APIClient:
    """
    Communicates with your .NET backend on behalf of the agent.
    Instantiated per-request with the user's JWT token.
    """

    def __init__(self, base_url: str, jwt_token: str):
        self.base_url = base_url.rstrip('/')
        self.headers = {
            'Authorization': f'Bearer {jwt_token}',
            'Content-Type': 'application/json'
        }
        self.timeout = 10   # seconds per request

    def _get(self, path: str, params: dict = None) -> Dict[str, Any]:
        """Internal GET helper with uniform error handling."""
        try:
            resp = requests.get(
                f"{self.base_url}{path}",
                params=params,
                headers=self.headers,
                timeout=self.timeout
            )
            resp.raise_for_status()
            return {'success': True, 'data': resp.json()}
        except requests.exceptions.RequestException as e:
            return {'success': False, 'error': str(e), 'data': None}

    def _post(self, path: str, payload: dict = None) -> Dict[str, Any]:
        """Internal POST helper with uniform error handling."""
        try:
            resp = requests.post(
                f"{self.base_url}{path}",
                json=payload or {},
                headers=self.headers,
                timeout=self.timeout
            )
            resp.raise_for_status()
            return {'success': True, 'data': resp.json()}
        except requests.exceptions.RequestException as e:
            return {'success': False, 'error': str(e), 'data': None}

    # ── Product Search ─────────────────────────────────────────────────────────

    def search_products(
        self,
        category: Optional[str] = None,
        max_price: Optional[float] = None,
        features: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Calls GET /mongo/products/search
        Returns products matching query + optional filters.
        """
        params = {}
        if category:
            params['query'] = category
        if max_price:
            params['maxPrice'] = max_price
        if features:
            params['features'] = features

        result = self._get('/mongo/products/search', params)

        if result['success']:
            return {'success': True, 'products': result['data']}
        return result

    def get_product_by_id(self, product_id: str) -> Dict[str, Any]:
        """Calls GET /mongo/products/{id}"""
        result = self._get(f'/mongo/products/{product_id}')
        if result['success']:
            return {'success': True, 'product': result['data']}
        return result

    # ── Cart ──────────────────────────────────────────────────────────────────

    def view_cart(self, user_id: str) -> Dict[str, Any]:
        """Calls GET /mongo/cart/user/{userId}"""
        result = self._get(f'/mongo/cart/user/{user_id}')
        if result['success']:
            return {'success': True, 'cart': result['data']}
        return result

    def add_to_cart(self, user_id: str, product_id: str, quantity: int = 1) -> Dict[str, Any]:
        """Calls POST /mongo/cart/user/{userId}/items"""
        result = self._post(
            f'/mongo/cart/user/{user_id}/items',
            {'productId': product_id, 'quantity': quantity}
        )
        if result['success']:
            return {'success': True, 'cart': result['data']}
        return result

    def update_cart_item(self, user_id: str, product_id: str, quantity: int) -> Dict[str, Any]:
        """Calls PUT /mongo/cart/user/{userId}/items/{productId}"""
        try:
            resp = requests.put(
                f"{self.base_url}/mongo/cart/user/{user_id}/items/{product_id}",
                json={'quantity': quantity},
                headers=self.headers,
                timeout=self.timeout
            )
            resp.raise_for_status()
            return {'success': True, 'data': resp.json()}
        except requests.exceptions.RequestException as e:
            return {'success': False, 'error': str(e)}

    def remove_from_cart(self, user_id: str, product_id: str) -> Dict[str, Any]:
        """Calls DELETE /mongo/cart/user/{userId}/items/{productId}"""
        try:
            resp = requests.delete(
                f"{self.base_url}/mongo/cart/user/{user_id}/items/{product_id}",
                headers=self.headers,
                timeout=self.timeout
            )
            resp.raise_for_status()
            return {'success': True}
        except requests.exceptions.RequestException as e:
            return {'success': False, 'error': str(e)}

    # ── Orders ────────────────────────────────────────────────────────────────

    def confirm_order(self, shipping_address_id: str) -> Dict[str, Any]:
        """Calls POST /mongo/order/confirm"""
        result = self._post('/mongo/order/confirm', {'shippingAddressId': shipping_address_id})
        if result['success']:
            data = result['data']
            return {
                'success': True,
                'order_number': data.get('orderNumber'),
                'order_id': data.get('id') or data.get('_id')
            }
        return result

    def get_order_history(self) -> Dict[str, Any]:
        """Calls GET /mongo/order/history"""
        result = self._get('/mongo/order/history')
        if result['success']:
            return {'success': True, 'orders': result['data']}
        return result

    def get_order_by_id(self, order_id: str) -> Dict[str, Any]:
        """Calls GET /mongo/order/{orderId}"""
        result = self._get(f'/mongo/order/{order_id}')
        if result['success']:
            return {'success': True, 'order': result['data']}
        return result

    # ── Addresses ─────────────────────────────────────────────────────────────

    def get_addresses(self) -> Dict[str, Any]:
        """Calls GET /MongoAddress"""
        result = self._get('/MongoAddress')
        if result['success']:
            return {'success': True, 'addresses': result['data']}
        return result

    def get_default_address(self, user_id: str) -> Dict[str, Any]:
        """Calls GET /MongoAddress/default/{userId}"""
        result = self._get(f'/MongoAddress/default/{user_id}')
        if result['success']:
            return {'success': True, 'address': result['data']}
        return result

    # ── Recommendations ───────────────────────────────────────────────────────

    def get_trending_products(self, limit: int = 10) -> Dict[str, Any]:
        """Calls GET /mongo/recommendations/trending"""
        result = self._get('/mongo/recommendations/trending', {'limit': limit})
        if result['success']:
            return {'success': True, 'products': result['data']}
        return result

    def get_related_products(self, product_id: str, limit: int = 5) -> Dict[str, Any]:
        """Calls GET /mongo/recommendations/related/{productId}"""
        result = self._get(f'/mongo/recommendations/related/{product_id}', {'limit': limit})
        if result['success']:
            return {'success': True, 'products': result['data']}
        return result