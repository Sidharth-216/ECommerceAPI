import React, { useState, useEffect } from 'react';
import {

TrendingUp,
Package,
Users,
BarChart3,
Search,
Plus,
Trash2,
Edit2,
Eye,
Download,
Calendar,
DollarSign,
ShoppingCart,
AlertCircle,
CheckCircle,
Clock,
XCircle
} from 'lucide-react';

// ==========================================
// 1. OVERVIEW TAB
// ==========================================
const OverviewTab = ({ stats, loading, onRefresh }) => {
return (
    <section className="space-y-6">
        <div className="flex items-center justify-between gap-4">
            <div>
                <h2 className="text-2xl font-bold">Dashboard Overview</h2>
                <p className="text-sm text-gray-600">Live snapshot of your store</p>
            </div>
            <button
                onClick={onRefresh}
                disabled={loading}
                className="px-4 py-2 bg-white border rounded-lg text-sm hover:shadow disabled:opacity-50"
            >
                {loading ? 'Refreshing...' : 'Refresh'}
            </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(stats || []).map((stat, idx) => (
                <div
                    key={idx}
                    className="bg-white rounded-xl shadow p-5 flex items-start gap-4 hover:shadow-lg transition-all"
                >
                    <div className="bg-indigo-50 p-3 rounded-lg text-indigo-600">
                        {stat.icon}
                    </div>
                    <div className="flex-1">
                        <p className="text-sm text-gray-500">{stat.label}</p>
                        <div className="flex items-baseline gap-3">
                            <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                            <div className="text-sm text-green-600 font-medium">{stat.change}</div>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">Updated just now</p>
                    </div>
                </div>
            ))}
        </div>

        {/* Quick Stats Summary */}
        <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-6 border border-indigo-100">
            <h3 className="font-semibold text-gray-900 mb-4">📊 Performance Summary</h3>
            <div className="grid md:grid-cols-3 gap-6">
                <div>
                    <p className="text-sm text-gray-600 mb-2">Conversion Rate</p>
                    <p className="text-2xl font-bold text-indigo-600">3.2%</p>
                </div>
                <div>
                    <p className="text-sm text-gray-600 mb-2">Avg. Order Value</p>
                    <p className="text-2xl font-bold text-indigo-600">₹4,250</p>
                </div>
                <div>
                    <p className="text-sm text-gray-600 mb-2">Customer Satisfaction</p>
                    <p className="text-2xl font-bold text-indigo-600">4.7/5.0</p>
                </div>
            </div>
        </div>
    </section>
);
};

// ==========================================
// 2. CUSTOMERS TAB
// ==========================================
const CustomersTab = ({ customers, loading, onToggleStatus, onExport }) => {
const [searchQuery, setSearchQuery] = useState('');

const filteredCustomers = (customers || []).filter(c => {
    const profile = c.profile || c;
    const name = (profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`).toLowerCase();
    const email = (profile.email || '').toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    return name.includes(q) || email.includes(q) || String(profile.mobile || '').includes(q);
});

return (
    <section className="space-y-6">
        <div className="flex items-center justify-between gap-4">
            <div>
                <h2 className="text-2xl font-bold">Registered Customers</h2>
                <p className="text-sm text-gray-600">Manage and view customer details</p>
            </div>
            <button
                onClick={onExport}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center gap-2"
            >
                <Download className="w-4 h-4" />
                Export CSV
            </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                <Search className="w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search by name, email, or mobile..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-sm"
                />
            </div>
        </div>

        {/* Customer Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-gray-600">Total Customers</p>
                <p className="text-2xl font-bold text-blue-700">{customers?.length || 0}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-sm text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-green-700">
                    {(customers || []).filter(c => c.isActive !== false).length}
                </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <p className="text-sm text-gray-600">Inactive Users</p>
                <p className="text-2xl font-bold text-orange-700">
                    {(customers || []).filter(c => c.isActive === false).length}
                </p>
            </div>
        </div>

        {/* Customers Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-left text-gray-500 border-b bg-gray-50">
                        <tr>
                            <th className="py-3 px-4">Customer</th>
                            <th className="py-3 px-4">Email</th>
                            <th className="py-3 px-4">Mobile</th>
                            <th className="py-3 px-4">Role</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Joined</th>
                            <th className="py-3 px-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredCustomers.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="py-8 text-center text-gray-400">
                                    No customers found
                                </td>
                            </tr>
                        ) : (
                            filteredCustomers.map((customer) => {
                                const profile = customer.profile || customer;
                                const name =
                                    profile.fullName ||
                                    `${profile.firstName || ''} ${profile.lastName || ''}`.trim() ||
                                    'N/A';
                                const email = profile.email || 'N/A';
                                const mobile = profile.mobile || profile.phone || '—';
                                const roleLabel =
                                    customer.role === 1 || customer.role === 'Admin' ? 'Admin' : 'Customer';
                                const isActive = customer.isActive !== false;

                                return (
                                    <tr key={customer.id} className="border-b hover:bg-gray-50">
                                        <td className="py-3 px-4 flex items-center gap-3">
                                            <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-semibold">
                                                {name.charAt(0) || 'U'}
                                            </div>
                                            <div>
                                                <div className="font-medium text-gray-900">{name}</div>
                                                <div className="text-xs text-gray-400">ID: {customer.id}</div>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-gray-600">{email}</td>
                                        <td className="py-3 px-4 text-gray-600">{mobile}</td>
                                        <td className="py-3 px-4">
                                            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">
                                                {roleLabel}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <span
                                                className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 w-fit ${
                                                    isActive
                                                        ? 'bg-green-50 text-green-700'
                                                        : 'bg-yellow-50 text-yellow-700'
                                                }`}
                                            >
                                                {isActive ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                                                {isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 text-gray-600 text-xs">
                                            {customer.createdAt
                                                ? new Date(customer.createdAt).toLocaleDateString()
                                                : '—'}
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => alert(JSON.stringify(profile, null, 2))}
                                                    className="px-3 py-1 bg-gray-100 rounded text-xs hover:bg-gray-200"
                                                >
                                                    <Eye className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => onToggleStatus(customer)}
                                                    disabled={loading}
                                                    className="px-3 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 disabled:opacity-50"
                                                >
                                                    {isActive ? 'Disable' : 'Enable'}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    </section>
);
};

// ==========================================
// 3. ORDERS TAB
// ==========================================
const OrdersTab = ({ orders, loading, onUpdateStatus }) => {
const [statusFilter, setStatusFilter] = useState('All');

const filteredOrders = (orders || []).filter(
    (o) => statusFilter === 'All' || o.status === statusFilter
);

const statusColors = {
    Pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: '⏳' },
    Processing: { bg: 'bg-blue-50', text: 'text-blue-700', icon: '⚙️' },
    Shipped: { bg: 'bg-purple-50', text: 'text-purple-700', icon: '🚚' },
    Delivered: { bg: 'bg-green-50', text: 'text-green-700', icon: '✅' },
    Cancelled: { bg: 'bg-red-50', text: 'text-red-700', icon: '❌' }
};

return (
    <section className="space-y-6">
        <div>
            <h2 className="text-2xl font-bold">Orders Management</h2>
            <p className="text-sm text-gray-600">Track and manage all customer orders</p>
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 flex-wrap">
            {['All', 'Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map((status) => (
                <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        statusFilter === status
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : 'bg-white border text-gray-700 hover:shadow'
                    }`}
                >
                    {status} ({(orders || []).filter((o) => status === 'All' || o.status === status).length})
                </button>
            ))}
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-left text-gray-500 border-b bg-gray-50">
                        <tr>
                            <th className="py-3 px-4">Order ID</th>
                            <th className="py-3 px-4">Date</th>
                            <th className="py-3 px-4">Customer</th>
                            <th className="py-3 px-4">Amount</th>
                            <th className="py-3 px-4">Items</th>
                            <th className="py-3 px-4">Status</th>
                            <th className="py-3 px-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="py-8 text-center text-gray-400">
                                    No orders found
                                </td>
                            </tr>
                        ) : (
                            filteredOrders.map((order) => {
                                const colors = statusColors[order.status] || statusColors.Pending;
                                return (
                                    <tr key={order.id} className="border-b hover:bg-gray-50">
                                        <td className="py-3 px-4 font-semibold">#{order.id}</td>
                                        <td className="py-3 px-4 text-gray-600">
                                            {order.createdAt
                                                ? new Date(order.createdAt).toLocaleDateString()
                                                : '—'}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600">
                                            {order.customerName || order.customer?.name || '—'}
                                        </td>
                                        <td className="py-3 px-4 font-semibold">
                                            ₹{(order.totalAmount || 0).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4 text-gray-600">
                                            {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? 's' : ''}
                                        </td>
                                        <td className="py-3 px-4">
                                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}>
                                                {colors.icon} {order.status || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => alert(JSON.stringify(order, null, 2))}
                                                    className="px-3 py-1 bg-gray-100 rounded text-xs hover:bg-gray-200"
                                                >
                                                    View
                                                </button>
                                                {order.status !== 'Delivered' && order.status !== 'Cancelled' && (
                                                    <button
                                                        onClick={() => onUpdateStatus(order.id, 'Shipped')}
                                                        disabled={loading}
                                                        className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded text-xs hover:bg-indigo-100 disabled:opacity-50"
                                                    >
                                                        Mark Shipped
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Orders Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {['Pending', 'Processing', 'Shipped', 'Delivered'].map((status) => {
                const count = (orders || []).filter((o) => o.status === status).length;
                const colors = statusColors[status];
                return (
                    <div key={status} className={`${colors.bg} rounded-lg p-4 border border-opacity-20`}>
                        <p className={`text-sm ${colors.text} font-medium`}>{status}</p>
                        <p className={`text-2xl font-bold ${colors.text}`}>{count}</p>
                    </div>
                );
            })}
        </div>
    </section>
);
};

// ==========================================
// 4. PRODUCTS TAB
// ==========================================
const ProductsTab = ({
products,
categories,
loading,
onCreateProduct,
onUpdateProduct,
onDeleteProduct,
onAddToCart
}) => {
const [searchQuery, setSearchQuery] = useState('');
const [categoryFilter, setCategoryFilter] = useState('All');

const filteredProducts = (products || []).filter((p) => {
    const matchesSearch = !searchQuery.trim() || 
        (p.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (p.brand?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesCategory = categoryFilter === 'All' || p.category === categoryFilter;
    return matchesSearch && matchesCategory;
});

return (
    <section className="space-y-6">
        <div className="flex items-center justify-between gap-4">
            <div>
                <h2 className="text-2xl font-bold">Products Management</h2>
                <p className="text-sm text-gray-600">Add, edit, and manage your product inventory</p>
            </div>
            <button
                onClick={onCreateProduct}
                disabled={loading}
                className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
            >
                <Plus className="w-4 h-4" />
                {loading ? 'Creating...' : 'Add New Product'}
            </button>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-3 flex-wrap">
            <div className="flex-1 min-w-64">
                <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-gray-200">
                    <Search className="w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search by name or brand..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 bg-transparent outline-none text-sm"
                    />
                </div>
            </div>

            <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-white border rounded-lg text-sm"
            >
                <option value="All">All Categories</option>
                {(categories || []).map((cat) => (
                    <option key={cat.id} value={cat.name}>
                        {cat.name}
                    </option>
                ))}
            </select>
        </div>

        {/* Product Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-sm text-gray-600">Total Products</p>
                <p className="text-2xl font-bold text-blue-700">{products?.length || 0}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-sm text-gray-600">In Stock</p>
                <p className="text-2xl font-bold text-green-700">
                    {(products || []).filter((p) => (p.stockQuantity || 0) > 0).length}
                </p>
            </div>
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <p className="text-sm text-gray-600">Low Stock</p>
                <p className="text-2xl font-bold text-orange-700">
                    {(products || []).filter((p) => (p.stockQuantity || 0) > 0 && (p.stockQuantity || 0) < 10).length}
                </p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <p className="text-sm text-gray-600">Out of Stock</p>
                <p className="text-2xl font-bold text-red-700">
                    {(products || []).filter((p) => (p.stockQuantity || 0) === 0).length}
                </p>
            </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
            <div className="bg-gray-50 rounded-xl p-12 text-center border-2 border-dashed border-gray-300">
                <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <h3 className="text-lg font-semibold text-gray-700">No products found</h3>
                <p className="text-sm text-gray-500 mt-2">Create your first product or adjust filters</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredProducts.map((product) => (
                    <div
                        key={product.id}
                        className="bg-white rounded-xl shadow-md hover:shadow-xl overflow-hidden transition-all duration-300 transform hover:-translate-y-1 group border border-gray-100"
                    >
                        {/* Image */}
                        <div className="relative overflow-hidden bg-gray-200 h-48">
                            <img
                                src={product.image || product.imageUrl || 'https://via.placeholder.com/300x300'}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            />
                            <div className="absolute right-3 top-3 bg-indigo-600 text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                                ₹{product.price.toLocaleString()}
                            </div>
                            {(product.stockQuantity || 0) === 0 && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <span className="text-white font-bold">Out of Stock</span>
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="p-4">
                            <div className="mb-2">
                                <h4 className="font-bold text-gray-900 text-sm line-clamp-2">{product.name}</h4>
                                <p className="text-xs text-gray-500 mt-1">{product.brand || 'N/A'}</p>
                            </div>

                            <div className="mb-3 pb-3 border-b border-gray-100">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-gray-600">Stock:</span>
                                    <span className={`text-xs font-bold px-2 py-1 rounded ${
                                        (product.stockQuantity || 0) > 10
                                            ? 'bg-green-50 text-green-700'
                                            : (product.stockQuantity || 0) > 0
                                            ? 'bg-orange-50 text-orange-700'
                                            : 'bg-red-50 text-red-700'
                                    }`}>
                                        {product.stockQuantity || 0} units
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => onUpdateProduct(product)}
                                    className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded text-xs hover:bg-yellow-100 flex-1"
                                >
                                    <Edit2 className="w-3 h-3 inline mr-1" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => onDeleteProduct(product)}
                                    disabled={loading}
                                    className="px-3 py-1 bg-red-50 text-red-700 rounded text-xs hover:bg-red-100 flex-1 disabled:opacity-50"
                                >
                                    <Trash2 className="w-3 h-3 inline mr-1" />
                                    Delete
                                </button>
                            </div>
                            <button
                                onClick={() => onAddToCart(product)}
                                className="w-full mt-2 px-3 py-2 bg-indigo-600 text-white rounded text-xs hover:bg-indigo-700"
                            >
                                Add to Cart
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        )}
    </section>
);
};

// ==========================================
// 5. STOCK ANALYSIS TAB
// ==========================================
const StockAnalysisTab = ({
stockAnalysis,
lowStockProducts,
stockByCategory,
loading,
onRefreshStock,
onRestockProduct
}) => {
return (
    <section className="space-y-6">
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-2xl font-bold">Stock Analysis</h2>
                <p className="text-sm text-gray-600">Inventory levels and reorder recommendations</p>
            </div>
            <button
                onClick={onRefreshStock}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
            >
                {loading ? 'Refreshing...' : 'Refresh Stock Data'}
            </button>
        </div>

        {/* Stock Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl shadow p-5 border border-gray-100 hover:shadow-lg transition-all">
                <p className="text-sm text-gray-500 mb-2">Total Products</p>
                <p className="text-3xl font-bold text-gray-900">{stockAnalysis?.length || 0}</p>
                <p className="text-xs text-gray-400 mt-2">In inventory</p>
            </div>

            <div className="bg-white rounded-xl shadow p-5 border border-gray-100 hover:shadow-lg transition-all">
                <p className="text-sm text-gray-500 mb-2">Low Stock Items</p>
                <p className="text-3xl font-bold text-orange-600">{lowStockProducts?.length || 0}</p>
                <p className="text-xs text-gray-400 mt-2">Below minimum threshold</p>
            </div>

            <div className="bg-white rounded-xl shadow p-5 border border-gray-100 hover:shadow-lg transition-all">
                <p className="text-sm text-gray-500 mb-2">Out of Stock</p>
                <p className="text-3xl font-bold text-red-600">
                    {(stockAnalysis?.filter((s) => (s.quantity || 0) === 0) || []).length}
                </p>
                <p className="text-xs text-gray-400 mt-2">Need immediate reorder</p>
            </div>

            <div className="bg-white rounded-xl shadow p-5 border border-gray-100 hover:shadow-lg transition-all">
                <p className="text-sm text-gray-500 mb-2">Inventory Value</p>
                <p className="text-3xl font-bold text-blue-600">
                    ₹{((stockAnalysis || []).reduce((sum, s) => sum + ((s.price || 0) * (s.quantity || 0)), 0)).toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-2">Estimated total value</p>
            </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockProducts && lowStockProducts.length > 0 && (
            <div className="bg-orange-50 rounded-xl shadow p-6 border border-orange-200">
                <h3 className="text-lg font-semibold mb-4 text-orange-700 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Low Stock Products ({lowStockProducts.length})
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-gray-600 border-b bg-orange-100">
                            <tr>
                                <th className="py-3 px-4">Product</th>
                                <th className="py-3 px-4">Current</th>
                                <th className="py-3 px-4">Minimum</th>
                                <th className="py-3 px-4">Status</th>
                                <th className="py-3 px-4">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {lowStockProducts.map((product) => (
                                <tr key={product.id} className="border-b hover:bg-orange-100 transition-colors">
                                    <td className="py-3 px-4 font-medium">{product.productName || product.name}</td>
                                    <td className="py-3 px-4">{product.quantity || 0} units</td>
                                    <td className="py-3 px-4">{product.minimumStock || 10} units</td>
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                            product.quantity === 0
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-orange-100 text-orange-700'
                                        }`}>
                                            {product.quantity === 0 ? '🔴 Out' : '🟠 Low'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <button
                                            onClick={() => onRestockProduct(product)}
                                            className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded text-xs hover:bg-indigo-100"
                                        >
                                            📦 Restock
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* Stock by Category */}
        {stockByCategory && stockByCategory.length > 0 && (
            <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold mb-4">📊 Stock by Category</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {stockByCategory.map((cat, idx) => (
                        <div key={idx} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-semibold text-gray-900">{cat.category || 'Uncategorized'}</h4>
                                <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                    {cat.items?.length || 0}
                                </span>
                            </div>
                            <div className="mb-3">
                                <p className="text-sm text-gray-600">{cat.totalQuantity || 0} units</p>
                                <p className="text-lg font-bold text-blue-600">₹{(cat.totalValue || 0).toLocaleString()}</p>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                    className="bg-blue-500 h-2 rounded-full transition-all"
                                    style={{ width: `${Math.min(100, ((cat.totalQuantity || 0) / 100) * 100)}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Complete Inventory Table */}
        {stockAnalysis && stockAnalysis.length > 0 && (
            <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold mb-4">📦 Complete Inventory</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-gray-600 border-b bg-gray-50">
                            <tr>
                                <th className="py-3 px-4">Product</th>
                                <th className="py-3 px-4">Category</th>
                                <th className="py-3 px-4">Stock</th>
                                <th className="py-3 px-4">Unit Price</th>
                                <th className="py-3 px-4">Inventory Value</th>
                                <th className="py-3 px-4">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stockAnalysis.map((stock) => {
                                const isOutOfStock = (stock.quantity || 0) === 0;
                                const isLowStock = (stock.quantity || 0) < (stock.minimumStock || 10) && !isOutOfStock;

                                return (
                                    <tr
                                        key={stock.id}
                                        className={`border-b hover:bg-gray-50 transition-colors ${
                                            isOutOfStock ? 'bg-red-50' : isLowStock ? 'bg-orange-50' : ''
                                        }`}
                                    >
                                        <td className="py-3 px-4 font-medium">{stock.productName || stock.name}</td>
                                        <td className="py-3 px-4 text-gray-600">{stock.category || 'N/A'}</td>
                                        <td className="py-3 px-4">
                                            <span
                                                className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                    isOutOfStock
                                                        ? 'bg-red-100 text-red-700'
                                                        : isLowStock
                                                        ? 'bg-orange-100 text-orange-700'
                                                        : 'bg-green-100 text-green-700'
                                                }`}
                                            >
                                                {stock.quantity || 0}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4">₹{(stock.price || 0).toLocaleString()}</td>
                                        <td className="py-3 px-4 font-bold text-blue-600">
                                            ₹{((stock.price || 0) * (stock.quantity || 0)).toLocaleString()}
                                        </td>
                                        <td className="py-3 px-4">
                                            {isOutOfStock && <span className="text-xs font-bold text-red-700">🔴 Out</span>}
                                            {isLowStock && <span className="text-xs font-bold text-orange-700">🟠 Reorder</span>}
                                            {!isOutOfStock && !isLowStock && (
                                                <span className="text-xs font-bold text-green-700">🟢 Sufficient</span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
    </section>
);
};

// ==========================================
// 6. SALES REPORT TAB
// ==========================================
const SalesReportTab = ({
dateRange,
onDateChange,
revenue,
salesByCategory,
topProducts,
orderStats,
dailyMetrics,
loading,
onGenerateReport
}) => {
return (
    <section className="space-y-6">
        <div className="flex items-center justify-between gap-4">
            <div>
                <h2 className="text-2xl font-bold">Sales Report & Analytics</h2>
                <p className="text-sm text-gray-600">Revenue trends and performance insights</p>
            </div>

            <div className="flex items-center gap-3">
                <div>
                    <label className="text-xs text-gray-600 block mb-1">From</label>
                    <input
                        type="date"
                        value={dateRange.startDate}
                        onChange={(e) => onDateChange('startDate', e.target.value)}
                        className="px-3 py-2 border rounded-lg text-sm"
                    />
                </div>
                <div>
                    <label className="text-xs text-gray-600 block mb-1">To</label>
                    <input
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) => onDateChange('endDate', e.target.value)}
                        className="px-3 py-2 border rounded-lg text-sm"
                    />
                </div>
                <button
                    onClick={onGenerateReport}
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50 mt-5"
                >
                    {loading ? 'Generating...' : 'Generate'}
                </button>
            </div>
        </div>

        {/* Revenue Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow p-5 border border-green-200">
                <p className="text-sm text-gray-600 mb-2">Total Revenue</p>
                <p className="text-3xl font-bold text-green-700">₹{(revenue?.totalRevenue || 0).toLocaleString()}</p>
                <p className="text-xs text-green-600 mt-2">
                    {(revenue?.percentageChange || 0) > 0 ? '↑' : '↓'} {Math.abs(revenue?.percentageChange || 0)}%
                </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow p-5 border border-blue-200">
                <p className="text-sm text-gray-600 mb-2">Total Orders</p>
                <p className="text-3xl font-bold text-blue-700">{orderStats?.totalOrders || 0}</p>
                <p className="text-xs text-blue-600 mt-2">In selected period</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow p-5 border border-purple-200">
                <p className="text-sm text-gray-600 mb-2">Avg Order Value</p>
                <p className="text-3xl font-bold text-purple-700">₹{(revenue?.averageOrderValue || 0).toLocaleString()}</p>
                <p className="text-xs text-purple-600 mt-2">Per transaction</p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow p-5 border border-orange-200">
                <p className="text-sm text-gray-600 mb-2">Total Items</p>
                <p className="text-3xl font-bold text-orange-700">{orderStats?.totalItemsSold || 0}</p>
                <p className="text-xs text-orange-600 mt-2">Units sold</p>
            </div>
        </div>

        {/* Order Distribution & Payment Methods */}
        {orderStats && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Order Status Distribution */}
                <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold mb-4">📊 Order Distribution</h3>
                    <div className="space-y-3">
                        {[
                            { label: 'Pending', key: 'pendingCount', color: 'bg-yellow-500' },
                            { label: 'Processing', key: 'processingCount', color: 'bg-blue-500' },
                            { label: 'Delivered', key: 'deliveredCount', color: 'bg-green-500' },
                            { label: 'Cancelled', key: 'cancelledCount', color: 'bg-red-500' }
                        ].map((item) => (
                            <div key={item.key}>
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-gray-700">{item.label}</span>
                                    <span className="font-semibold">{orderStats[item.key] || 0}</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className={`${item.color} h-2 rounded-full`}
                                        style={{
                                            width: `${((orderStats[item.key] || 0) / (orderStats.totalOrders || 1)) * 100}%`
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Payment Methods */}
                <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
                    <h3 className="text-lg font-semibold mb-4">💰 Payment Methods</h3>
                    <div className="space-y-3">
                        {[
                            { label: 'Cash on Delivery', key: 'codCount', icon: '💵' },
                            { label: 'Online Payment', key: 'onlinePaymentCount', icon: '💳' },
                            { label: 'Wallet', key: 'walletCount', icon: '👛' }
                        ].map((item) => (
                            <div key={item.key} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                                <span className="text-gray-700">
                                    {item.icon} {item.label}
                                </span>
                                <span className="font-semibold text-lg">{orderStats[item.key] || 0}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Top Selling Products */}
        {topProducts && topProducts.length > 0 && (
            <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">🏆 Top Selling Products</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left text-gray-600 border-b bg-gray-50">
                            <tr>
                                <th className="py-3 px-4">Rank</th>
                                <th className="py-3 px-4">Product</th>
                                <th className="py-3 px-4">Units Sold</th>
                                <th className="py-3 px-4">Revenue</th>
                                <th className="py-3 px-4">Avg Rating</th>
                            </tr>
                        </thead>
                        <tbody>
                            {topProducts.map((product, idx) => (
                                <tr key={idx} className="border-b hover:bg-gray-50">
                                    <td className="py-3 px-4">
                                        <span
                                            className={`px-2 py-1 rounded-full text-xs font-bold ${
                                                idx === 0
                                                    ? 'bg-yellow-100 text-yellow-700'
                                                    : idx === 1
                                                    ? 'bg-gray-200 text-gray-700'
                                                    : 'bg-orange-100 text-orange-700'
                                            }`}
                                        >
                                            #{idx + 1}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 font-medium">{product.productName || product.name}</td>
                                    <td className="py-3 px-4">{product.unitsSold || 0}</td>
                                    <td className="py-3 px-4 font-semibold">₹{(product.revenue || 0).toLocaleString()}</td>
                                    <td className="py-3 px-4">
                                        <div className="flex items-center gap-1">
                                            <span>⭐</span>
                                            <span>{product.averageRating || 'N/A'}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* Sales by Category */}
        {salesByCategory && salesByCategory.length > 0 && (
            <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">📈 Sales by Category</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {salesByCategory.map((cat, idx) => {
                        const maxRevenue = Math.max(...(salesByCategory || []).map((c) => c.revenue || 0));
                        return (
                            <div key={idx} className="p-4 border rounded-lg hover:shadow-md transition-all">
                                <div className="flex justify-between items-center mb-2">
                                    <h4 className="font-semibold">{cat.categoryName || cat.category || 'N/A'}</h4>
                                    <span className="text-lg font-bold text-blue-600">₹{(cat.revenue || 0).toLocaleString()}</span>
                                </div>
                                <div className="text-sm text-gray-600 mb-2">
                                    {cat.totalSales || 0} orders • {cat.unitsSold || 0} units
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-500 h-2 rounded-full"
                                        style={{ width: `${((cat.revenue || 0) / (maxRevenue || 1)) * 100}%` }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        )}

        {/* Daily Metrics */}
        {dailyMetrics && dailyMetrics.length > 0 && (
            <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
                <h3 className="text-lg font-semibold mb-4">📅 Daily Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                    {dailyMetrics.map((metric, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:shadow-md transition-all">
                            <p className="text-sm font-semibold text-gray-700 mb-2">
                                {new Date(metric.date).toLocaleDateString()}
                            </p>
                            <div className="space-y-1 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Orders:</span>
                                    <span className="font-medium">{metric.orders || 0}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Revenue:</span>
                                    <span className="font-medium text-green-600">₹{(metric.revenue || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Items:</span>
                                    <span className="font-medium">{metric.itemsSold || 0}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}
    </section>
);
};

// ==========================================
// 7. MAIN ADMIN DASHBOARD COMPONENT
// ==========================================
const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'customers', label: 'Customers', icon: '👥' },
            { id: 'orders', label: 'Orders', icon: '📦' },
            { id: 'products', label: 'Products', icon: '🛍️' },
            { id: 'stock', label: 'Stock Analysis', icon: '📈' },
            { id: 'sales', label: 'Sales Report', icon: '💹' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 border hover:shadow'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl shadow p-6">
          {activeTab === 'overview' && <OverviewTab stats={[]} loading={false} onRefresh={() => {}} />}
          {activeTab === 'customers' && <CustomersTab customers={[]} loading={false} onToggleStatus={() => {}} onExport={() => {}} />}
          {activeTab === 'orders' && <OrdersTab orders={[]} loading={false} onUpdateStatus={() => {}} />}
          {activeTab === 'products' && (
            <ProductsTab
              products={[]}
              categories={[]}
              loading={false}
              onCreateProduct={() => {}}
              onUpdateProduct={() => {}}
              onDeleteProduct={() => {}}
              onAddToCart={() => {}}
            />
          )}
          {activeTab === 'stock' && (
            <StockAnalysisTab
              stockAnalysis={[]}
              lowStockProducts={[]}
              stockByCategory={[]}
              loading={false}
              onRefreshStock={() => {}}
              onRestockProduct={() => {}}
            />
          )}
          {activeTab === 'sales' && (
            <SalesReportTab
              dateRange={{ startDate: '', endDate: '' }}
              onDateChange={() => {}}
              revenue={{}}
              salesByCategory={[]}
              topProducts={[]}
              orderStats={{}}
              dailyMetrics={[]}
              loading={false}
              onGenerateReport={() => {}}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
export { OverviewTab, CustomersTab, OrdersTab, ProductsTab, StockAnalysisTab, SalesReportTab };