import React, { useState, useEffect } from 'react';
import { ordersAPI, adminAPI } from './api';
import {
Package,
Search,
Filter,
Download,
Eye,
Check,
X,
Clock,
Truck,
MapPin,
CreditCard,
Calendar,
ChevronDown,
AlertCircle
} from 'lucide-react';

const OrdersTab = ({ orders = [], loading, setLoading, setError, setCurrentPage }) => {
const [filteredOrders, setFilteredOrders] = useState(orders);
const [searchQuery, setSearchQuery] = useState('');
const [statusFilter, setStatusFilter] = useState('All');
const [sortBy, setSortBy] = useState('date-desc');
const [selectedOrder, setSelectedOrder] = useState(null);
const [showDetails, setShowDetails] = useState(false);
const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
});

// Fetch orders with filters
useEffect(() => {
    const filtered = (orders || [])
        .filter(order => {
            // Status filter
            if (statusFilter !== 'All' && order.status !== statusFilter) return false;

            // Search filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                return (
                    String(order.id).toLowerCase().includes(q) ||
                    (order.customerName || '').toLowerCase().includes(q) ||
                    (order.customer?.email || '').toLowerCase().includes(q) ||
                    (order.customer?.phone || '').toLowerCase().includes(q)
                );
            }

            // Date range filter
            if (order.createdAt || order.orderDate) {
                const orderDate = new Date(order.createdAt || order.orderDate).toISOString().split('T')[0];
                return orderDate >= dateRange.startDate && orderDate <= dateRange.endDate;
            }

            return true;
        })
        .sort((a, b) => {
            switch (sortBy) {
                case 'date-desc':
                    return new Date(b.createdAt || b.orderDate) - new Date(a.createdAt || a.orderDate);
                case 'date-asc':
                    return new Date(a.createdAt || a.orderDate) - new Date(b.createdAt || b.orderDate);
                case 'amount-desc':
                    return (b.totalAmount || 0) - (a.totalAmount || 0);
                case 'amount-asc':
                    return (a.totalAmount || 0) - (b.totalAmount || 0);
                case 'status':
                    return (a.status || '').localeCompare(b.status || '');
                default:
                    return 0;
            }
        });

    setFilteredOrders(filtered);
}, [orders, searchQuery, statusFilter, sortBy, dateRange]);

// Update order status
const updateOrderStatus = async (orderId, newStatus) => {
    try {
        setLoading(true);
        
        if (typeof ordersAPI.updateStatus === 'function') {
            await ordersAPI.updateStatus(orderId, { status: newStatus });
        } else if (typeof adminAPI.updateOrderStatus === 'function') {
            await adminAPI.updateOrderStatus(orderId, newStatus);
        }

        // Update local state
        setFilteredOrders(prev =>
            prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
        );

        if (selectedOrder?.id === orderId) {
            setSelectedOrder({ ...selectedOrder, status: newStatus });
        }

        setError('');
        alert(`✅ Order status updated to ${newStatus}`);
    } catch (err) {
        console.error('Status update error:', err);
        setError(err.response?.data?.message || 'Failed to update order status');
    } finally {
        setLoading(false);
    }
};

