import React, { useState, useEffect } from 'react';
import { TrendingUp, Package, Users, ShoppingBag, BarChart3, ArrowUp, ArrowDown } from 'lucide-react';

/**
 * OverviewTab Component
 * Displays admin dashboard statistics and key metrics
 * 
 * Props:
 * - adminStats: Array of stat objects {label, value, change, icon}
 * - adminCustomers: Array of customer objects
 * - adminOrders: Array of order objects
 * - products: Array of product objects
 * - loading: Boolean loading state
 * - onRefresh: Callback function to refresh data
 */
const OverviewTab = ({ 
    adminStats = [], 
    adminCustomers = [], 
    adminOrders = [], 
    products = [], 
    loading = false,
    onRefresh = () => {} 
}) => {
    const [stats, setStats] = useState([]);

    // Calculate stats from data
    useEffect(() => {
        const totalSales = (adminOrders || []).reduce((sum, order) => sum + (order?.totalAmount || 0), 0);
        
        const calculatedStats = [
            {
                label: 'Total Sales',
                value: `₹${totalSales.toLocaleString()}`,
                change: '+12.5%',
                icon: <TrendingUp className="w-6 h-6" />,
                trend: 'up'
            },
            {
                label: 'Total Orders',
                value: (adminOrders || []).length.toString(),
                change: '+8.2%',
                icon: <Package className="w-6 h-6" />,
                trend: 'up'
            },
            {
                label: 'Total Customers',
                value: (adminCustomers || []).length.toString(),
                change: '+15.3%',
                icon: <Users className="w-6 h-6" />,
                trend: 'up'
            },
            {
                label: 'Total Products',
                value: (products || []).length.toString(),
                change: '+3',
                icon: <ShoppingBag className="w-6 h-6" />,
                trend: 'up'
            }
        ];

        setStats(adminStats && adminStats.length > 0 ? adminStats : calculatedStats);
    }, [adminStats, adminOrders, adminCustomers, products]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900">Dashboard Overview</h2>
                    <p className="text-sm text-gray-600 mt-1">Real-time insights into your store performance</p>
                </div>
                <button
                    onClick={onRefresh}
                    disabled={loading}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium transition-all flex items-center gap-2"
                >
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Refreshing...
                        </>
                    ) : (
                        <>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Refresh
                        </>
                    )}
                </button>
            </div>

            {/* Stats Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {stats.map((stat, idx) => (
                    <div
                        key={idx}
                        className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 overflow-hidden group border border-gray-100"
                    >
                        {/* Card Header Background */}
                        <div className="h-1 bg-gradient-to-r from-blue-500 to-indigo-600 group-hover:h-2 transition-all"></div>

                        <div className="p-6">
                            {/* Icon and Label */}
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <p className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                                        {stat.label}
                                    </p>
                                </div>
                                <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg group-hover:shadow-md transition-all">
                                    <div className="text-indigo-600 group-hover:scale-110 transition-transform">
                                        {stat.icon}
                                    </div>
                                </div>
                            </div>

                            {/* Value and Change */}
                            <div className="mb-3">
                                <div className="text-3xl font-bold text-gray-900">
                                    {stat.value}
                                </div>
                            </div>

                            {/* Change Indicator */}
                            <div className="flex items-center gap-2">
                                {stat.trend === 'up' ? (
                                    <>
                                        <div className="flex items-center gap-1 text-green-600">
                                            <ArrowUp className="w-4 h-4" />
                                            <span className="text-sm font-semibold">{stat.change}</span>
                                        </div>
                                        <span className="text-xs text-gray-500">vs. last period</span>
                                    </>
                                ) : (
                                    <>
                                        <div className="flex items-center gap-1 text-red-600">
                                            <ArrowDown className="w-4 h-4" />
                                            <span className="text-sm font-semibold">{stat.change}</span>
                                        </div>
                                        <span className="text-xs text-gray-500">vs. last period</span>
                                    </>
                                )}
                            </div>

                            {/* Last Updated */}
                            <div className="mt-4 pt-4 border-t border-gray-100">
                                <p className="text-xs text-gray-400">Last updated: just now</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Quick Stats Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    Quick Summary
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                        <p className="text-sm text-gray-600 mb-2">Conversion Rate</p>
                        <p className="text-2xl font-bold text-blue-600">3.24%</p>
                        <p className="text-xs text-gray-500 mt-2">↑ 0.5% increase</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                        <p className="text-sm text-gray-600 mb-2">Avg Order Value</p>
                        <p className="text-2xl font-bold text-indigo-600">₹{stats[0]?.value ? 'N/A' : '0'}</p>
                        <p className="text-xs text-gray-500 mt-2">Based on total orders</p>
                    </div>
                    <div className="bg-white rounded-lg p-4 border border-blue-100">
                        <p className="text-sm text-gray-600 mb-2">Customer Satisfaction</p>
                        <p className="text-2xl font-bold text-green-600">4.8/5.0</p>
                        <p className="text-xs text-gray-500 mt-2">Based on {adminCustomers?.length || 0} reviews</p>
                    </div>
                </div>
            </div>

            {/* Recent Activity Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Orders */}
                <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
                    </div>
                    <div className="divide-y max-h-64 overflow-y-auto">
                        {(adminOrders || []).slice(0, 5).map((order, idx) => (
                            <div key={idx} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="font-semibold text-gray-900">Order #{order.id}</p>
                                    <span className="text-sm font-bold text-blue-600">₹{(order.totalAmount || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <p className="text-gray-600">{order.customerName || 'Customer'}</p>
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                        order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                        order.status === 'Shipped' ? 'bg-blue-100 text-blue-800' :
                                        'bg-green-100 text-green-800'
                                    }`}>
                                        {order.status || 'Processing'}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {(!adminOrders || adminOrders.length === 0) && (
                            <div className="px-6 py-8 text-center text-gray-500">
                                <Package className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No orders yet</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Customers */}
                <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-4 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-900">Top Customers</h3>
                    </div>
                    <div className="divide-y max-h-64 overflow-y-auto">
                        {(adminCustomers || []).slice(0, 5).map((customer, idx) => {
                            const profile = customer.profile || customer;
                            const name = profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Customer';
                            return (
                                <div key={idx} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-sm font-bold">
                                            {name.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900">{name}</p>
                                            <p className="text-xs text-gray-500">{profile.email || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Member since {customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'N/A'}
                                    </div>
                                </div>
                            );
                        })}
                        {(!adminCustomers || adminCustomers.length === 0) && (
                            <div className="px-6 py-8 text-center text-gray-500">
                                <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No customers yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OverviewTab;