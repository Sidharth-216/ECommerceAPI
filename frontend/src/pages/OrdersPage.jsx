import React, { useState, useEffect } from 'react';
import { Package, Calendar, MapPin, Clock, X, AlertCircle } from 'lucide-react';
import { ordersAPI, getUserIdFromToken } from '../api';

const OrdersPage = ({ user, orders = [], setOrders, setCurrentPage }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await ordersAPI.history();
            console.log('📦 Orders loaded:', response.data);
            setOrders(response.data || []);
        } catch (err) {
            console.error('❌ Error loading orders:', err);
            setError(err.response?.data?.message || 'Failed to load orders');
        } finally {
            setLoading(false);
        }
    };

    // ✅ FIXED: Proper order cancellation with MongoDB ObjectId
    const handleCancelOrder = async (order) => {
        console.group('❌ Order Cancellation');
        console.log('Order object:', order);
        
        // Extract MongoDB ObjectId from order
        const orderId = order._id || order.id || order.Id;
        console.log('Extracted Order ID:', orderId);
        
        if (!orderId) {
            console.error('❌ No order ID found in order object');
            console.groupEnd();
            setError('Invalid order ID');
            return;
        }

        if (!window.confirm(`Cancel order ${order.orderNumber || orderId}?\n\nThis action cannot be undone.`)) {
            console.groupEnd();
            return;
        }

        try {
            setLoading(true);
            setError('');
            
            // Get user ID from token
            const userId = getUserIdFromToken();
            console.log('User ID from token:', userId);
            
            if (!userId) {
                throw new Error('User session invalid. Please login again.');
            }

            console.log('🔄 Calling ordersAPI.cancel with:', {
                orderId: orderId,
                userId: userId
            });

            // Call cancel API
            await ordersAPI.cancel(orderId);
            
            console.log('✅ Order cancelled successfully');
            
            // Reload orders
            await loadOrders();
            
            // Clear selected order if it was the cancelled one
            if (selectedOrder && (selectedOrder._id === orderId || selectedOrder.id === orderId)) {
                setSelectedOrder(null);
            }
            
            alert('✅ Order cancelled successfully!');
        } catch (err) {
            console.error('❌ Cancel error:', err);
            console.error('Error response:', err.response?.data);
            setError(
                err.response?.data?.message || 
                err.message || 
                'Failed to cancel order. Please try again.'
            );
        } finally {
            setLoading(false);
            console.groupEnd();
        }
    };

    const filteredOrders = filterStatus === 'all' 
        ? orders 
        : orders.filter(order => order.status?.toLowerCase() === filterStatus.toLowerCase());

    const getStatusBadgeClass = (status) => {
        const statusLower = status?.toLowerCase() || '';
        if (statusLower === 'delivered') return 'bg-green-100 text-green-800 border-green-300';
        if (statusLower === 'pending') return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        if (statusLower === 'cancelled') return 'bg-red-100 text-red-800 border-red-300';
        if (statusLower === 'processing') return 'bg-blue-100 text-blue-800 border-blue-300';
        if (statusLower === 'shipped') return 'bg-purple-100 text-purple-800 border-purple-300';
        return 'bg-gray-100 text-gray-800 border-gray-300';
    };

    const getStatusIcon = (status) => {
        const statusLower = status?.toLowerCase() || '';
        if (statusLower === 'delivered') return '✅';
        if (statusLower === 'pending') return '⏳';
        if (statusLower === 'cancelled') return '❌';
        if (statusLower === 'processing') return '⚙️';
        if (statusLower === 'shipped') return '🚚';
        return '📦';
    };

    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
            {/* Header */}
            <header className="bg-white shadow-md sticky top-0 z-40 border-b border-gray-100">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg">
                            <Package className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                My Orders
                            </h1>
                            <p className="text-xs text-gray-500">Track and manage your purchases</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setCurrentPage('products')}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all font-semibold"
                        >
                            🛍️ Continue Shopping
                        </button>
                        <button
                            onClick={() => setCurrentPage('profile')}
                            className="px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all font-semibold"
                        >
                            Back to Profile
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-8">
                {error && (
                    <div className="mb-6 bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-semibold">Error</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    </div>
                )}

                {!selectedOrder ? (
                    <>
                        {/* Filter Tabs */}
                        <div className="flex flex-wrap gap-2 mb-6 bg-white rounded-xl p-4 shadow-md border border-gray-100">
                            {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(status => (
                                <button
                                    key={status}
                                    className={`px-5 py-2.5 rounded-xl font-semibold transition-all ${
                                        filterStatus === status
                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105'
                                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                    onClick={() => setFilterStatus(status)}
                                >
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                </button>
                            ))}
                        </div>

                        {/* Orders List */}
                        {loading ? (
                            <div className="flex justify-center items-center py-12">
                                <div className="text-center">
                                    <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                                    <p className="text-gray-500 text-lg">Loading orders...</p>
                                </div>
                            </div>
                        ) : filteredOrders.length === 0 ? (
                            <div className="bg-white rounded-3xl shadow-lg p-16 text-center border border-gray-100">
                                <Package className="w-24 h-24 mx-auto text-gray-300 mb-6" />
                                <h2 className="text-3xl font-bold text-gray-900 mb-3">No Orders Found</h2>
                                <p className="text-gray-600 mb-8 text-lg">
                                    {filterStatus !== 'all' 
                                        ? `No ${filterStatus} orders found. Try a different filter.`
                                        : 'Start your shopping journey today!'}
                                </p>
                                <button
                                    onClick={() => setCurrentPage('products')}
                                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-semibold text-lg"
                                >
                                    🛍️ Shop Now
                                </button>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {filteredOrders.map(order => {
                                    const orderId = order._id || order.id || order.Id;
                                    const orderNumber = order.orderNumber || order.OrderNumber || orderId?.substring(0, 8);
                                    const status = order.status || order.Status || 'Pending';
                                    const createdAt = order.createdAt || order.CreatedAt;
                                    const totalAmount = order.totalAmount || order.TotalAmount || 0;
                                    const items = order.items || order.Items || [];

                                    return (
                                        <div key={orderId} className="bg-white rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden">
                                            {/* Order Header */}
                                            <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 px-8 py-6 border-b border-gray-200">
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <h3 className="text-2xl font-bold text-gray-900 mb-2">
                                                            Order #{orderNumber}
                                                        </h3>
                                                        <p className="text-sm text-gray-600 flex items-center gap-2">
                                                            <Calendar className="w-4 h-4" />
                                                            {createdAt ? new Date(createdAt).toLocaleDateString('en-IN', {
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric',
                                                                hour: '2-digit',
                                                                minute: '2-digit'
                                                            }) : 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                                                            ₹{totalAmount.toLocaleString()}
                                                        </p>
                                                        <span className={`inline-block px-5 py-2 rounded-full text-sm font-bold border-2 ${getStatusBadgeClass(status)}`}>
                                                            {getStatusIcon(status)} {status}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Order Items Preview */}
                                            <div className="px-8 py-6 border-b border-gray-200">
                                                <div className="flex gap-4 overflow-x-auto pb-2">
                                                    {items.slice(0, 3).map((item, idx) => (
                                                        <div key={idx} className="flex gap-3 flex-shrink-0 bg-gray-50 rounded-lg p-3 min-w-[250px]">
                                                            <img
                                                                src={item.imageUrl || item.ImageUrl || item.productImage || 'https://via.placeholder.com/80'}
                                                                alt={item.productName || item.ProductName}
                                                                className="w-20 h-20 object-cover rounded-lg"
                                                                onError={(e) => e.target.src = 'https://via.placeholder.com/80'}
                                                            />
                                                            <div className="flex-1">
                                                                <p className="font-semibold text-gray-900 text-sm line-clamp-2">
                                                                    {item.productName || item.ProductName}
                                                                </p>
                                                                <p className="text-xs text-gray-600 mt-1">
                                                                    Qty: {item.quantity || item.Quantity}
                                                                </p>
                                                                <p className="text-sm font-bold text-blue-600 mt-1">
                                                                    ₹{((item.price || item.Price || 0) * (item.quantity || item.Quantity || 1)).toLocaleString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {items.length > 3 && (
                                                        <div className="flex items-center justify-center min-w-[100px] text-gray-500 font-semibold">
                                                            +{items.length - 3} more
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="px-8 py-6 flex gap-3 bg-gray-50">
                                                <button
                                                    onClick={() => setSelectedOrder(order)}
                                                    className="flex-1 px-6 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all font-semibold"
                                                >
                                                    📋 View Details
                                                </button>
                                                
                                                {status.toLowerCase() !== 'cancelled' && status.toLowerCase() !== 'delivered' && (
                                                    <button
                                                        onClick={() => handleCancelOrder(order)}
                                                        disabled={loading}
                                                        className="flex-1 px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        ❌ Cancel Order
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                ) : (
                    /* Order Details View */
                    <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
                        <button
                            onClick={() => setSelectedOrder(null)}
                            className="mb-6 px-6 py-3 text-blue-600 font-semibold hover:bg-blue-50 rounded-lg transition-all flex items-center gap-2"
                        >
                            ← Back to Orders
                        </button>

                        {/* Order Header */}
                        <div className="flex justify-between items-center mb-8 pb-6 border-b border-gray-200">
                            <div>
                                <h2 className="text-3xl font-bold text-gray-900 mb-2">
                                    Order {selectedOrder.orderNumber || selectedOrder.OrderNumber}
                                </h2>
                                <p className="text-gray-600 flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    {new Date(selectedOrder.createdAt || selectedOrder.CreatedAt).toLocaleDateString('en-IN', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    })}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-3">
                                    ₹{(selectedOrder.totalAmount || selectedOrder.TotalAmount || 0).toLocaleString()}
                                </p>
                                <span className={`inline-block px-6 py-3 rounded-full text-lg font-bold border-2 ${getStatusBadgeClass(selectedOrder.status || selectedOrder.Status)}`}>
                                    {getStatusIcon(selectedOrder.status || selectedOrder.Status)} {selectedOrder.status || selectedOrder.Status}
                                </span>
                            </div>
                        </div>

                        {/* Order Items */}
                        <div className="mb-8">
                            <h3 className="text-xl font-bold text-gray-900 mb-4">📦 Order Items</h3>
                            <div className="space-y-4">
                                {(selectedOrder.items || selectedOrder.Items || []).map((item, idx) => (
                                    <div key={idx} className="flex gap-4 p-5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 hover:shadow-md transition-all">
                                        <img
                                            src={item.imageUrl || item.ImageUrl || item.productImage || 'https://via.placeholder.com/100'}
                                            alt={item.productName || item.ProductName}
                                            className="w-24 h-24 object-cover rounded-lg"
                                            onError={(e) => e.target.src = 'https://via.placeholder.com/100'}
                                        />
                                        <div className="flex-1">
                                            <p className="font-bold text-lg text-gray-900">{item.productName || item.ProductName}</p>
                                            <p className="text-gray-600 mt-1">₹{(item.price || item.Price || 0).toLocaleString()} × {item.quantity || item.Quantity}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-600">Total</p>
                                            <p className="font-bold text-xl text-blue-600">
                                                ₹{((item.price || item.Price || 0) * (item.quantity || item.Quantity)).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        {selectedOrder.status?.toLowerCase() !== 'cancelled' && selectedOrder.status?.toLowerCase() !== 'delivered' && (
                            <div className="flex gap-4 pt-6 border-t border-gray-200">
                                <button
                                    onClick={() => handleCancelOrder(selectedOrder)}
                                    disabled={loading}
                                    className="px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:shadow-lg transition-all font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? 'Cancelling...' : '❌ Cancel Order'}
                                </button>
                                <button
                                    onClick={() => setCurrentPage('products')}
                                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all font-bold"
                                >
                                    🛍️ Continue Shopping
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrdersPage;