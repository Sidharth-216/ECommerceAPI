import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../api';
import {
  Package,
  Search,
  Download,
  Eye,
  Check,
  X,
  Clock,
  Truck,
  MapPin,
  Calendar,
  AlertCircle,
  Filter,
  RefreshCw
} from 'lucide-react';

const OrdersTab = () => {
  const [allOrders, setAllOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [sortBy, setSortBy] = useState('date-desc');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  // Fetch orders on mount
  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await adminAPI.getOrders();
      const payload = response?.data || [];
      const orders = Array.isArray(payload)
        ? payload
        : (payload?.items || payload?.orders || payload?.data || []);
      
      console.log('📦 Fetched orders:', orders);
      // 🔍 Log first order raw so we can see the exact shape
      if (orders.length > 0) {
        console.log('📦 First order raw shape:', JSON.stringify(orders[0], null, 2));
      }
      
      // Normalize order data
      // Customer info can live at multiple levels depending on how the backend
      // populates the order document. Check every known location in priority order.
      const normalizedOrders = orders.map(order => {
        const customer = order.customer || order.user || order.userId || {};

        const customerName =
          order.customerName ||
          customer.fullName  ||
          customer.name      ||
          (customer.firstName
            ? `${customer.firstName} ${customer.lastName || ''}`.trim()
            : null) ||
          'Unknown Customer';

        const customerEmail =
          order.customerEmail ||
          customer.email      ||
          'N/A';

        const customerPhone =
          order.customerPhone    ||
          customer.phone         ||
          customer.mobile        ||
          customer.phoneNumber   ||
          'N/A';

        return {
          id: order._id || order.id,
          orderNumber: order.orderNumber || `ORD-${(order._id || order.id || '').slice(-8)}`,
          customerName,
          customerEmail,
          customerPhone,
          totalAmount: order.totalAmount || order.amount || 0,
          status: order.status || 'Pending',
          orderDate: order.orderDate || order.createdAt || new Date().toISOString(),
          items: order.items || [],
          shippingAddress: order.shippingAddress || null,
          paymentMethod: order.paymentMethod || 'COD'
        };
      });
      
      setAllOrders(normalizedOrders);
      setFilteredOrders(normalizedOrders);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders');
      setAllOrders([]);
      setFilteredOrders([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort orders
  useEffect(() => {
    let filtered = [...allOrders];

    // Status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter(order => order.status === statusFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(order =>
        order.orderNumber.toLowerCase().includes(q) ||
        order.customerName.toLowerCase().includes(q) ||
        order.customerEmail.toLowerCase().includes(q) ||
        order.id.toLowerCase().includes(q)
      );
    }

    // Date range filter
    filtered = filtered.filter(order => {
      const orderDate = new Date(order.orderDate).toISOString().split('T')[0];
      return orderDate >= dateRange.startDate && orderDate <= dateRange.endDate;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.orderDate) - new Date(a.orderDate);
        case 'date-asc':
          return new Date(a.orderDate) - new Date(b.orderDate);
        case 'amount-desc':
          return b.totalAmount - a.totalAmount;
        case 'amount-asc':
          return a.totalAmount - b.totalAmount;
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    setFilteredOrders(filtered);
  }, [allOrders, searchQuery, statusFilter, sortBy, dateRange]);

  // Update order status
  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      setLoading(true);
      setError('');
      
      await adminAPI.updateOrderStatus(orderId, newStatus);

      // Update local state
      setAllOrders(prev =>
        prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o)
      );

      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }

      alert(`✅ Order status updated to ${newStatus}`);
    } catch (err) {
      console.error('Status update error:', err);
      setError(err.response?.data?.message || 'Failed to update order status');
      alert('❌ Failed to update order status');
    } finally {
      setLoading(false);
    }
  };

  // Export orders to CSV
  const exportOrders = () => {
    try {
      const csv = [
        ['Order ID', 'Order Number', 'Date', 'Customer', 'Email', 'Phone', 'Amount', 'Status', 'Items'],
        ...filteredOrders.map(o => [
          o.id,
          o.orderNumber,
          new Date(o.orderDate).toLocaleDateString(),
          o.customerName,
          o.customerEmail,
          o.customerPhone,
          `₹${o.totalAmount.toLocaleString()}`,
          o.status,
          o.items.length
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
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Processing':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Shipped':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Delivered':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Cancelled':
        return 'bg-coral-50 text-coral-700 border-coral-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
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

  if (loading && allOrders.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900">Orders Management</h2>
          <p className="text-slate-600 mt-1">Track and manage all customer orders</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrders}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-slate-200 text-slate-700 rounded-lg hover:border-teal-400 hover:bg-teal-50 disabled:opacity-50 font-medium transition-all"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportOrders}
            disabled={filteredOrders.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 font-semibold transition-all shadow-md"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-coral-50 border-l-4 border-coral-500 text-coral-800 px-6 py-4 rounded-lg">
          <p className="font-medium">{error}</p>
        </div>
      )}

      {/* FILTERS & SEARCH */}
      <div className="bg-white rounded-xl shadow-md p-6 border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Search Orders</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Order ID, customer name, or email..."
                className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all outline-none"
              />
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Status</label>
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border-2 border-slate-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all outline-none appearance-none cursor-pointer"
              >
                {statusOptions.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Sort */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all outline-none appearance-none cursor-pointer"
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-200">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">From Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">To Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              className="w-full px-4 py-2.5 border-2 border-slate-200 rounded-lg focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all outline-none"
            />
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {statusOptions.filter(s => s !== 'All').map(status => {
          const count = allOrders.filter(o => o.status === status).length;
          return (
            <div key={status} className="bg-white rounded-lg border-2 border-slate-200 p-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-slate-600">{status}</span>
                {getStatusIcon(status)}
              </div>
              <p className="text-2xl font-bold text-slate-900">{count}</p>
            </div>
          );
        })}
      </div>

      {/* ORDERS TABLE */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-200">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
            <h3 className="text-lg font-bold text-slate-700">No orders found</h3>
            <p className="text-sm text-slate-500 mt-2">
              {allOrders.length === 0 
                ? 'No orders have been placed yet' 
                : 'Try adjusting your filters or search criteria'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-teal-50 to-cyan-50 border-b-2 border-teal-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-800">Order</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-800">Date</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-slate-800">Customer</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-slate-800">Items</th>
                  <th className="px-6 py-4 text-right text-sm font-bold text-slate-800">Amount</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-slate-800">Status</th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-slate-800">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order, idx) => (
                  <tr key={order.id} className={`border-b border-slate-100 transition-all hover:bg-teal-50 ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                  }`}>
                    <td className="px-6 py-4">
                      <div>
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowDetails(true);
                          }}
                          className="font-bold text-teal-600 hover:text-teal-700 hover:underline"
                        >
                          {order.orderNumber}
                        </button>
                        <p className="text-xs text-slate-500 mt-0.5">ID: {order.id.slice(0, 8)}...</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-slate-700">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        {new Date(order.orderDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{order.customerName}</p>
                        <p className="text-xs text-slate-500">{order.customerEmail}</p>
                        <p className="text-xs text-slate-400">{order.customerPhone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm font-bold border border-blue-200">
                        {order.items.length}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-bold text-lg text-slate-900">
                        ₹{order.totalAmount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold border ${getStatusColor(order.status)}`}>
                          {getStatusIcon(order.status)}
                          {order.status}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setSelectedOrder(order);
                            setShowDetails(true);
                          }}
                          className="p-2 hover:bg-teal-100 rounded-lg text-teal-600 hover:text-teal-700 transition-all"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <div className="relative group">
                          <button className="p-2 hover:bg-emerald-100 rounded-lg text-emerald-600 hover:text-emerald-700 transition-all">
                            <Check className="w-5 h-5" />
                          </button>
                          <div className="hidden group-hover:block absolute right-0 mt-1 bg-white border-2 border-slate-200 rounded-lg shadow-xl z-10 min-w-[150px]">
                            {['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map(status => (
                              <button
                                key={status}
                                onClick={() => updateOrderStatus(order.id, status)}
                                disabled={loading || order.status === status}
                                className={`block w-full text-left px-4 py-2.5 text-sm transition-all first:rounded-t-lg last:rounded-b-lg ${
                                  order.status === status
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'text-slate-700 hover:bg-teal-50 hover:text-teal-700'
                                }`}
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
      <div className="flex items-center justify-between text-sm">
        <div className="text-slate-600">
          Showing <span className="font-bold text-slate-900">{filteredOrders.length}</span> of{' '}
          <span className="font-bold text-slate-900">{allOrders.length}</span> orders
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-lg font-semibold">
            Total Revenue: ₹{allOrders.reduce((sum, o) => sum + o.totalAmount, 0).toLocaleString()}
          </span>
        </div>
      </div>

      {/* ORDER DETAILS MODAL */}
      {showDetails && selectedOrder && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-6 flex justify-between items-center sticky top-0 z-10">
              <div>
                <h3 className="text-2xl font-bold">{selectedOrder.orderNumber}</h3>
                <p className="text-sm text-teal-100 mt-1">Order ID: {selectedOrder.id}</p>
              </div>
              <button
                onClick={() => setShowDetails(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Order Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-bold mb-1">Order Date</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {new Date(selectedOrder.orderDate).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-bold mb-1">Status</p>
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-bold border ${getStatusColor(selectedOrder.status)}`}>
                    {getStatusIcon(selectedOrder.status)}
                    {selectedOrder.status}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-bold mb-1">Payment Method</p>
                  <p className="text-lg font-semibold text-slate-900">{selectedOrder.paymentMethod}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-bold mb-1">Total Amount</p>
                  <p className="text-2xl font-bold text-teal-600">₹{selectedOrder.totalAmount.toLocaleString()}</p>
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-5 border-2 border-slate-200">
                <p className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  👤 Customer Details
                </p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Name:</span>
                    <span className="font-semibold text-slate-900">{selectedOrder.customerName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Email:</span>
                    <span className="font-semibold text-slate-900">{selectedOrder.customerEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Phone:</span>
                    <span className="font-semibold text-slate-900">{selectedOrder.customerPhone}</span>
                  </div>
                </div>
              </div>

              {/* Shipping Address */}
              {selectedOrder.shippingAddress && (
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-5 border-2 border-teal-200">
                  <p className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-teal-600" />
                    Shipping Address
                  </p>
                  <div className="text-sm text-slate-700 space-y-1">
                    <p className="font-medium">{selectedOrder.shippingAddress.AddressLine1}</p>
                    {selectedOrder.shippingAddress.AddressLine2 && (
                      <p>{selectedOrder.shippingAddress.AddressLine2}</p>
                    )}
                    <p>
                      {selectedOrder.shippingAddress.City}, {selectedOrder.shippingAddress.State}{' '}
                      {selectedOrder.shippingAddress.PostalCode}
                    </p>
                    <p className="font-medium">{selectedOrder.shippingAddress.Country}</p>
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div>
                <p className="text-sm font-bold text-slate-800 mb-3">
                  📦 Order Items ({selectedOrder.items.length})
                </p>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 rounded-lg border border-slate-200 hover:bg-slate-100 transition-all">
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-slate-900">{item.productName || item.name || 'Product'}</p>
                        <p className="text-xs text-slate-600 mt-1">
                          ₹{(item.price || 0).toLocaleString()} × {item.quantity || 1}
                        </p>
                      </div>
                      <span className="font-bold text-teal-600 text-lg">
                        ₹{((item.price || 0) * (item.quantity || 1)).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-5 border-2 border-teal-200">
                <div className="flex justify-between items-center pt-2">
                  <span className="font-bold text-slate-900 text-lg">Total Amount</span>
                  <span className="text-3xl font-bold text-teal-600">
                    ₹{selectedOrder.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Status Update Actions */}
              <div className="bg-amber-50 rounded-xl p-5 border-2 border-amber-200">
                <p className="text-sm font-bold text-slate-800 mb-3">Update Order Status</p>
                <div className="flex flex-wrap gap-2">
                  {['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'].map(status => (
                    <button
                      key={status}
                      onClick={() => {
                        updateOrderStatus(selectedOrder.id, status);
                        setShowDetails(false);
                      }}
                      disabled={loading || selectedOrder.status === status}
                      className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        selectedOrder.status === status
                          ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                          : 'bg-white border-2 border-slate-300 text-slate-700 hover:border-teal-500 hover:bg-teal-50 hover:text-teal-700'
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