// Export orders to CSV
const exportOrders = () => {
    try {
        const csv = [
            ['Order ID', 'Date', 'Customer', 'Email', 'Amount', 'Status', 'Items'],
            ...filteredOrders.map(o => [
                o.id,
                new Date(o.createdAt || o.orderDate).toLocaleDateString(),
                o.customerName || o.customer?.name || 'N/A',
                o.customer?.email || 'N/A',
                `₹${(o.totalAmount || 0).toLocaleString()}`,
                o.status || 'Pending',
                o.items?.length || 0
            ])
        ]
            .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `orders_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Export error:', err);
        setError('Failed to export orders');
    }
};

const getStatusColor = (status) => {
    switch (status) {
        case 'Pending':
            return 'bg-yellow-100 text-yellow-800 border-yellow-300';
        case 'Processing':
            return 'bg-blue-100 text-blue-800 border-blue-300';
        case 'Shipped':
            return 'bg-purple-100 text-purple-800 border-purple-300';
        case 'Delivered':
            return 'bg-green-100 text-green-800 border-green-300';
        case 'Cancelled':
            return 'bg-red-100 text-red-800 border-red-300';
        default:
            return 'bg-gray-100 text-gray-800 border-gray-300';
    }
};

const getStatusIcon = (status) => {
    switch (status) {
        case 'Pending':
            return <Clock className="w-4 h-4" />;
        case 'Processing':
            return <AlertCircle className="w-4 h-4" />;
        case 'Shipped':
            return <Truck className="w-4 h-4" />;
        case 'Delivered':
            return <Check className="w-4 h-4" />;
        case 'Cancelled':
            return <X className="w-4 h-4" />;
        default:
            return <Package className="w-4 h-4" />;
    }
};

const statusOptions = ['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];

return (
    <div className="space-y-6">
        {/* HEADER */}
        <div className="flex items-center justify-between mb-6">
            <div>
                <h2 className="text-3xl font-bold text-gray-900">Orders Management</h2>
                <p className="text-gray-600 mt-1">Track and manage all customer orders</p>
            </div>
            <button
                onClick={exportOrders}
                disabled={filteredOrders.length === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium transition-all"
            >
                <Download className="w-4 h-4" />
                Export CSV
            </button>
        </div>

        {/* FILTERS & SEARCH */}
        <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search */}
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by Order ID, customer name, or email..."
                            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        />
                    </div>
                </div>

                {/* Status Filter */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all appearance-none cursor-pointer"
                    >
                        {statusOptions.map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>

                {/* Sort */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all appearance-none cursor-pointer"
                    >
                        <option value="date-desc">Newest First</option>
                        <option value="date-asc">Oldest First</option>
                        <option value="amount-desc">Highest Amount</option>
                        <option value="amount-asc">Lowest Amount</option>
                        <option value="status">By Status</option>
                    </select>
                </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                    <input
                        type="date"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                    <input
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                        className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                    />
                </div>
            </div>
        </div>

        {/* ORDERS TABLE */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            {filteredOrders.length === 0 ? (
                <div className="p-12 text-center bg-gradient-to-br from-gray-50 to-gray-100">
                    <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700">No orders found</h3>
                    <p className="text-sm text-gray-500 mt-2">Try adjusting your filters or search criteria</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b-2 border-gray-200">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Order ID</th>
                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Date</th>
                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Customer</th>
                                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700">Items</th>
                                <th className="px-6 py-4 text-right text-sm font-bold text-gray-700">Amount</th>
                                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">Status</th>
                                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.map((order, idx) => (
                                <tr key={order.id} className={`border-b transition-all hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 ${
                                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                }`}>
                                    <td className="px-6 py-4">
                                        <button
                                            onClick={() => {
                                                setSelectedOrder(order);
                                                setShowDetails(true);
                                            }}
                                            className="font-bold text-blue-600 hover:text-blue-700 hover:underline"
                                        >
                                            #{order.id}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-gray-400" />
                                            {new Date(order.createdAt || order.orderDate).toLocaleDateString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {order.customerName || order.customer?.name || 'N/A'}
                                            </p>
                                            <p className="text-xs text-gray-500">{order.customer?.email || 'N/A'}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-semibold border border-blue-200">
                                            {order.items?.length || 0} items
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="font-bold text-lg text-gray-900">
                                            ₹{(order.totalAmount || 0).toLocaleString()}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border ${getStatusColor(order.status)}`}>
                                            {getStatusIcon(order.status)}
                                            {order.status || 'Unknown'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedOrder(order);
                                                    setShowDetails(true);
                                                }}
                                                className="p-2 hover:bg-blue-100 rounded-lg text-blue-600 hover:text-blue-700 transition-all"
                                                title="View Details"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                            <div className="relative group">
                                                <button className="p-2 hover:bg-green-100 rounded-lg text-green-600 hover:text-green-700 transition-all">
                                                    <Check className="w-5 h-5" />
                                                </button>
                                                <div className="hidden group-hover:block absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 min-w-max">
                                                    {['Pending', 'Processing', 'Shipped', 'Delivered'].map(status => (
                                                        <button
                                                            key={status}
                                                            onClick={() => updateOrderStatus(order.id, status)}
                                                            disabled={loading}
                                                            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 first:rounded-t-lg last:rounded-b-lg disabled:opacity-50"
                                                        >
                                                            {status}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>

        {/* PAGINATION INFO */}
        <div className="flex items-center justify-between text-sm text-gray-600">
            <div>Showing {filteredOrders.length} of {orders.length} orders</div>
        </div>

        {/* ORDER DETAILS MODAL */}
        {showDetails && selectedOrder && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-96 overflow-y-auto">
                    {/* Modal Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex justify-between items-center sticky top-0 z-10">
                        <h3 className="text-2xl font-bold">Order #{selectedOrder.id}</h3>
                        <button
                            onClick={() => setShowDetails(false)}
                            className="p-2 hover:bg-white/20 rounded-lg transition-all"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-6 space-y-6">
                        {/* Order Info */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Order Date</p>
                                <p className="text-lg font-semibold text-gray-900 mt-1">
                                    {new Date(selectedOrder.createdAt || selectedOrder.orderDate).toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wide">Status</p>
                                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border mt-1 ${getStatusColor(selectedOrder.status)}`}>
                                    {getStatusIcon(selectedOrder.status)}
                                    {selectedOrder.status}
                                </div>
                            </div>
                        </div>

                        {/* Customer Info */}
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <p className="text-sm font-bold text-gray-700 mb-3">👤 Customer Details</p>
                            <div className="space-y-2 text-sm">
                                <p><span className="text-gray-600">Name:</span> <span className="font-medium">{selectedOrder.customerName || selectedOrder.customer?.name || 'N/A'}</span></p>
                                <p><span className="text-gray-600">Email:</span> <span className="font-medium">{selectedOrder.customer?.email || 'N/A'}</span></p>
                                <p><span className="text-gray-600">Phone:</span> <span className="font-medium">{selectedOrder.customer?.phone || 'N/A'}</span></p>
                            </div>
                        </div>

                        {/* Shipping Address */}
                        {selectedOrder.shippingAddress && (
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                    <MapPin className="w-4 h-4" />
                                    Shipping Address
                                </p>
                                <p className="text-sm font-medium">{selectedOrder.shippingAddress.AddressLine1}</p>
                                {selectedOrder.shippingAddress.AddressLine2 && (
                                    <p className="text-sm text-gray-600">{selectedOrder.shippingAddress.AddressLine2}</p>
                                )}
                                <p className="text-sm text-gray-600">
                                    {selectedOrder.shippingAddress.City}, {selectedOrder.shippingAddress.State} {selectedOrder.shippingAddress.PostalCode}
                                </p>
                            </div>
                        )}

                        {/* Order Items */}
                        <div>
                            <p className="text-sm font-bold text-gray-700 mb-3">📦 Order Items ({selectedOrder.items?.length || 0})</p>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {(selectedOrder.items || []).map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-gray-900">{item.productName || item.name}</p>
                                            <p className="text-xs text-gray-600">₹{item.price?.toLocaleString()} × {item.quantity}</p>
                                        </div>
                                        <span className="font-bold text-blue-600">₹{((item.price || 0) * (item.quantity || 1)).toLocaleString()}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Order Summary */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-700">Subtotal</span>
                                <span className="font-semibold">₹{(selectedOrder.totalAmount || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-blue-200">
                                <span className="font-bold text-gray-900">Total</span>
                                <span className="text-2xl font-bold text-blue-600">₹{(selectedOrder.totalAmount || 0).toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Status Update */}
                        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                            <p className="text-sm font-bold text-gray-700 mb-3">Update Status</p>
                            <div className="flex flex-wrap gap-2">
                                {['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map(status => (
                                    <button
                                        key={status}
                                        onClick={() => {
                                            updateOrderStatus(selectedOrder.id, status);
                                            setShowDetails(false);
                                        }}
                                        disabled={loading || selectedOrder.status === status}
                                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                            selectedOrder.status === status
                                                ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                                                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                        } disabled:opacity-50`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
);
};

export default OrdersTab;