import React from 'react';
import { MapPin, CreditCard, ShoppingBag } from 'lucide-react';
import { ordersAPI, cartAPI, getUserIdFromToken } from '../api';
import { openRazorpay } from '../utils/helpers';

const CheckoutPage = ({
  user,
  cart,
  profileData,
  setCurrentPage,
  setCart,
  setError,
  error,
  loading,
  setLoading,
  loadOrders
}) => {
  const handleCheckout = async () => {
    setError('');

    if (!user) return setError('Please sign in to place an order.');
    if (!cart || cart.length === 0) return setError('Your cart is empty.');
    if (!profileData.addresses?.length) {
      return setError('Add a shipping address in your profile.');
    }

    setLoading(true);

    try {
      const addressSelect = document.querySelector('input[name="address"]:checked');
      const paymentSelect = document.querySelector('input[name="paymentMethod"]:checked');

      const selectedAddressId = addressSelect?.value;
      const paymentMethod = paymentSelect?.value || 'COD';

      if (!selectedAddressId) {
        setError('Please select a shipping address.');
        setLoading(false);
        return;
      }

      let addressIdNumber = selectedAddressId;
      
      if (!selectedAddressId || typeof selectedAddressId !== 'string') {
        console.error('❌ Invalid Address ID type:', selectedAddressId);
        setError('Invalid shipping address selected. Please try again.');
        setLoading(false);
        return;
      }
      
      if (/^\d+$/.test(selectedAddressId)) {
        addressIdNumber = Number(selectedAddressId);
        if (isNaN(addressIdNumber) || addressIdNumber <= 0) {
          console.error('❌ Invalid numeric Address ID:', selectedAddressId);
          setError('Invalid shipping address selected. Please try again.');
          setLoading(false);
          return;
        }
      } else if (/^[0-9a-f]{24}$/i.test(selectedAddressId)) {
        addressIdNumber = selectedAddressId;
      } else if (selectedAddressId.trim().length > 0) {
        addressIdNumber = selectedAddressId;
      } else {
        console.error('❌ Invalid Address ID format:', selectedAddressId);
        setError('Invalid shipping address selected. Please try again.');
        setLoading(false);
        return;
      }

      const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

      console.log('📦 Confirming order with:', {
        shippingAddressId: addressIdNumber,
        paymentMethod: paymentMethod,
        totalAmount: totalAmount,
        itemCount: cart.length
      });

      const orderResponse = await ordersAPI.confirm(addressIdNumber);

      const orderId = orderResponse?.data?.id || orderResponse?.data?.orderId || orderResponse?.id;

      if (!orderId) throw new Error('Order creation failed');

      console.log('✅ Order created:', orderId);

      if (paymentMethod === 'Online') {
        await openRazorpay({
          orderId,
          amount: totalAmount,
          user
        });
        return;
      }

      if (typeof cartAPI.clear === 'function') {
        await cartAPI.clear(getUserIdFromToken());
      }
      setCart([]);
      localStorage.removeItem('cart');
      sessionStorage.removeItem('cart');

      if (typeof loadOrders === 'function') {
        await loadOrders();
      }
      setCurrentPage('profile');

      alert(`✅ Order Placed Successfully!\nOrder ID: #${orderId}`);
    } catch (err) {
      console.error('❌ Checkout error:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Failed to place order. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      <header className="bg-white shadow-md sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
          <button 
            onClick={() => setCurrentPage('cart')} 
            className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-all group"
          >
            <svg className="w-6 h-6 group-hover:-translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" />
            </svg>
          </button>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Secure Checkout</h1>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl shadow-md mb-6 flex items-start gap-4">
            <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
            <p className="font-medium">{error}</p>
          </div>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Address Section */}
            <div className="bg-white rounded-2xl shadow-md p-8 border border-gray-100">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <MapPin className="w-6 h-6 text-blue-600" />
                Select Shipping Address
              </h2>
              {profileData.addresses && profileData.addresses.length > 0 ? (
                <div className="space-y-3">
                  {profileData.addresses.map((addr) => {
                    const addressId = addr._id || addr.id || addr.Id;
                    return (
                      <label 
                        key={addressId} 
                        className="flex items-start p-5 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all group"
                      >
                        <input 
                          type="radio" 
                          name="address" 
                          value={addressId}
                          defaultChecked={addr.IsDefault}
                          className="mt-1 mr-4 w-5 h-5 cursor-pointer accent-blue-600" 
                        />
                        <div className="flex-1">
                          <p className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">{addr.label || 'Address'}</p>
                          <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                            {[addr.AddressLine1, addr.AddressLine2, addr.City, addr.State, addr.PostalCode, addr.Country]
                              .filter(Boolean)
                              .join(', ')}
                          </p>
                          {addr.IsDefault && (
                            <span className="inline-block text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full mt-2">
                              Default Address
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6 text-orange-800">
                  <p className="font-semibold">No saved addresses found</p>
                  <p className="text-sm mt-1">Add an address in your profile to proceed with checkout.</p>
                </div>
              )}
            </div>

            {/* Payment Method Section */}
            <div className="bg-white rounded-2xl shadow-md p-8 border border-gray-100">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <CreditCard className="w-6 h-6 text-blue-600" />
                Payment Method
              </h2>
              
              <div className="space-y-3">
                <label className="flex items-center p-5 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all group">
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="COD" 
                    defaultChecked 
                    className="mr-4 w-5 h-5 cursor-pointer accent-blue-600"
                  />
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      Cash on Delivery (COD)
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Pay when your order arrives at your doorstep
                    </p>
                  </div>
                  <span className="text-2xl">💵</span>
                </label>

                <label className="flex items-center p-5 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all group">
                  <input 
                    type="radio" 
                    name="paymentMethod" 
                    value="Online" 
                    className="mr-4 w-5 h-5 cursor-pointer accent-blue-600"
                  />
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      Online Payment (Razorpay)
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      Credit/Debit Card, UPI, Wallet & more
                    </p>
                  </div>
                  <span className="text-2xl">💳</span>
                </label>
              </div>

              <p className="text-xs text-gray-500 text-center mt-4">
                Secure payment powered by Razorpay
              </p>
            </div>

            {/* Order Items Section */}
            <div className="bg-white rounded-2xl shadow-md p-8 border border-gray-100">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                <ShoppingBag className="w-6 h-6 text-blue-600" />
                Order Items ({cart.length})
              </h2>
              <div className="space-y-4">
                {cart.map((item, idx) => (
                  <div key={item.productId} className={`flex justify-between items-center py-4 ${idx !== cart.length - 1 ? 'border-b border-gray-200' : ''}`}>
                    <div>
                      <p className="font-bold text-gray-900">{item.productName || item.name}</p>
                      <p className="text-sm text-gray-600 mt-1">₹{item.price.toLocaleString()} × {item.quantity} qty</p>
                    </div>
                    <span className="font-bold text-lg text-blue-600">₹{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary Sidebar */}
          <div className="bg-white rounded-2xl shadow-lg p-8 h-fit border border-gray-100 sticky top-24">
            <h3 className="text-2xl font-bold mb-8">Order Summary</h3>
            
            <div className="space-y-4 border-b border-gray-200 pb-6 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Subtotal</span>
                <span className="font-bold text-gray-900">₹{cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Shipping</span>
                <span className="font-bold text-green-600">Free</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 font-medium">Tax</span>
                <span className="font-bold text-gray-900">₹0</span>
              </div>
            </div>

            <div className="flex justify-between items-center mb-8 bg-gradient-to-r from-blue-100 to-indigo-100 p-5 rounded-xl border border-blue-300">
              <span className="font-bold text-gray-900">Total Amount</span>
              <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                ₹{cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()}
              </span>
            </div>

            <button
              disabled={loading || cart.length === 0}
              onClick={handleCheckout}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Processing...
                </>
              ) : (
                <>
                  Place Order Securely
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </>
              )}
            </button>

            <button
              onClick={() => setCurrentPage('cart')}
              className="w-full mt-3 border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50 py-3 rounded-xl font-bold transition-all"
            >
              ← Back to Cart
            </button>

            <div className="mt-8 space-y-3 text-sm text-center text-gray-600">
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">🔒</span>
                <span className="font-medium">SSL Encrypted Checkout</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">✓</span>
                <span className="font-medium">Free returns within 7 days</span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-xl">💬</span>
                <span className="font-medium">24/7 Customer Support</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;