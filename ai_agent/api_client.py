"""
api_client.py  (v2 — AI Controller Edition)
============================================
HTTP client that talks exclusively to /api/ai/* on your .NET backend.
All cart, order, address, and product calls go through the new AIChatController,
which returns a consistent { success, message, data } wrapper.

To plug in a real base URL, set API_BASE_URL in your .env file.
"""

import logging
import requests
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


class APIClient:
    """
    Communicates with the .NET AIChatController on behalf of the agent.
    Instantiated per-request with the user's JWT token.

    All methods return:
        { 'success': bool, 'message': str, 'data': <payload> }
    """

    def __init__(self, base_url: str, jwt_token: str):
        self.base_url = base_url.rstrip('/')
        self.headers = {
            'Authorization': f'Bearer {jwt_token}',
            'Content-Type': 'application/json'
        }
        self.timeout = 60   # seconds — Render.com free tier cold-start can take 40-60s

    # ── Internal HTTP Helpers ─────────────────────────────────────────────────

    def _get(self, path: str, params: dict = None) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        try:
            resp = requests.get(url, params=params, headers=self.headers, timeout=self.timeout)
            logger.info(f"GET {path} → {resp.status_code}")
            if not resp.ok:
                logger.error(f"GET {path} FAILED {resp.status_code}: {resp.text[:500]}")
                try:
                    err_body = resp.json()
                    msg = (err_body.get('message') or err_body.get('title') or
                           err_body.get('detail') or str(err_body))
                except Exception:
                    msg = resp.text[:300]
                return {'success': False, 'message': f"[{resp.status_code}] {msg}", 'data': None}
            return resp.json()
        except requests.exceptions.Timeout:
            logger.error(f"GET {path} TIMEOUT after {self.timeout}s")
            return {'success': False, 'message': f'Request timed out. Please try again.', 'data': None}
        except requests.exceptions.RequestException as e:
            logger.error(f"GET {path} ERROR: {e}")
            return {'success': False, 'message': str(e), 'data': None}

    def _post(self, path: str, payload: dict = None) -> Dict[str, Any]:
        url = f"{self.base_url}{path}"
        try:
            resp = requests.post(
                url,
                json=payload or {},
                headers=self.headers,
                timeout=self.timeout
            )
            logger.info(f"POST {path} → {resp.status_code}")
            if not resp.ok:
                # Log full response body so we can see the .NET error message
                logger.error(f"POST {path} FAILED {resp.status_code}: {resp.text[:500]}")
                try:
                    err_body = resp.json()
                    msg = (err_body.get('message') or
                           err_body.get('title') or
                           err_body.get('detail') or
                           str(err_body))
                except Exception:
                    msg = resp.text[:300]
                return {'success': False, 'message': f"[{resp.status_code}] {msg}", 'data': None}
            return resp.json()
        except requests.exceptions.Timeout:
            logger.error(f"POST {path} TIMEOUT after {self.timeout}s")
            return {'success': False, 'message': f'Request timed out ({self.timeout}s). Please try again.', 'data': None}
        except requests.exceptions.RequestException as e:
            logger.error(f"POST {path} ERROR: {e}")
            return {'success': False, 'message': str(e), 'data': None}

    def _put(self, path: str, params: dict = None) -> Dict[str, Any]:
        try:
            resp = requests.put(
                f"{self.base_url}{path}",
                params=params,
                headers=self.headers,
                timeout=self.timeout
            )
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.HTTPError as e:
            return {'success': False, 'message': str(e), 'data': None}
        except requests.exceptions.RequestException as e:
            return {'success': False, 'message': str(e), 'data': None}

    def _delete(self, path: str) -> Dict[str, Any]:
        try:
            resp = requests.delete(
                f"{self.base_url}{path}",
                headers=self.headers,
                timeout=self.timeout
            )
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.HTTPError as e:
            return {'success': False, 'message': str(e), 'data': None}
        except requests.exceptions.RequestException as e:
            return {'success': False, 'message': str(e), 'data': None}

    # ── Context (session bootstrap) ───────────────────────────────────────────

    def warmup(self) -> bool:
        """
        GET /ai/cart — lightweight ping to wake up Render.com free tier.
        Called once at agent startup so the first real user request is fast.
        Returns True if the server responded.
        """
        try:
            resp = requests.get(
                f"{self.base_url}/ai/cart",
                headers=self.headers,
                timeout=90   # allow full cold-start time
            )
            logger.info(f"🔥 Warmup ping → {resp.status_code}")
            return resp.ok
        except Exception as e:
            logger.warning(f"🔥 Warmup ping failed (server may be starting): {e}")
            return False

    def get_context(self) -> Dict[str, Any]:
        """
        GET /ai/context
        Returns cart + addresses + recent orders + user info in one call.
        Call once at the start of each chat session.

        data: {
          userId, userName, userEmail,
          cart: { items, total, isEmpty },
          addresses: [...],
          defaultAddress: {...} | null,
          recentOrders: [...]
        }
        """
        return self._get('/ai/context')

    # ── Products ──────────────────────────────────────────────────────────────

    def search_products(
        self,
        query: str,
        top_k: int = 5
    ) -> Dict[str, Any]:
        """
        GET /ai/products/search?q=...&topK=...
        Semantic vector search via MongoDB Atlas.

        data: list of products with { id, name, brand, price, category,
                                      description, imageUrl, stockQuantity,
                                      isAvailable, rating, reviewCount }
        """
        return self._get('/ai/products/search', {'q': query, 'topK': top_k})

    def get_product(self, product_id: str) -> Dict[str, Any]:
        """
        GET /ai/products/{id}
        Full detail for a single product.
        """
        return self._get(f'/ai/products/{product_id}')

    def compare_products(self, product_ids: List[str]) -> Dict[str, Any]:
        """
        POST /ai/products/compare
        Body: { productIds: ['id1', 'id2', ...] }

        data: {
          products: [...],
          highlights: ['💰 Product A is cheapest...', '⭐ Product B rated highest...']
        }
        The highlights list is ready to paste into the chat response verbatim.
        """
        return self._post('/ai/products/compare', {'productIds': product_ids})

    # ── Cart ──────────────────────────────────────────────────────────────────

    def get_cart(self) -> Dict[str, Any]:
        """
        GET /ai/cart
        data: { cartId, items, total, totalItems, isEmpty }
        """
        return self._get('/ai/cart')

    def add_to_cart(self, product_id: str, quantity: int = 1) -> Dict[str, Any]:
        """
        POST /ai/cart/add
        Body: { productId, quantity }
        data: updated cart
        """
        return self._post('/ai/cart/add', {'productId': product_id, 'quantity': quantity})

    def update_cart_item(self, product_id: str, quantity: int) -> Dict[str, Any]:
        """
        PUT /ai/cart/update/{productId}?qty={quantity}
        data: updated cart
        """
        return self._put(f'/ai/cart/update/{product_id}', params={'qty': quantity})

    def remove_from_cart(self, product_id: str) -> Dict[str, Any]:
        """
        DELETE /ai/cart/remove/{productId}
        data: updated cart
        """
        return self._delete(f'/ai/cart/remove/{product_id}')

    def clear_cart(self) -> Dict[str, Any]:
        """DELETE /ai/cart/clear"""
        return self._delete('/ai/cart/clear')

    # ── Orders ────────────────────────────────────────────────────────────────

    def get_orders(self) -> Dict[str, Any]:
        """
        GET /ai/orders
        data: list of orders with items, newest first
        """
        return self._get('/ai/orders')

    def get_order(self, order_id: str) -> Dict[str, Any]:
        """GET /ai/orders/{orderId}"""
        return self._get(f'/ai/orders/{order_id}')

    def place_order(self, shipping_address_id: Optional[str] = None) -> Dict[str, Any]:
        """
        POST /ai/orders/place
        IMPORTANT: Do NOT retry this call — CreateOrderAsync is not idempotent.
        A timeout means Render is slow, not that the order failed.
        Timeout = 90s to survive Render cold-start (~60s).
        """
        payload = {}
        if shipping_address_id:
            payload['shippingAddressId'] = shipping_address_id
        url = f"{self.base_url}/ai/orders/place"
        logger.info(f"place_order → {url} | address={shipping_address_id}")
        try:
            resp = requests.post(url, json=payload, headers=self.headers, timeout=90)
            logger.info(f"POST /ai/orders/place → {resp.status_code}")

            if not resp.ok:
                logger.error(f"POST /ai/orders/place FAILED {resp.status_code}: {resp.text[:500]}")
                try:
                    err = resp.json()
                    msg = err.get('message') or err.get('title') or err.get('detail') or str(err)
                except Exception:
                    msg = resp.text[:300]
                # Special case: cart empty after timeout means order was already placed
                if 'cart' in msg.lower() and 'empty' in msg.lower():
                    return {
                        'success': True,
                        'message': 'Your order was placed successfully! (Cart has been cleared)',
                        'data': {'orderNumber': 'Check Orders page', 'status': 'Pending'}
                    }
                return {'success': False, 'message': msg, 'data': None}

            return resp.json()

        except requests.exceptions.Timeout:
            logger.error("place_order TIMED OUT after 90s — order may have been placed on server")
            # Do NOT retry — the order may have been created even though we timed out.
            # Tell user to check their Orders page.
            return {
                'success': True,
                'message': (
                    "Your order is being processed! Render took longer than expected to respond. "
                    "Please check your **Orders** page in a moment to confirm."
                ),
                'data': {'orderNumber': 'Check Orders page', 'status': 'Processing'}
            }

        except requests.exceptions.RequestException as e:
            logger.error(f"place_order ERROR: {e}")
            return {'success': False, 'message': str(e), 'data': None}


    def cancel_order(self, order_id: str) -> Dict[str, Any]:
        """POST /ai/orders/{orderId}/cancel"""
        return self._post(f'/ai/orders/{order_id}/cancel')

    # ── Addresses ─────────────────────────────────────────────────────────────

    def get_addresses(self) -> Dict[str, Any]:
        """
        GET /ai/addresses
        data: list of addresses with { id, label, fullAddress, city, isDefault }
        """
        return self._get('/ai/addresses')

    def get_default_address(self) -> Dict[str, Any]:
        """
        GET /ai/addresses/default
        data: single address object or null
        """
        return self._get('/ai/addresses/default')