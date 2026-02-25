import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, ShoppingCart, Calendar, RefreshCw, AlertCircle, Download } from 'lucide-react';
import { adminAPI } from '/home/sidhu/Desktop/ECommerceAPI/frontend/src/api.js';

const SalesReportTab = ({ error, setError }) => {
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  
  // Initialize dateRange with proper default values
  const getDefaultDateRange = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    return {
      startDate: thirtyDaysAgo.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0]
    };
  };
  
  const [dateRange, setDateRange] = useState(getDefaultDateRange());

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await adminAPI.getSalesReport(dateRange.startDate, dateRange.endDate);
      const data = response?.data || null;
      setReportData(data);
    } catch (err) {
      console.error('Sales report error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch sales report');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (field, value) => {
    setDateRange(prev => ({ ...prev, [field]: value }));
  };

  const exportReport = () => {
    if (!reportData) {
      alert('No report data to export');
      return;
    }

    const csvContent = `
Sales Report (${dateRange.startDate} to ${dateRange.endDate})

Summary:
Total Revenue,₹${reportData.totalRevenue?.toLocaleString() || 0}
Total Orders,${reportData.totalOrders || 0}
Average Order Value,₹${reportData.averageOrderValue?.toLocaleString() || 0}

Top Products:
${(reportData.topProducts || []).map(p => `${p.name},₹${p.revenue},${p.unitsSold} units`).join('\n')}
    `.trim();

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${dateRange.startDate}-to-${dateRange.endDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            Sales Report
          </h2>
          <p className="text-gray-600 mt-1">Analyze revenue and sales performance</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={exportReport}
            disabled={!reportData || loading}
            className="flex items-center gap-2 px-5 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all font-semibold disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
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

      {/* Date Range Selector */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Calendar className="w-5 h-5 text-blue-600" />
          <h3 className="text-lg font-bold text-gray-900">Select Date Range</h3>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={fetchReport}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Generating...' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-16 text-center">
          <RefreshCw className="w-16 h-16 mx-auto text-blue-600 animate-spin mb-4" />
          <p className="text-gray-600 font-medium">Generating sales report...</p>
        </div>
      ) : !reportData ? (
        <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-16 text-center">
          <TrendingUp className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium">No report data available</p>
          <p className="text-sm text-gray-400 mt-1">Select a date range and click "Generate Report"</p>
        </div>
      ) : (
        <>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-md border border-green-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-green-100 p-3 rounded-xl">
                  <DollarSign className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-600 uppercase">Total Revenue</p>
              <p className="text-4xl font-bold text-green-600 mt-2">
                ₹{(reportData.totalRevenue || 0).toLocaleString()}
              </p>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-md border border-blue-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-blue-100 p-3 rounded-xl">
                  <ShoppingCart className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-600 uppercase">Total Orders</p>
              <p className="text-4xl font-bold text-blue-600 mt-2">
                {reportData.totalOrders || 0}
              </p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-md border border-purple-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="bg-purple-100 p-3 rounded-xl">
                  <TrendingUp className="w-6 h-6 text-purple-600" />
                </div>
              </div>
              <p className="text-sm font-semibold text-gray-600 uppercase">Avg Order Value</p>
              <p className="text-4xl font-bold text-purple-600 mt-2">
                ₹{(reportData.averageOrderValue || 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">Top Selling Products</h3>
              <p className="text-sm text-gray-600 mt-1">Best performers in selected period</p>
            </div>

            {!reportData.topProducts || reportData.topProducts.length === 0 ? (
              <div className="p-12 text-center">
                <p className="text-gray-500">No product data available</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Rank</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Product</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Units Sold</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Revenue</th>
                      <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">Avg Price</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {reportData.topProducts.map((product, idx) => (
                      <tr key={idx} className="hover:bg-blue-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                            idx === 0 ? 'bg-yellow-500' :
                            idx === 1 ? 'bg-gray-400' :
                            idx === 2 ? 'bg-orange-600' :
                            'bg-blue-500'
                          }`}>
                            {idx + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-gray-900">{product.name}</div>
                          <div className="text-xs text-gray-500">{product.brand || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 font-bold text-gray-900">
                          {product.unitsSold || 0} units
                        </td>
                        <td className="px-6 py-4 font-bold text-green-600">
                          ₹{(product.revenue || 0).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          ₹{(product.averagePrice || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Daily Sales Chart (Text-based) */}
          {reportData.dailySales && reportData.dailySales.length > 0 && (
            <div className="bg-white rounded-2xl shadow-md border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Daily Sales Trend</h3>
              <div className="space-y-3">
                {reportData.dailySales.map((day, idx) => {
                  const maxRevenue = Math.max(...reportData.dailySales.map(d => d.revenue));
                  const percentage = (day.revenue / maxRevenue) * 100;

                  return (
                    <div key={idx}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">
                          {new Date(day.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="font-bold text-blue-600">₹{day.revenue.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SalesReportTab;