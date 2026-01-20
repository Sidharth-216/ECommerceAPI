"""
AI Shopping Agent Microservice
Uses open-source pre-trained LLM for conversational shopping
Follows Single Responsibility: Only handles conversation and API orchestration
"""

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import requests
import json
from datetime import datetime

app = FastAPI(title="AI Shopping Agent", version="1.0.0")

# Configuration
API_BASE_URL = "http://localhost:5000/api"
AGENT_API_KEY = "agent-secret-key-12345"

# =====================================
# Models
# =====================================

class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str

class ChatRequest(BaseModel):
    user_id: int
    message: str
    conversation_history: List[ChatMessage] = []
    jwt_token: str

class ChatResponse(BaseModel):
    response: str
    action_taken: Optional[str] = None
    products: Optional[List[Dict[str, Any]]] = None
    requires_confirmation: bool = False


# =====================================
# LLM Integration (Using Function Calling)
# =====================================

class LLMAgent:
    """
    LLM Agent using open-source model
    Example: Mistral 7B with function calling
    In production, use: llama-cpp-python, transformers, or ollama
    """
    
    def __init__(self):
        # Initialize LLM (pseudo-code - replace with actual implementation)
        # self.llm = load_model("mistral-7b-instruct")
        pass
    
    def extract_intent(self, message: str, history: List[ChatMessage]) -> Dict[str, Any]:
        """
        Extract user intent and parameters from message
        Uses LLM to understand natural language
        """
        
        # System prompt for intent extraction
        system_prompt = """You are a shopping assistant. Extract user intent from messages.
        Possible intents: search_product, product_details, add_to_cart, view_cart, 
        place_order, order_history, greeting, other.
        
        Return JSON with: intent, parameters (product_category, budget_max, features, product_id, quantity)
        """
        
        # In real implementation, call LLM here
        # For demonstration, using rule-based extraction
        intent_data = self._rule_based_intent_extraction(message)
        
        return intent_data
    
    def _rule_based_intent_extraction(self, message: str) -> Dict[str, Any]:
        """
        Rule-based intent extraction (fallback/demo)
        In production, LLM handles this better
        """
        message_lower = message.lower()
        
        # Search product intent
        if any(word in message_lower for word in ['find', 'search', 'looking for', 'suggest', 'recommend']):
            intent = {
                'intent': 'search_product',
                'parameters': {}
            }
            
            # Extract budget
            if '₹' in message or 'rupees' in message_lower or 'rs' in message_lower:
                # Extract number (simplified)
                import re
                numbers = re.findall(r'\d+(?:,\d+)*', message)
                if numbers:
                    budget = int(numbers[0].replace(',', ''))
                    intent['parameters']['budget_max'] = budget
            
            # Extract category
            categories = ['smartphone', 'laptop', 'headphone', 'watch', 'tablet']
            for category in categories:
                if category in message_lower:
                    intent['parameters']['category'] = category
                    break
            
            # Extract features
            if 'camera' in message_lower:
                intent['parameters']['features'] = 'camera'
            elif 'battery' in message_lower:
                intent['parameters']['features'] = 'battery'
            elif 'gaming' in message_lower:
                intent['parameters']['features'] = 'gaming'
            
            return intent
        
        # Add to cart
        elif any(word in message_lower for word in ['add', 'cart', 'buy']):
            return {
                'intent': 'add_to_cart',
                'parameters': {}
            }
        
        # View cart
        elif 'cart' in message_lower and 'view' in message_lower:
            return {
                'intent': 'view_cart',
                'parameters': {}
            }
        
        # Place order
        elif any(word in message_lower for word in ['order', 'checkout', 'purchase']):
            return {
                'intent': 'place_order',
                'parameters': {}
            }
        
        # Order history
        elif 'order' in message_lower and 'history' in message_lower:
            return {
                'intent': 'order_history',
                'parameters': {}
            }
        
        # Greeting
        elif any(word in message_lower for word in ['hi', 'hello', 'hey']):
            return {
                'intent': 'greeting',
                'parameters': {}
            }
        
        return {
            'intent': 'other',
            'parameters': {}
        }
    
    def generate_response(self, intent_data: Dict, api_results: Dict) -> str:
        """
        Generate natural language response based on intent and API results
        Uses LLM to create human-like responses
        """
        
        intent = intent_data['intent']
        
        if intent == 'search_product':
            return self._generate_product_search_response(api_results)
        elif intent == 'add_to_cart':
            return self._generate_cart_response(api_results)
        elif intent == 'view_cart':
            return self._generate_view_cart_response(api_results)
        elif intent == 'place_order':
            return self._generate_order_response(api_results)
        elif intent == 'order_history':
            return self._generate_order_history_response(api_results)
        elif intent == 'greeting':
            return "Hello! I'm your shopping assistant. How can I help you find products today?"
        else:
            return "I'm here to help you shop! You can ask me to find products, add items to cart, or check your orders."
    
    def _generate_product_search_response(self, results: Dict) -> str:
        """Generate response for product search"""
        products = results.get('products', [])
        
        if not products:
            return "I couldn't find any products matching your criteria. Could you try different specifications?"
        
        response = f"I found {len(products)} products for you:\n\n"
        
        for i, product in enumerate(products[:3], 1):
            response += f"{i}. **{product['name']}** by {product['brand']}\n"
            response += f"   Price: ₹{product['price']}\n"
            response += f"   Rating: {product['rating']}/5 ({product['reviewCount']} reviews)\n"
            if not product['isAvailable']:
                response += f"   ⚠️ Currently out of stock\n"
            response += "\n"
        
        response += "Would you like me to add any of these to your cart?"
        return response
    
    def _generate_cart_response(self, results: Dict) -> str:
        """Generate response for cart actions"""
        if results.get('success'):
            return f"Great! I've added {results.get('product_name')} to your cart. Would you like to proceed to checkout?"
        return "I couldn't add that item to your cart. It might be out of stock."
    
    def _generate_view_cart_response(self, results: Dict) -> str:
        """Generate response for viewing cart"""
        cart = results.get('cart', {})
        items = cart.get('items', [])
        
        if not items:
            return "Your cart is empty. Would you like me to help you find some products?"
        
        response = f"You have {len(items)} items in your cart:\n\n"
        total = 0
        
        for item in items:
            response += f"• {item['productName']} - ₹{item['price']} x {item['quantity']}\n"
            total += item['price'] * item['quantity']
        
        response += f"\n**Total: ₹{total}**\n\n"
        response += "Ready to checkout?"
        
        return response
    
    def _generate_order_response(self, results: Dict) -> str:
        """Generate response for order placement"""
        if results.get('success'):
            order_number = results.get('order_number')
            return f"Perfect! Your order #{order_number} has been placed successfully. I'll redirect you to payment now."
        return "There was an issue placing your order. Please try again."
    
    def _generate_order_history_response(self, results: Dict) -> str:
        """Generate response for order history"""
        orders = results.get('orders', [])
        
        if not orders:
            return "You don't have any previous orders."
        
        response = f"Here are your recent orders:\n\n"
        
        for order in orders[:5]:
            response += f"• Order #{order['orderNumber']} - ₹{order['totalAmount']}\n"
            response += f"  Status: {order['status']} | Date: {order['createdAt']}\n\n"
        
        return response


