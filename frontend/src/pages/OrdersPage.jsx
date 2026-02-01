import React, { useState, useEffect } from 'react';
import { ordersAPI } from '../api';

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
            setOrders(response.data || []);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load orders');
            console.error('Error loading orders:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelOrder = async (orderId) => {
        if (!window.confirm('Are you sure you want to cancel this order?')) return;

        try {
            setLoading(true);
            await ordersAPI.cancel(orderId);
            setError('');
            await loadOrders();
            setSelectedOrder(null);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to cancel order');
        } finally {
            setLoading(false);
        }
    };

    const filteredOrders = filterStatus === 'all' 
        ? orders 
        : orders.filter(order => order.status?.toLowerCase() === filterStatus.toLowerCase());

    const getStatusBadgeClass = (status) => {
        const statusLower = status?.toLowerCase() || '';
        if (statusLower === 'delivered') return 'bg-green-100 text-green-800';
        if (statusLower === 'pending') return 'bg-yellow-100 text-yellow-800';
        if (statusLower === 'cancelled') return 'bg-red-100 text-red-800';
        if (statusLower === 'processing') return 'bg-blue-100 text-blue-800';
        if (statusLower === 'shipped') return 'bg-purple-100 text-purple-800';
        return 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">My Orders</h1>
                    <button 
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                        onClick={() => setCurrentPage('products')}
                    >
                        Continue Shopping
                    </button>
                </div>

                {error && <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">{error}</div>}

            {!selectedOrder ? (
                <>
                    {/* Filter Tabs */}
                    <div className="flex flex-wrap gap-2 mb-6 border-b">
                        {['all', 'pending', 'processing', 'shipped', 'delivered', 'cancelled'].map(status => (
                            <button
                                key={status}
                                className={`px-4 py-2 font-medium transition ${filterStatus === status ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600 hover:text-gray-900'}`}
                                onClick={() => setFilterStatus(status)}
                            >
                                {status.charAt(0).toUpperCase() + status.slice(1)}
                            </button>
                        ))}
                    </div>

                    {/* Orders List */}
                    {loading ? (
                        <div className="flex justify-center items-center py-12">
                            <p className="text-gray-500 text-lg">Loading orders...</p>
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-500 text-lg mb-4">No orders found</p>
                            <button 
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                onClick={() => setCurrentPage('products')}
                            >
                                Start Shopping
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {filteredOrders.map(order => (
                                <div key={order._id || order.Id} className="bg-white rounded-lg shadow hover:shadow-md transition p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900">Order {order.orderNumber || order.OrderNumber || order._id?.substring(0, 8)}</h3>
                                            <p className="text-sm text-gray-500">
                                                {new Date(order.createdAt || order.CreatedAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusBadgeClass(order.status || order.Status)}`}>
                                            {order.status || order.Status || 'Pending'}
                                        </div>
                                    </div>

                                    <div className="flex gap-4 mb-4 py-4 border-y">
                                        {order.items?.slice(0, 3).map((item, idx) => (
                                            <div key={idx} className="flex gap-3 flex-shrink-0">
                                                <img 
                                                    src={item.productImage || item.ProductImage || 'https://via.placeholder.com/80'} 
                                                    alt={item.productName}
                                                    className="w-20 h-20 object-cover rounded"
                                                    onError={(e) => e.target.src = 'https://via.placeholder.com/80'}
                                                />
                                                <div className="text-sm">
                                                    <p className="font-medium text-gray-900">{item.productName || item.ProductName}</p>
                                                    <p className="text-gray-500">Qty: {item.quantity || item.Quantity}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {order.items?.length > 3 && (
                                            <p className="text-sm text-gray-500 self-center">+{order.items.length - 3} more</p>
                                        )}
                                    </div>

                                    <div className="flex justify-between items-center">
                                        <div className="text-lg">
                                            <span className="text-gray-600">Total: </span>
                                            <strong className="text-gray-900">₹{(order.totalAmount || order.TotalAmount || 0).toFixed(2)}</strong>
                                        </div>
                                        <button 
                                            className="px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 transition"
                                            onClick={() => setSelectedOrder(order)}
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
                ) : (
                    <div className="bg-white rounded-lg shadow-lg p-8">
                        <button 
                            className="mb-6 px-4 py-2 text-blue-600 font-medium hover:text-blue-800 transition"
                            onClick={() => setSelectedOrder(null)}
                        >
                            ← Back to Orders
                        </button>

                        <div className="flex justify-between items-center mb-8 pb-6 border-b">
                            <h2 className="text-2xl font-bold text-gray-900">Order {selectedOrder.orderNumber || selectedOrder.OrderNumber}</h2>
                            <div className={`px-4 py-2 rounded-full text-lg font-semibold ${getStatusBadgeClass(selectedOrder.status || selectedOrder.Status)}`}>
                                {selectedOrder.status || selectedOrder.Status}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Order Items */}
                            <div className="lg:col-span-2">
                                <h3 className="text-xl font-semibold text-gray-900 mb-4">Order Items</h3>
                                <div className="space-y-4">
                                    {selectedOrder.items?.map((item, idx) => (
                                        <div key={idx} className="flex gap-4 p-4 bg-gray-50 rounded-lg">
                                            <img 
                                                src={item.productImage || item.ProductImage || 'https://via.placeholder.com/100'} 
                                                alt={item.productName}
                                                className="w-24 h-24 object-cover rounded"
                                                onError={(e) => e.target.src = 'https://via.placeholder.com/100'}
                                            />
                                            <div className="flex-1">
                                                <p className="font-semibold text-gray-900">{item.productName || item.ProductName}</p>
                                                <p className="text-gray-600">₹{(item.price || item.Price || 0).toFixed(2)}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-gray-600">Qty: {item.quantity || item.Quantity}</p>
                                                <p className="font-semibold text-gray-900">₹{((item.price || item.Price || 0) * (item.quantity || item.Quantity)).toFixed(2)}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Shipping Address */}
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-4">Shipping Address</h3>
                                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                                    <p className="font-semibold text-gray-900">{selectedOrder.shippingAddress?.name || selectedOrder.ShippingAddress?.Name}</p>
                                    <p className="text-gray-600">{selectedOrder.shippingAddress?.street || selectedOrder.ShippingAddress?.Street}</p>
                                    <p className="text-gray-600">{selectedOrder.shippingAddress?.city || selectedOrder.ShippingAddress?.City}</p>
                                    <p className="text-gray-600">{selectedOrder.shippingAddress?.state || selectedOrder.ShippingAddress?.State} - {selectedOrder.shippingAddress?.zipCode || selectedOrder.ShippingAddress?.ZipCode}</p>
                                    <p className="text-gray-600">📞 {selectedOrder.shippingAddress?.phone || selectedOrder.ShippingAddress?.Phone}</p>
                                </div>
                            </div>

                            {/* Order Summary */}
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-4">Order Summary</h3>
                                <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                                    <div className="flex justify-between text-gray-600">
                                        <span>Subtotal:</span>
                                        <span>₹{(selectedOrder.subtotal || selectedOrder.Subtotal || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Discount:</span>
                                        <span className="text-green-600">-₹{(selectedOrder.discount || selectedOrder.Discount || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Shipping:</span>
                                        <span>₹{(selectedOrder.shipping || selectedOrder.Shipping || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-gray-600">
                                        <span>Tax:</span>
                                        <span>₹{(selectedOrder.tax || selectedOrder.Tax || 0).toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between text-lg font-semibold text-gray-900 pt-3 border-t">
                                        <span>Total:</span>
                                        <span>₹{(selectedOrder.totalAmount || selectedOrder.TotalAmount || 0).toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Order Timeline */}
                            <div className="lg:col-span-2">
                                <h3 className="text-xl font-semibold text-gray-900 mb-4">Order Timeline</h3>
                                <div className="space-y-4">
                                    <div className={`flex items-center ${selectedOrder.status?.toLowerCase() === 'pending' || !selectedOrder.status ? 'opacity-100' : 'opacity-100'}`}>
                                        <div className={`w-4 h-4 rounded-full mr-4 ${['pending', 'processing', 'shipped', 'delivered'].includes(selectedOrder.status?.toLowerCase()) ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                                        <div>
                                            <p className="font-semibold text-gray-900">Order Placed</p>
                                            <p className="text-sm text-gray-500">{new Date(selectedOrder.createdAt || selectedOrder.CreatedAt).toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className={`flex items-center`}>
                                        <div className={`w-4 h-4 rounded-full mr-4 ${['processing', 'shipped', 'delivered'].includes(selectedOrder.status?.toLowerCase()) ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                                        <p className="font-semibold text-gray-900">Processing</p>
                                    </div>
                                    <div className={`flex items-center`}>
                                        <div className={`w-4 h-4 rounded-full mr-4 ${['shipped', 'delivered'].includes(selectedOrder.status?.toLowerCase()) ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                                        <p className="font-semibold text-gray-900">Shipped</p>
                                    </div>
                                    <div className={`flex items-center`}>
                                        <div className={`w-4 h-4 rounded-full mr-4 ${selectedOrder.status?.toLowerCase() === 'delivered' ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                                        <p className="font-semibold text-gray-900">Delivered</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-4 mt-8 pt-6 border-t">
                            {!['delivered', 'cancelled'].includes(selectedOrder.status?.toLowerCase() || '') && (
                                <button 
                                    className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50"
                                    onClick={() => handleCancelOrder(selectedOrder._id || selectedOrder.Id)}
                                    disabled={loading}
                                >
                                    {loading ? 'Cancelling...' : 'Cancel Order'}
                                </button>
                            )}
                            <button 
                                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                                onClick={() => setCurrentPage('products')}
                            >
                                Continue Shopping
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default OrdersPage;