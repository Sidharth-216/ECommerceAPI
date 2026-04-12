import React, { useState, useEffect, useCallback } from 'react';
import { 
    Package, Clock, AlertCircle, 
  ChevronRight, ArrowLeft, ShoppingBag, Trash2, 
    RefreshCcw, FileText
} from 'lucide-react';
import { ordersAPI } from '../api';

const OrdersPage = ({ user, orders = [], setOrders, setCurrentPage }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');

    const loadOrders = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const response = await ordersAPI.history();
            setOrders(response.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load orders');
        } finally { setLoading(false); }
    }, [setOrders]);

    useEffect(() => { loadOrders(); }, [loadOrders]);

    const handleCancelOrder = async (order) => {
        const orderId = order._id || order.id || order.Id;
        if (!orderId) return setError('Invalid order ID');

        if (!window.confirm(`Are you sure you want to cancel order #${order.orderNumber || orderId.substring(0,8)}?`)) return;

        try {
            setLoading(true);
            await ordersAPI.cancel(orderId);
            await loadOrders();
            if (selectedOrder) setSelectedOrder(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to cancel order.');
        } finally { setLoading(false); }
    };

    const handleDownloadInvoice = async (order) => {
        const orderId = order._id || order.id || order.Id;
        if (!orderId) return setError('Invalid order ID');

        try {
            setLoading(true);
            setError('');
            
            // Fetch the invoice PDF from the API
            const response = await fetch(`/api/mongo/order/${orderId}/invoice`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`,
                    'Accept': 'application/pdf'
                }
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to download invoice');
            }

            // Get the blob from response
            const blob = await response.blob();
            
            // Create a download link and trigger it
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `Invoice-${order.orderNumber}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (err) {
            setError(err.message || 'Failed to download invoice');
        } finally { setLoading(false); }
    };

    const primaryGradient = "bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white";
    
    const getStatusStyles = (status) => {
        const s = status?.toLowerCase();
        if (s === 'delivered') return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', dot: 'bg-emerald-500' };
        if (s === 'cancelled') return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100', dot: 'bg-rose-500' };
        if (s === 'processing' || s === 'shipped') return { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-100', dot: 'bg-cyan-500' };
        return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', dot: 'bg-amber-500' };
    };

    const filteredOrders = filterStatus === 'all' 
        ? orders 
        : orders.filter(order => order.status?.toLowerCase() === filterStatus.toLowerCase());

    return (
        <div className="min-h-screen bg-[#F8FAFC]">
            {/* --- Premium Header --- */}
            <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-100">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap gap-3 justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className={`${primaryGradient} p-2.5 rounded-2xl shadow-lg shadow-teal-200/50`}>
                            <Package className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-black text-slate-900 tracking-tight">Order History</h1>
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Manage your purchases</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setCurrentPage('products')}
                            className={`${primaryGradient} px-5 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all active:scale-95 flex items-center gap-2`}
                        >
                            <ShoppingBag size={18} />
                            <span className="hidden sm:inline">Continue Shopping</span>
                        </button>
                    </div>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
                {error && (
                    <div className="mb-8 p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-700 rounded-r-xl flex items-center gap-3">
                        <AlertCircle size={20} />
                        <span className="font-bold text-sm">{error}</span>
                    </div>
                )}

                {!selectedOrder ? (
                    <>
                        {/* --- Modern Filter Pills --- */}
                        <div className="flex gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
                            {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status)}
                                    className={`px-5 py-2 rounded-full text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap border-2 ${
                                        filterStatus === status 
                                        ? 'bg-slate-900 border-slate-900 text-white' 
                                        : 'bg-white border-slate-100 text-slate-400 hover:border-teal-500 hover:text-teal-600'
                                    }`}
                                >
                                    {status}
                                </button>
                            ))}
                        </div>

                        {/* --- Orders Feed --- */}
                        {loading ? (
                            <div className="py-20 text-center">
                                <RefreshCcw className="w-10 h-10 text-teal-500 animate-spin mx-auto mb-4" />
                                <p className="font-bold text-slate-400">Syncing your orders...</p>
                            </div>
                        ) : filteredOrders.length === 0 ? (
                            <div className="bg-white rounded-[32px] p-16 text-center border-2 border-dashed border-slate-200">
                                <div className="bg-slate-50 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Package className="w-10 h-10 text-slate-300" />
                                </div>
                                <h2 className="text-xl sm:text-2xl font-black text-slate-900">No orders here yet</h2>
                                <p className="text-slate-500 mt-2 mb-8">Looks like you haven't placed any orders in this category.</p>
                                <button onClick={() => setCurrentPage('products')} className={`${primaryGradient} px-8 py-3 rounded-2xl font-bold`}>
                                    Start Shopping
                                </button>
                            </div>
                        ) : (
                            <div className="grid gap-6">
                                {filteredOrders.map(order => {
                                    const style = getStatusStyles(order.status);
                                    return (
                                        <div 
                                            key={order._id || order.id} 
                                            className="group bg-white rounded-[24px] border border-slate-100 p-6 hover:shadow-2xl hover:shadow-slate-200/50 transition-all duration-300 cursor-pointer"
                                            onClick={() => setSelectedOrder(order)}
                                        >
                                            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="bg-slate-50 p-3 rounded-2xl">
                                                        <Clock className="w-5 h-5 text-slate-400" />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-black text-slate-900">Order #{order.orderNumber || (order._id || order.id).substring(0,8)}</h3>
                                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
                                                            {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.1em] border ${style.bg} ${style.text} ${style.border} flex items-center gap-2`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot} animate-pulse`}></span>
                                                        {order.status || 'Pending'}
                                                    </div>
                                                    <p className="text-xl font-black text-slate-900 tracking-tight">₹{order.totalAmount?.toLocaleString()}</p>
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-6 border-t border-slate-50">
                                                <div className="flex -space-x-3 overflow-hidden">
                                                    {(order.items || []).slice(0, 4).map((item, idx) => (
                                                        <img 
                                                            key={idx}
                                                            src={item.imageUrl || item.productImage || 'https://via.placeholder.com/80'} 
                                                            className="w-10 h-10 rounded-full border-2 border-white object-cover bg-slate-100"
                                                            alt="product"
                                                        />
                                                    ))}
                                                    {order.items?.length > 4 && (
                                                        <div className="w-10 h-10 rounded-full border-2 border-white bg-slate-900 text-white text-[10px] font-bold flex items-center justify-center">
                                                            +{order.items.length - 4}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 text-teal-600 font-bold text-sm group-hover:gap-4 transition-all">
                                                    Manage Order <ChevronRight size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                ) : (
                    /* --- Order Details View --- */
                    <div className="animate-[fadeIn_0.3s_ease-out]">
                        <button
                            onClick={() => setSelectedOrder(null)}
                            className="mb-8 flex items-center gap-2 text-slate-400 hover:text-teal-600 font-bold transition-colors"
                        >
                            <ArrowLeft size={20} /> Back to History
                        </button>

                        <div className="bg-white rounded-[32px] border border-slate-100 overflow-hidden shadow-xl shadow-slate-200/40">
                            {/* Summary Header */}
                            <div className="p-6 md:p-12 bg-slate-900 text-white">
                                <div className="flex flex-col md:flex-row justify-between gap-6">
                                    <div>
                                        <p className="text-teal-400 font-black uppercase tracking-widest text-xs mb-2">Order Confirmed</p>
                                        <h2 className="text-2xl sm:text-4xl font-black tracking-tight mb-2">#{selectedOrder.orderNumber || (selectedOrder._id || selectedOrder.id).substring(0,8)}</h2>
                                        <p className="text-slate-400 font-medium">Placed on {new Date(selectedOrder.createdAt).toLocaleString()}</p>
                                    </div>
                                    <div className="md:text-right">
                                        <p className="text-slate-400 text-sm font-bold uppercase mb-1">Total Amount</p>
                                        <p className="text-2xl sm:text-4xl font-black text-teal-400">₹{selectedOrder.totalAmount?.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 sm:p-8 md:p-12 space-y-8 sm:space-y-10">
                                {/* Order Items Table */}
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 mb-6 flex items-center gap-2">
                                        <Package className="text-teal-500" size={20} /> Package Items
                                    </h3>
                                    <div className="space-y-4">
                                        {(selectedOrder.items || []).map((item, idx) => (
                                            <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 p-4 rounded-2xl bg-slate-50 border border-slate-100">
                                                <img src={item.imageUrl || item.productImage} className="w-16 h-16 rounded-xl object-cover bg-white" alt="" />
                                                <div className="flex-1">
                                                    <h4 className="font-bold text-slate-900">{item.productName}</h4>
                                                    <p className="text-sm text-slate-500">Qty: {item.quantity} • ₹{item.price?.toLocaleString()} each</p>
                                                </div>
                                                <p className="font-black text-slate-900">₹{(item.price * item.quantity).toLocaleString()}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Status Tracker Visualization */}
                                
                                
                                <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-slate-100">
                                    {selectedOrder.status?.toLowerCase() !== 'cancelled' && selectedOrder.status?.toLowerCase() !== 'delivered' && (
                                        <button
                                            onClick={() => handleCancelOrder(selectedOrder)}
                                            className="flex-1 py-4 bg-rose-50 text-rose-600 rounded-2xl font-black hover:bg-rose-100 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Trash2 size={18} /> Cancel Order
                                        </button>
                                    )}
                                    {selectedOrder.status?.toLowerCase() === 'delivered' && (
                                        <button
                                            onClick={() => handleDownloadInvoice(selectedOrder)}
                                            disabled={loading}
                                            className="flex-1 py-4 bg-emerald-50 text-emerald-600 rounded-2xl font-black hover:bg-emerald-100 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            <FileText size={18} /> {loading ? 'Generating...' : 'Download Invoice'}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setCurrentPage('products')}
                                        className={`flex-1 py-4 rounded-2xl font-black flex items-center justify-center gap-2 shadow-lg shadow-teal-200/50 ${primaryGradient}`}
                                    >
                                        <ShoppingBag size={18} /> Buy More
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    );
};

export default OrdersPage;