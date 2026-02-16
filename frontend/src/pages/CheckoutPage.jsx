import React from 'react';
import { 
  MapPin, CreditCard, ShoppingBag, ArrowLeft, 
  ShieldCheck, Truck, Lock, ChevronRight, RefreshCcw // Added RefreshCcw here
} from 'lucide-react';
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
  
  // Theme Constants
  const primaryGradient = "bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700";
  const cardStyle = "bg-white rounded-[24px] border border-slate-100 shadow-sm overflow-hidden";

  const handleCheckout = async () => {
    setError('');
    if (!user) return setError('Please sign in to place an order.');
    if (!cart?.length) return setError('Your cart is empty.');
    if (!profileData.addresses?.length) return setError('Add a shipping address in your profile.');

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

      const orderResponse = await ordersAPI.confirm(selectedAddressId);
      const orderId = orderResponse?.data?.id || orderResponse?.data?.orderId || orderResponse?.id;

      if (paymentMethod === 'Online') {
        const totalAmount = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        await openRazorpay({ orderId, amount: totalAmount, user });
        return;
      }

      // Clear Cart logic
      if (typeof cartAPI.clear === 'function') await cartAPI.clear(getUserIdFromToken());
      setCart([]);
      localStorage.removeItem('cart');
      if (typeof loadOrders === 'function') await loadOrders();
      
      setCurrentPage('profile');
      alert(`✅ Order Placed Successfully!\nOrder ID: #${orderId}`);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Checkout failed.');
    } finally {
      setLoading(false);
    }
  };

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* --- Simple Header --- */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <button 
            onClick={() => setCurrentPage('cart')} 
            className="flex items-center gap-2 text-slate-500 hover:text-teal-600 font-bold transition-colors group"
          >
            <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
            <span>Back to Cart</span>
          </button>
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-teal-500" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Secure Checkout</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">
        {error && (
          <div className="mb-8 p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-700 rounded-r-xl flex items-center gap-3 animate-shake">
            <Lock size={18} />
            <span className="font-bold text-sm">{error}</span>
          </div>
        )}

        <div className="grid lg:grid-cols-12 gap-10">
          
          {/* --- Left: Information Flow --- */}
          <div className="lg:col-span-8 space-y-8">
            
            {/* 1. Shipping Address */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 ml-1">
                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center font-black text-sm">1</div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Shipping Address</h2>
              </div>
              
              <div className={`${cardStyle} p-6`}>
                {profileData.addresses?.length > 0 ? (
                  <div className="grid gap-4">
                    {profileData.addresses.map((addr) => (
                      <label 
                        key={addr._id || addr.id} 
                        className="relative flex items-start p-5 rounded-2xl border-2 cursor-pointer transition-all group has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50/30 border-slate-100 hover:border-slate-200"
                      >
                        <input 
                          type="radio" name="address" value={addr._id || addr.id}
                          defaultChecked={addr.IsDefault}
                          className="mt-1 w-5 h-5 accent-teal-600" 
                        />
                        <div className="ml-4 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900">{addr.label || 'Home'}</span>
                            {addr.IsDefault && <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-slate-900 text-white rounded-md">Default</span>}
                          </div>
                          <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                            {addr.AddressLine1}, {addr.City}, {addr.State} - {addr.PostalCode}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                ) : (
                  <button 
                    onClick={() => setCurrentPage('profile')}
                    className="w-full py-8 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold hover:text-teal-600 hover:border-teal-200 transition-all"
                  >
                    + Add New Shipping Address
                  </button>
                )}
              </div>
            </section>

            {/* 2. Payment Method */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 ml-1">
                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center font-black text-sm">2</div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Payment Method</h2>
              </div>
              
              <div className={`${cardStyle} p-6 grid md:grid-cols-2 gap-4`}>
                <label className="relative flex items-center p-5 rounded-2xl border-2 cursor-pointer transition-all has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50/30 border-slate-100 hover:border-slate-200">
                  <input type="radio" name="paymentMethod" value="COD" defaultChecked className="w-5 h-5 accent-teal-600" />
                  <div className="ml-4">
                    <p className="font-black text-slate-900">Cash on Delivery</p>
                    <p className="text-xs text-slate-500">Pay when order arrives</p>
                  </div>
                </label>

                <label className="relative flex items-center p-5 rounded-2xl border-2 cursor-pointer transition-all has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50/30 border-slate-100 hover:border-slate-200">
                  <input type="radio" name="paymentMethod" value="Online" className="w-5 h-5 accent-teal-600" />
                  <div className="ml-4">
                    <p className="font-black text-slate-900">Online Payment</p>
                    <p className="text-xs text-slate-500">Cards, UPI, Netbanking</p>
                  </div>
                </label>
              </div>
            </section>

            {/* 3. Review Items */}
            <section className="space-y-4">
              <div className="flex items-center gap-3 ml-1">
                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center font-black text-sm">3</div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Review Items</h2>
              </div>
              <div className={`${cardStyle}`}>
                <div className="divide-y divide-slate-50">
                  {cart.map((item) => (
                    <div key={item.productId} className="p-6 flex items-center justify-between bg-white hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden">
                           <img src={item.imageUrl || item.image} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 leading-tight">{item.productName || item.name}</p>
                          <p className="text-xs font-bold text-slate-400 mt-1">QTY: {item.quantity}</p>
                        </div>
                      </div>
                      <p className="font-black text-slate-900">₹{(item.price * item.quantity).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* --- Right: Order Summary Sticky --- */}
          <div className="lg:col-span-4">
            <div className="sticky top-28 space-y-6">
              <div className={`${cardStyle} p-8 border-t-4 border-t-teal-500`}>
                <h3 className="text-lg font-black text-slate-900 mb-6">Order Summary</h3>
                
                <div className="space-y-4 mb-8">
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-slate-400">Subtotal</span>
                    <span className="text-slate-900">₹{subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm font-bold">
                    <span className="text-slate-400">Shipping</span>
                    <span className="text-emerald-500">FREE</span>
                  </div>
                  <div className="pt-4 border-t border-slate-100 flex justify-between items-end">
                    <span className="font-black text-slate-900">Total</span>
                    <div className="text-right">
                      <p className="text-3xl font-black text-slate-900 tracking-tighter">₹{subtotal.toLocaleString()}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Inclusive of all taxes</p>
                    </div>
                  </div>
                </div>

                <button
                  disabled={loading || !cart?.length}
                  onClick={handleCheckout}
                  className={`w-full py-4 rounded-2xl font-black text-white shadow-xl shadow-teal-200/50 flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50 ${primaryGradient}`}
                >
                  {loading ? (
                    <RefreshCcw className="animate-spin" size={20} />
                  ) : (
                    <>Complete Purchase <ChevronRight size={20} /></>
                  )}
                </button>

                <div className="mt-8 grid grid-cols-2 gap-4">
                   <div className="text-center p-3 rounded-xl bg-slate-50">
                      <Truck size={18} className="mx-auto mb-1 text-slate-400" />
                      <p className="text-[10px] font-black text-slate-500 uppercase">Fast Delivery</p>
                   </div>
                   <div className="text-center p-3 rounded-xl bg-slate-50">
                      <Lock size={18} className="mx-auto mb-1 text-slate-400" />
                      <p className="text-[10px] font-black text-slate-500 uppercase">Encrypted</p>
                   </div>
                </div>
              </div>

              <p className="text-center text-xs font-medium text-slate-400 px-6">
                By completing your purchase, you agree to ShopAI's Terms of Service and Refund Policy.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CheckoutPage;