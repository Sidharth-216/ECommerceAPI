import React from 'react';
import { ShoppingCart, LogOut, Plus, Minus, Trash2, ShoppingBag, Package, ArrowLeft } from 'lucide-react';

const CartPage = ({
  user,
  cart,
  setCurrentPage,
  handleLogout,
  updateCartQuantity,
  removeFromCart,
  setError
}) => {
  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const savings = cart.reduce((sum, item) => sum + (item.price * 0.2 * item.quantity), 0); // 20% discount simulation

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header - Teal Theme */}
      <header className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap gap-3 justify-between items-center">
          <button 
            onClick={() => setCurrentPage('products')} 
            className="flex items-center gap-2 text-white hover:bg-white/20 px-3 sm:px-4 py-2 rounded-lg font-semibold transition-all group"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm sm:text-base">Continue Shopping</span>
          </button>
          
          <div className="flex items-center gap-3">
            <ShoppingCart className="w-7 h-7" />
            <h1 className="text-lg sm:text-2xl font-bold">Shopping Cart</h1>
          </div>
          
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-2 px-4 py-2 bg-coral-500 hover:bg-coral-600 rounded-lg transition-all font-semibold"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {cart.length === 0 ? (
          // Empty Cart State
          <div className="bg-white rounded-xl shadow-md p-8 sm:p-16 text-center">
            <div className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-16 h-16 text-teal-600" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 mb-3">Your cart is empty</h2>
            <p className="text-slate-600 mb-8 text-lg">Add some amazing products to get started!</p>
            <button 
              onClick={() => setCurrentPage('products')} 
              className="bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white px-8 py-4 rounded-lg font-bold text-lg transition-all hover:shadow-lg inline-flex items-center gap-2"
            >
              <ShoppingBag className="w-5 h-5" />
              Start Shopping
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Cart Items Section */}
            <div className="lg:col-span-2 space-y-6">
              {/* Cart Header */}
              <div className="bg-white rounded-lg shadow-md p-6 border border-slate-200">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Cart Items</h2>
                    <p className="text-sm text-slate-600 mt-1">{cart.length} {cart.length === 1 ? 'item' : 'items'} in your cart</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-600">You're saving</p>
                    <p className="text-lg font-bold text-emerald-600">₹{savings.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Cart Items List */}
              <div className="bg-white rounded-lg shadow-md overflow-hidden border border-slate-200">
                {cart.map((item, idx) => {
                  const itemId = item.productIdString || item.productId;
                  const originalPrice = item.price * 1.2; // Simulated original price
                  
                  return (
                    <div 
                      key={itemId} 
                      className={`p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start hover:bg-teal-50/50 transition-all duration-300 ${idx !== cart.length - 1 ? 'border-b border-slate-200' : ''}`}
                    >
                      {/* Product Image */}
                      <div className="w-24 h-24 sm:w-32 sm:h-32 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200">
                        <img 
                          src={item.imageUrl || 'https://via.placeholder.com/150'} 
                          alt={item.productName} 
                          className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                          onError={(e) => {
                            e.currentTarget.src = 'https://via.placeholder.com/150/f1f5f9/94a3b8?text=Product';
                          }}
                        />
                      </div>

                      {/* Product Details */}
                      <div className="flex-1 w-full">
                        <div className="flex justify-between items-start mb-3 gap-3">
                          <div>
                            <h3 className="font-bold text-lg text-slate-900 mb-1">{item.productName}</h3>
                            <p className="text-sm text-slate-500">In Stock</p>
                          </div>
                          <button 
                            onClick={() => {
                              console.log('Delete clicked:', { itemId });
                              removeFromCart(itemId, setError);
                            }} 
                            className="p-2 hover:bg-coral-50 rounded-lg transition-all group"
                            title="Remove item"
                          >
                            <Trash2 className="w-5 h-5 text-slate-400 group-hover:text-coral-600 transition-colors" />
                          </button>
                        </div>

                        {/* Price Section */}
                        <div className="mb-4">
                          <div className="flex items-baseline gap-3 mb-1">
                            <span className="text-2xl font-bold text-slate-900">₹{item.price.toLocaleString()}</span>
                            <span className="text-sm text-slate-500 line-through">₹{originalPrice.toLocaleString()}</span>
                            <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">20% OFF</span>
                          </div>
                          <p className="text-xs text-slate-600">Price per unit</p>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                          <div className="flex items-center gap-3 bg-slate-100 rounded-lg p-1 border border-slate-200">
                            <button 
                              onClick={() => {
                                console.log('Decrement clicked:', { itemId, quantity: item.quantity - 1 });
                                updateCartQuantity(itemId, item.quantity - 1, setError);
                              }} 
                              disabled={item.quantity <= 1}
                              className="p-2 hover:bg-white rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Minus className="w-4 h-4 text-slate-700 hover:text-teal-600" />
                            </button>
                            <span className="font-bold text-lg min-w-[3rem] text-center text-slate-900">{item.quantity}</span>
                            <button 
                              onClick={() => {
                                console.log('Increment clicked:', { itemId, quantity: item.quantity + 1 });
                                updateCartQuantity(itemId, item.quantity + 1, setError);
                              }} 
                              className="p-2 hover:bg-white rounded-md transition-all"
                            >
                              <Plus className="w-4 h-4 text-slate-700 hover:text-teal-600" />
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-2 text-sm">
                            <span className="text-slate-600">Subtotal:</span>
                            <span className="font-bold text-lg text-teal-600">₹{(item.price * item.quantity).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Free Shipping Banner */}
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 border-2 border-emerald-200 rounded-lg p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-bold text-emerald-900">Congratulations! You've got FREE shipping!</p>
                  <p className="text-sm text-emerald-700">Your order qualifies for free delivery</p>
                </div>
              </div>
            </div>

            {/* Order Summary Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow-lg p-6 border border-slate-200 lg:sticky lg:top-24 space-y-6">
                <h3 className="text-xl font-bold text-slate-900 pb-4 border-b border-slate-200">Order Summary</h3>
                
                {/* Price Breakdown */}
                <div className="space-y-4">
                  <div className="flex justify-between text-slate-700">
                    <span>Subtotal ({cart.length} {cart.length === 1 ? 'item' : 'items'})</span>
                    <span className="font-semibold">₹{(total + savings).toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between text-emerald-600">
                    <span className="flex items-center gap-1">
                      Discount
                      <span className="text-xs bg-emerald-100 px-2 py-0.5 rounded">20%</span>
                    </span>
                    <span className="font-semibold">-₹{savings.toLocaleString()}</span>
                  </div>
                  
                  <div className="flex justify-between text-slate-700">
                    <span>Shipping</span>
                    <span className="font-semibold text-emerald-600">FREE</span>
                  </div>
                  
                  <div className="flex justify-between text-slate-700">
                    <span>Estimated Tax</span>
                    <span className="font-semibold">₹0</span>
                  </div>
                </div>

                {/* Total */}
                <div className="pt-4 border-t-2 border-slate-200">
                  <div className="flex justify-between items-center bg-gradient-to-r from-teal-50 to-cyan-50 p-4 rounded-lg border border-teal-200">
                    <span className="text-lg font-bold text-slate-900">Total Amount</span>
                    <span className="text-3xl font-bold text-teal-600">₹{total.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-center text-slate-500 mt-2">Inclusive of all taxes</p>
                </div>

                {/* Action Buttons */}
                        <div className="space-y-3">
                          <button 
                          onClick={() => setCurrentPage('checkout')} 
                          className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white py-4 rounded-lg font-bold text-lg transition-all hover:shadow-lg flex items-center justify-center gap-2"
                          >
                          Proceed to Checkout
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" />
                          </svg>
                          </button>

                          <button 
                          onClick={() => setCurrentPage('products')} 
                          className="w-full border-2 border-slate-300 text-slate-700 hover:border-teal-400 hover:bg-teal-50 py-3 rounded-lg font-semibold transition-all"
                          >
                          Continue Shopping
                          </button>
                        </div>

                        {/* Trust Badges */}
                <div className="pt-6 border-t border-slate-200 space-y-3">
                  <p className="text-sm font-bold text-slate-900 mb-3">Why buy from us?</p>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-emerald-600">✓</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Free Returns</p>
                      <p className="text-xs text-slate-600">Within 7 days of delivery</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-teal-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-teal-600">🔒</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Secure Payment</p>
                      <p className="text-xs text-slate-600">100% encrypted checkout</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-purple-600">💬</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">24/7 Support</p>
                      <p className="text-xs text-slate-600">Always here to help</p>
                    </div>
                  </div>
                </div>

                {/* Promo Code Section */}
                <div className="pt-4 border-t border-slate-200">
                  <details className="group">
                    <summary className="flex items-center justify-between cursor-pointer text-sm font-semibold text-teal-600 hover:text-teal-700">
                      <span>Have a promo code?</span>
                      <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                      </svg>
                    </summary>
                    <div className="mt-3 flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Enter code"
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />
                      <button className="px-4 py-2 bg-teal-500 hover:bg-teal-600 text-white rounded-lg text-sm font-semibold transition-all">
                        Apply
                      </button>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;