# =====================================
# API Client (Calls Backend APIs)
# =====================================

class APIClient:
    """
    API Client to communicate with backend
    Follows Dependency Inversion: Depends on API contracts, not implementations
    """
    
    def __init__(self, base_url: str, jwt_token: str):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {jwt_token}',
            'Content-Type': 'application/json'
        }
    
    def search_products(self, category: str = None, max_price: float = None, 
                       features: str = None) -> Dict[str, Any]:
        """Call Product Search API"""
        params = {}
        if category:
            params['query'] = category
        if max_price:
            params['maxPrice'] = max_price
        
        try:
            response = requests.get(
                f"{self.base_url}/products/search",
                params=params,
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()
            return {'success': True, 'products': response.json()}
        except requests.exceptions.RequestException as e:
            return {'success': False, 'error': str(e)}
    
    def rank_products(self, product_ids: List[int], criteria: Dict) -> Dict[str, Any]:
        """Call Recommendation API for ranking"""
        payload = {
            'productIds': product_ids,
            'criteria': criteria
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/recommendation/rank",
                json=payload,
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()
            return {'success': True, 'ranked_products': response.json()}
        except requests.exceptions.RequestException as e:
            return {'success': False, 'error': str(e)}
    
    def add_to_cart(self, product_id: int, quantity: int = 1) -> Dict[str, Any]:
        """Call Add to Cart API"""
        payload = {
            'productId': product_id,
            'quantity': quantity
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/cart/add",
                json=payload,
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()
            return {'success': True, 'cart': response.json()}
        except requests.exceptions.RequestException as e:
            return {'success': False, 'error': str(e)}
    
    def view_cart(self) -> Dict[str, Any]:
        """Call View Cart API"""
        try:
            response = requests.get(
                f"{self.base_url}/cart/view",
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()
            return {'success': True, 'cart': response.json()}
        except requests.exceptions.RequestException as e:
            return {'success': False, 'error': str(e)}
    
    def confirm_order(self, address_id: int) -> Dict[str, Any]:
        """Call Order Confirm API"""
        payload = {
            'shippingAddressId': address_id
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/order/confirm",
                json=payload,
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()
            return {'success': True, 'order': response.json()}
        except requests.exceptions.RequestException as e:
            return {'success': False, 'error': str(e)}
    
    def get_order_history(self) -> Dict[str, Any]:
        """Call Order History API"""
        try:
            response = requests.get(
                f"{self.base_url}/order/history",
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()
            return {'success': True, 'orders': response.json()}
        except requests.exceptions.RequestException as e:
            return {'success': False, 'error': str(e)}
    
    def check_inventory(self, product_id: int) -> Dict[str, Any]:
        """Call Inventory Status API"""
        try:
            response = requests.get(
                f"{self.base_url}/inventory/status/{product_id}",
                headers=self.headers,
                timeout=10
            )
            response.raise_for_status()
            return {'success': True, 'inventory': response.json()}
        except requests.exceptions.RequestException as e:
            return {'success': False, 'error': str(e)}


# =====================================
# Agent Orchestrator
# =====================================

class ShoppingAgentOrchestrator:
    """
    Main orchestrator that coordinates between LLM and APIs
    Follows Single Responsibility: Handles workflow orchestration only
    """
    
    def __init__(self):
        self.llm_agent = LLMAgent()
    
    async def process_message(self, chat_request: ChatRequest) -> ChatResponse:
        """
        Process user message and return response
        This is the main entry point for agent interaction
        """
        
        # Initialize API client
        api_client = APIClient(API_BASE_URL, chat_request.jwt_token)
        
        # Step 1: Extract intent using LLM
        intent_data = self.llm_agent.extract_intent(
            chat_request.message,
            chat_request.conversation_history
        )
        
        # Step 2: Execute appropriate action based on intent
        api_results = await self._execute_intent(intent_data, api_client)
        
        # Step 3: Generate natural language response
        response_text = self.llm_agent.generate_response(intent_data, api_results)
        
        # Step 4: Prepare response
        chat_response = ChatResponse(
            response=response_text,
            action_taken=intent_data['intent'],
            products=api_results.get('products'),
            requires_confirmation=self._requires_confirmation(intent_data['intent'])
        )
        
        return chat_response
    
    async def _execute_intent(self, intent_data: Dict, api_client: APIClient) -> Dict:
        """Execute API calls based on extracted intent"""
        
        intent = intent_data['intent']
        params = intent_data['parameters']
        
        if intent == 'search_product':
            # Search products
            search_results = api_client.search_products(
                category=params.get('category'),
                max_price=params.get('budget_max'),
                features=params.get('features')
            )
            
            if search_results['success'] and search_results['products']:
                # Rank products using recommendation API
                product_ids = [p['id'] for p in search_results['products']]
                ranking_criteria = {
                    'prioritize_rating': True,
                    'prioritize_availability': True,
                    'feature_preference': params.get('features')
                }
                
                ranked_results = api_client.rank_products(product_ids, ranking_criteria)
                return ranked_results if ranked_results['success'] else search_results
            
            return search_results
        
        elif intent == 'add_to_cart':
            # Note: In real implementation, agent would extract product_id from context
            # For now, assuming it's in conversation history
            product_id = params.get('product_id', 1)  # Default for demo
            return api_client.add_to_cart(product_id, quantity=1)
        
        elif intent == 'view_cart':
            return api_client.view_cart()
        
        elif intent == 'place_order':
            # Note: Address ID should come from user profile or conversation
            address_id = params.get('address_id', 1)  # Default for demo
            return api_client.confirm_order(address_id)
        
        elif intent == 'order_history':
            return api_client.get_order_history()
        
        else:
            return {}
    
    def _requires_confirmation(self, intent: str) -> bool:
        """Check if intent requires user confirmation"""
        confirmation_intents = ['add_to_cart', 'place_order']
        return intent in confirmation_intents


# =====================================
# FastAPI Endpoints
# =====================================

orchestrator = ShoppingAgentOrchestrator()

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Main chat endpoint
    Receives user message and returns AI response
    """
    try:
        response = await orchestrator.process_message(request)
        return response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "AI Shopping Agent"
    }

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "AI Shopping Agent",
        "version": "1.0.0",
        "description": "Conversational shopping assistant powered by LLM"
    }


# =====================================
# Run with: uvicorn main:app --reload --port 5001
# =====================================