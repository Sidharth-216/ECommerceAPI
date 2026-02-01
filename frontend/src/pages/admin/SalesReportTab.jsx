import React, { useState, useEffect } from 'react';
import { Calendar, TrendingUp, BarChart3, Download } from 'lucide-react';

const SalesReportTab = ({
    dateRange,
    setDateRange,
    salesReport,
    revenue,
    topProducts,
    orderStats,
    dailyMetrics,
    salesByCategory,
    salesByProduct,
    loading,
    onRefresh
}) => {
    const [selectedMetric, setSelectedMetric] = useState('revenue');
    const [chartData, setChartData] = useState([]);

    useEffect(() => {
        if (dailyMetrics && dailyMetrics.length > 0) {
            setChartData(dailyMetrics);
        }
    }, [dailyMetrics]);

    const exportToCSV = () => {
        const headers = ['Date', 'Orders', 'Revenue', 'Items Sold', 'Avg Order Value'];
        const rows = (chartData || []).map(d => [
            new Date(d.date).toLocaleDateString(),
            d.orders || 0,
            d.revenue || 0,
            d.itemsSold || 0,
            d.avgOrderValue || 0
        ]);

        const csv = [headers, ...rows]
            .map(row => row.map(cell => `"${cell}"`).join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sales-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* DATE RANGE SELECTOR */}
            <div className="flex items-end gap-4 bg-white rounded-xl shadow p-6">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Calendar className="inline w-4 h-4 mr-1" />
                        Start Date
                    </label>
                    <input
                        type="date"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                        className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        <Calendar className="inline w-4 h-4 mr-1" />
                        End Date
                    </label>
                    <input
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                        className="px-4 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    />
                </div>

                <button
                    onClick={onRefresh}
                    disabled={loading}
                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50"
                >
                    {loading ? 'Loading...' : 'Generate Report'}
                </button>

                <button
                    onClick={exportToCSV}
                    className="px-4 py-2 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-all flex items-center gap-2"
                >
                    <Download className="w-4 h-4" />
                    Export
                </button>
            </div>

            {/* KEY METRICS */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow p-5 border border-green-200">
                    <p className="text-sm text-gray-600 mb-2">💰 Total Revenue</p>
                    <p className="text-3xl font-bold text-green-700">₹{(revenue?.totalRevenue || 0).toLocaleString()}</p>
                    <p className="text-xs text-green-600 mt-2">
                        {revenue?.percentageChange > 0 ? '↑' : '↓'} {Math.abs(revenue?.percentageChange || 0)}%
                    </p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow p-5 border border-blue-200">
                    <p className="text-sm text-gray-600 mb-2">📦 Total Orders</p>
                    <p className="text-3xl font-bold text-blue-700">{orderStats?.totalOrders || 0}</p>
                    <p className="text-xs text-blue-600 mt-2">Orders in period</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow p-5 border border-purple-200">
                    <p className="text-sm text-gray-600 mb-2">💵 Average Order Value</p>
                    <p className="text-3xl font-bold text-purple-700">₹{(revenue?.averageOrderValue || 0).toLocaleString()}</p>
                    <p className="text-xs text-purple-600 mt-2">Per transaction</p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow p-5 border border-orange-200">
                    <p className="text-sm text-gray-600 mb-2">📊 Items Sold</p>
                    <p className="text-3xl font-bold text-orange-700">{salesReport?.totalItemsSold || 0}</p>
                    <p className="text-xs text-orange-600 mt-2">Units delivered</p>
                </div>
            </div>

            {/* CHARTS & TRENDS */}
            <div className="grid lg:grid-cols-2 gap-6">
                {/* DAILY REVENUE TREND */}
                <div className="bg-white rounded-xl shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                            Daily Revenue Trend
                        </h3>
                        <select
                            value={selectedMetric}
                            onChange={(e) => setSelectedMetric(e.target.value)}
                            className="text-sm border rounded-lg px-3 py-1"
                        >
                            <option value="revenue">Revenue</option>
                            <option value="orders">Orders</option>
                            <option value="items">Items Sold</option>
                        </select>
                    </div>

                    <div className="h-64 flex items-end justify-around gap-2 bg-gray-50 rounded-lg p-4">
                        {(!chartData || chartData.length === 0) ? (
                            <div className="w-full flex items-center justify-center text-gray-400">
                                No data available
                            </div>
                        ) : (
                            chartData.map((metric, idx) => {
                                const maxValue = Math.max(
                                    ...chartData.map(d =>
                                        selectedMetric === 'revenue' ? d.revenue || 0 :
                                        selectedMetric === 'orders' ? d.orders || 0 :
                                        d.itemsSold || 0
                                    )
                                ) || 1;

                                const value =
                                    selectedMetric === 'revenue' ? metric.revenue || 0 :
                                    selectedMetric === 'orders' ? metric.orders || 0 :
                                    metric.itemsSold || 0;

                                const height = (value / maxValue) * 100;

                                return (
                                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                                        <div className="relative w-full h-40 bg-white rounded-lg border-2 border-gray-200 overflow-hidden flex items-end">
                                            <div
                                                className="w-full bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-300 hover:from-blue-700 hover:to-blue-500"
                                                style={{ height: `${height}%` }}
                                            />
                                        </div>
                                        <span className="text-xs text-gray-600 truncate w-full text-center">
                                            {new Date(metric.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* ORDER STATUS DISTRIBUTION */}
                <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-600" />
                        Order Status Distribution
                    </h3>

                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-700 font-medium">Pending</span>
                                <span className="font-bold">{orderStats?.pendingCount || 0}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                <div
                                    className="bg-yellow-500 h-3 rounded-full transition-all"
                                    style={{
                                        width: `${((orderStats?.pendingCount || 0) / Math.max(orderStats?.totalOrders || 1, 1)) * 100}%`
                                    }}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-700 font-medium">Processing</span>
                                <span className="font-bold">{orderStats?.processingCount || 0}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                <div
                                    className="bg-blue-500 h-3 rounded-full transition-all"
                                    style={{
                                        width: `${((orderStats?.processingCount || 0) / Math.max(orderStats?.totalOrders || 1, 1)) * 100}%`
                                    }}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-700 font-medium">Delivered</span>
                                <span className="font-bold">{orderStats?.deliveredCount || 0}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                <div
                                    className="bg-green-500 h-3 rounded-full transition-all"
                                    style={{
                                        width: `${((orderStats?.deliveredCount || 0) / Math.max(orderStats?.totalOrders || 1, 1)) * 100}%`
                                    }}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex justify-between text-sm mb-2">
                                <span className="text-gray-700 font-medium">Cancelled</span>
                                <span className="font-bold">{orderStats?.cancelledCount || 0}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                <div
                                    className="bg-red-500 h-3 rounded-full transition-all"
                                    style={{
                                        width: `${((orderStats?.cancelledCount || 0) / Math.max(orderStats?.totalOrders || 1, 1)) * 100}%`
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* TOP PRODUCTS TABLE */}
            {topProducts && topProducts.length > 0 && (
                <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">🏆 Top Selling Products</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left text-gray-600 border-b-2 border-gray-200">
                                <tr>
                                    <th className="py-3 px-4">Rank</th>
                                    <th className="py-3 px-4">Product</th>
                                    <th className="py-3 px-4">Units Sold</th>
                                    <th className="py-3 px-4">Revenue</th>
                                    <th className="py-3 px-4">Rating</th>
                                </tr>
                            </thead>
                            <tbody>
                                {topProducts.map((product, idx) => (
                                    <tr key={idx} className="border-b hover:bg-gray-50 transition-colors">
                                        <td className="py-3 px-4">
                                            <span className={`inline-block w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                                                idx === 0 ? 'bg-yellow-500' :
                                                idx === 1 ? 'bg-gray-400' :
                                                'bg-orange-500'
                                            }`}>
                                                {idx + 1}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 font-medium text-gray-900">{product.productName || 'N/A'}</td>
                                        <td className="py-3 px-4">{product.unitsSold || 0}</td>
                                        <td className="py-3 px-4 font-bold text-green-600">₹{(product.revenue || 0).toLocaleString()}</td>
                                        <td className="py-3 px-4">
                                            <span className="flex items-center gap-1">
                                                <span>⭐</span>
                                                {product.averageRating || 'N/A'}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* SALES BY CATEGORY */}
            {salesByCategory && salesByCategory.length > 0 && (
                <div className="bg-white rounded-xl shadow p-6">
                    <h3 className="text-lg font-semibold mb-4">📈 Sales by Category</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {salesByCategory.map((cat, idx) => {
                            const maxRevenue = Math.max(...salesByCategory.map(c => c.revenue || 0)) || 1;
                            const percentage = ((cat.revenue || 0) / maxRevenue) * 100;

                            return (
                                <div key={idx} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all">
                                    <div className="flex justify-between items-center mb-2">
                                        <h4 className="font-semibold text-gray-900">{cat.categoryName || 'N/A'}</h4>
                                        <span className="text-lg font-bold text-blue-600">₹{(cat.revenue || 0).toLocaleString()}</span>
                                    </div>
                                    <p className="text-sm text-gray-600 mb-3">
                                        {cat.totalSales || 0} orders • {cat.unitsSold || 0} units
                                    </p>
                                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                        <div
                                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all"
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SalesReportTab;