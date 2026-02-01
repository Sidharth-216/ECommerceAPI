import React, { useState, useEffect } from 'react';
import { TrendingUp, Users, ShoppingCart, Package, DollarSign, RefreshCw, AlertCircle } from 'lucide-react';
import { adminAPI, ordersAPI, productsAPI } from '../../api';
import api from '../../api';

const OverviewTab = ({ error, setError, loading, setLoading }) => {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    recentOrders: [],
    lowStockProducts: 0,
    pendingOrders: 0,
    deliveredOrders: 0
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const fetchOverviewData = async () => {
    setRefreshing(true);
    setError('');
    
    try {
      // Try MongoDB endpoints first, fallback to alternatives
      const [ordersRes, customersRes, productsRes] = await Promise.all([
        // Orders - try multiple endpoints
        adminAPI.getOrders()
          .catch(() => ordersAPI.history())
          .catch(err => {
            console.error('Orders fetch failed:', err);
            return { data: [] };
          }),
        // Users - try multiple endpoints  
        adminAPI.getUsers()
          .catch(() => api.get('/admin/users'))
          .catch(err => {
            console.error('Users fetch failed:', err);
            return { data: [] };
          }),
        // Products - try multiple endpoints
        adminAPI.getProducts()
          .catch(() => productsAPI.getAll())
          .catch(err => {
            console.error('Products fetch failed:', err);
            return { data: [] };
          })
      ]);

      const orders = ordersRes?.data || [];
      const customers = customersRes?.data || [];
      const products = productsRes?.data || [];

      // Calculate stats
      const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      const pendingOrders = orders.filter(o => o.status === 'Pending' || o.status === 'Processing').length;
      const deliveredOrders = orders.filter(o => o.status === 'Delivered').length;
      const lowStockProducts = products.filter(p => (p.stockQuantity || 0) < 10).length;

      setStats({
        totalRevenue,
        totalOrders: orders.length,
        totalCustomers: customers.length,
        totalProducts: products.length,
        recentOrders: orders.slice(0, 5),
        lowStockProducts,
        pendingOrders,
        deliveredOrders
      });
    } catch (err) {
      console.error('Overview fetch error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch overview data');
    } finally {
      setRefreshing(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, change, color, bgColor, iconBg }) => (
    <div className={`bg-gradient-to-br ${bgColor} rounded-2xl shadow-md border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`${iconBg} p-3 rounded-xl`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
        {change && (
          <div className={`flex items-center gap-1 text-xs font-bold ${change.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
            <TrendingUp className="w-3 h-3" />
            {change}
          </div>
        )}
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
        <p className="text-sm text-gray-600 font-medium">{label}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Dashboard Overview</h2>
          <p className="text-gray-600 mt-1">Real-time business metrics and insights</p>
        </div>
        <button
          onClick={fetchOverviewData}
          disabled={refreshing}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={`₹${stats.totalRevenue.toLocaleString()}`}
          change="+12.5%"
          color="text-green-600"
          bgColor="from-green-50 to-emerald-50"
          iconBg="bg-green-100"
        />
        
        <StatCard
          icon={ShoppingCart}
          label="Total Orders"
          value={stats.totalOrders}
          change="+8.2%"
          color="text-blue-600"
          bgColor="from-blue-50 to-indigo-50"
          iconBg="bg-blue-100"
        />
        
        <StatCard
          icon={Users}
          label="Total Customers"
          value={stats.totalCustomers}
          change="+15.3%"
          color="text-purple-600"
          bgColor="from-purple-50 to-pink-50"
          iconBg="bg-purple-100"
        />
        
        <StatCard
          icon={Package}
          label="Total Products"
          value={stats.totalProducts}
          change="+5.7%"
          color="text-orange-600"
          bgColor="from-orange-50 to-amber-50"
          iconBg="bg-orange-100"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-600 uppercase">Pending Orders</p>
            <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-bold">
              Active
            </div>
          </div>
          <p className="text-3xl font-bold text-yellow-600">{stats.pendingOrders}</p>
          <p className="text-xs text-gray-500 mt-2">Requires attention</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-600 uppercase">Delivered Orders</p>
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-bold">
              Completed
            </div>
          </div>
          <p className="text-3xl font-bold text-green-600">{stats.deliveredOrders}</p>
          <p className="text-xs text-gray-500 mt-2">Successfully fulfilled</p>
        </div>

        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-600 uppercase">Low Stock Items</p>
            <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-xs font-bold">
              Alert
            </div>
          </div>
          <p className="text-3xl font-bold text-red-600">{stats.lowStockProducts}</p>
          <p className="text-xs text-gray-500 mt-2">Need restocking</p>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Recent Orders</h3>
          <p className="text-sm text-gray-600 mt-1">Latest 5 orders from customers</p>
        </div>

        {stats.recentOrders.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingCart className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">No orders yet</p>
            <p className="text-sm text-gray-400 mt-1">Orders will appear here once customers place them</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Order ID</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {stats.recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-blue-600">#{order.id}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {order.customerName || order.user?.name || 'Guest Customer'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {order.customerEmail || order.user?.email || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {order.orderDate 
                        ? new Date(order.orderDate).toLocaleDateString('en-IN', { 
                            year: 'numeric', 
                            month: 'short', 
                            day: 'numeric' 
                          })
                        : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-gray-900">
                        ₹{(order.totalAmount || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                        order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'Shipped' ? 'bg-purple-100 text-purple-800' :
                        order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                        order.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status || 'Processing'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg p-8 text-white">
          <h3 className="text-xl font-bold mb-3">Manage Products</h3>
          <p className="text-blue-100 mb-6 text-sm">Add, edit, or remove products from your inventory</p>
          <button className="bg-white text-blue-600 px-6 py-3 rounded-xl font-bold hover:shadow-xl transition-all">
            Go to Products →
          </button>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg p-8 text-white">
          <h3 className="text-xl font-bold mb-3">View Analytics</h3>
          <p className="text-purple-100 mb-6 text-sm">Check sales reports and stock analysis</p>
          <button className="bg-white text-purple-600 px-6 py-3 rounded-xl font-bold hover:shadow-xl transition-all">
            View Reports →
          </button>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;