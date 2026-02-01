import React from 'react';
import { ShoppingCart, LogOut, Plus, Minus, Trash2 } from 'lucide-react';

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <header className="bg-white shadow-md sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <button 
            onClick={() => setCurrentPage('products')} 
            className="flex items-center gap-2 text-gray-700 hover:text-blue-600 font-semibold transition-colors group"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" />
            </svg>
            <span>Continue Shopping</span>
          </button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Shopping Cart</h1>
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-all font-semibold"
          >
            <LogOut className="w-5 h-5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {cart.length === 0 ? (
          <div className="bg-white rounded-3xl shadow-lg p-16 text-center border border-gray-100">
            <ShoppingCart className="w-24 h-24 mx-auto text-gray-300 mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Your cart is empty</h2>
            <p className="text-gray-600 mb-8 text-lg">Add some amazing products to get started!</p>
            <button 
              onClick={() => setCurrentPage('products')} 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl hover:shadow-lg hover:scale-105 transition-all font-semibold text-lg"
            >
              🛍️ Start Shopping
            </button>
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
                {cart.map((item, idx) => {
                  const itemId = item.productIdString || item.productId;
                  
                  return (
                    <div 
                      key={itemId} 
                      className={`p-6 flex gap-6 items-start hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 ${idx !== cart.length - 1 ? 'border-b border-gray-100' : ''}`}
                    >
                      <div className="w-28 h-28 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm">
                        <img 
                          src={item.imageUrl} 
                          alt={item.productName} 
                          className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                        />
                      </div>

                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-bold text-lg text-gray-900">{item.productName}</h3>
                          <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                            ₹{(item.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-gray-600 text-sm mb-4">₹{item.price.toLocaleString()} each</p>

                        <div className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-gray-100 w-fit rounded-xl p-2">
                          <button 
                            onClick={() => {
                              console.log('Decrement clicked:', { itemId, quantity: item.quantity - 1 });
                              updateCartQuantity(itemId, item.quantity - 1, setError);
                            }} 
                            className="p-2 hover:bg-white rounded-lg transition-all"
                          >
                            <Minus className="w-5 h-5 text-gray-700 hover:text-blue-600" />
                          </button>
                          <span className="font-bold text-lg min-w-[2rem] text-center">{item.quantity}</span>
                          <button 
                            onClick={() => {
                              console.log('Increment clicked:', { itemId, quantity: item.quantity + 1 });
                              updateCartQuantity(itemId, item.quantity + 1, setError);
                            }} 
                            className="p-2 hover:bg-white rounded-lg transition-all"
                          >
                            <Plus className="w-5 h-5 text-gray-700 hover:text-blue-600" />
                          </button>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          console.log('Delete clicked:', { itemId });
                          removeFromCart(itemId, setError);
                        }} 
                        className="p-3 hover:bg-red-50 rounded-xl transition-all group"
                      >
                        <Trash2 className="w-6 h-6 text-gray-400 group-hover:text-red-600 transition-colors" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white rounded-2xl shadow-lg p-8 h-fit border border-gray-100 sticky top-24">
              <h3 className="text-xl font-bold mb-6">Order Summary</h3>
              
              <div className="space-y-4 border-b border-gray-200 pb-6 mb-6">
                <div className="flex justify-between text-gray-600">
                  <span className="font-medium">Subtotal</span>
                  <span className="font-semibold">₹{total.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span className="font-medium">Shipping</span>
                  <span className="font-semibold text-green-600">Free</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span className="font-medium">Estimated Tax</span>
                  <span className="font-semibold">₹0</span>
                </div>
              </div>

              <div className="flex justify-between items-center mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                <span className="text-lg font-bold text-gray-900">Total</span>
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">₹{total.toLocaleString()}</span>
              </div>

              <button 
                onClick={() => setCurrentPage('checkout')} 
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl hover:shadow-lg hover:scale-105 font-bold text-lg transition-all active:scale-95"
              >
                Proceed to Checkout →
              </button>

              <button 
                onClick={() => setCurrentPage('products')} 
                className="w-full mt-3 border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50 py-3 rounded-xl font-semibold transition-all"
              >
                Continue Shopping
              </button>

              <div className="mt-6 space-y-2 text-center text-xs text-gray-600">
                <p className="flex items-center justify-center gap-2">✓ Free returns within 7 days</p>
                <p className="flex items-center justify-center gap-2">✓ Secure checkout</p>
                <p className="flex items-center justify-center gap-2">✓ 24/7 Customer support</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;