import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, AlertCircle, BarChart3, Download, RefreshCw } from 'lucide-react';

const StockAnalysisTab = ({
    stockAnalysis = [],
    lowStockProducts = [],
    stockByCategory = [],
    loading = false,
    error = '',
    onRefresh = () => {},
    onUpdateStock = () => {}
}) => {
    const [filterCategory, setFilterCategory] = useState('');
    const [sortBy, setSortBy] = useState('stock-asc');

    // Filter and sort products
    const filteredProducts = stockAnalysis
        .filter(item => !filterCategory || item.category === filterCategory)
        .sort((a, b) => {
            if (sortBy === 'stock-asc') return (a.quantity || 0) - (b.quantity || 0);
            if (sortBy === 'stock-desc') return (b.quantity || 0) - (a.quantity || 0);
            if (sortBy === 'value-desc') return ((b.price || 0) * (b.quantity || 0)) - ((a.price || 0) * (a.quantity || 0));
            return 0;
        });

    // Calculate totals
    const totalValue = stockAnalysis.reduce((sum, item) => sum + ((item.price || 0) * (item.quantity || 0)), 0);
    const outOfStockCount = stockAnalysis.filter(item => (item.quantity || 0) === 0).length;
    const averageStockLevel = stockAnalysis.length > 0 ? Math.round(stockAnalysis.reduce((sum, item) => sum + (item.quantity || 0), 0) / stockAnalysis.length) : 0;

    // Export to CSV
    const exportToCSV = () => {
        const headers = ['Product Name', 'Category', 'Brand', 'Current Stock', 'Min Threshold', 'Unit Price', 'Inventory Value', 'Status'];
        const rows = filteredProducts.map(item => [
            item.productName || item.name,
            item.category || 'Uncategorized',
            item.brand || 'N/A',
            item.quantity || 0,
            item.minimumStock || 10,
            item.price || 0,
            ((item.price || 0) * (item.quantity || 0)).toLocaleString(),
            (item.quantity || 0) === 0 ? 'Out of Stock' : (item.quantity || 0) < (item.minimumStock || 10) ? 'Low Stock' : 'Good'
        ]);

        const csv = [headers, ...rows]
            .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `stock-analysis-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6">
            {/* Header with Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">📦 Stock Analysis</h2>
                    <p className="text-sm text-gray-600 mt-1">Real-time inventory tracking and insights</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={onRefresh}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all disabled:opacity-50 font-medium"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all font-medium"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <p>{error}</p>
                </div>
            )}

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow p-5 border border-gray-100 hover:shadow-lg transition-all">
                    <p className="text-sm text-gray-500 mb-2 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Total Products
                    </p>
                    <p className="text-3xl font-bold text-gray-900">{stockAnalysis?.length || 0}</p>
                    <p className="text-xs text-gray-400 mt-2">In inventory</p>
                </div>

                <div className="bg-white rounded-xl shadow p-5 border border-orange-200 bg-orange-50 hover:shadow-lg transition-all">
                    <p className="text-sm text-orange-700 mb-2 font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Low Stock Items
                    </p>
                    <p className="text-3xl font-bold text-orange-600">{lowStockProducts?.length || 0}</p>
                    <p className="text-xs text-orange-600 mt-2">Below threshold</p>
                </div>

                <div className="bg-white rounded-xl shadow p-5 border border-red-200 bg-red-50 hover:shadow-lg transition-all">
                    <p className="text-sm text-red-700 mb-2 font-semibold flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 rotate-180" />
                        Out of Stock
                    </p>
                    <p className="text-3xl font-bold text-red-600">{outOfStockCount}</p>
                    <p className="text-xs text-red-600 mt-2">Urgent reorder</p>
                </div>

                <div className="bg-white rounded-xl shadow p-5 border border-blue-200 bg-blue-50 hover:shadow-lg transition-all">
                    <p className="text-sm text-blue-700 mb-2 font-semibold flex items-center gap-2">
                        <BarChart3 className="w-4 h-4" />
                        Inventory Value
                    </p>
                    <p className="text-2xl font-bold text-blue-600">₹{totalValue.toLocaleString()}</p>
                    <p className="text-xs text-blue-600 mt-2">Estimated value</p>
                </div>
            </div>

            {/* Low Stock Alert */}
            {lowStockProducts && lowStockProducts.length > 0 && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-orange-900 mb-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        ⚠️ Low Stock Alert ({lowStockProducts.length} items)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {lowStockProducts.slice(0, 6).map((product, idx) => (
                            <div key={idx} className="bg-white p-3 rounded-lg border border-orange-100 hover:border-orange-300 transition-all">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-900 text-sm line-clamp-1">{product.productName || product.name}</p>
                                        <p className="text-xs text-gray-600">{product.category || 'Uncategorized'}</p>
                                    </div>
                                    <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded whitespace-nowrap">
                                        {product.quantity || 0} units
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs mb-2">
                                    <span className="text-gray-600">Min: {product.minimumStock || 10}</span>
                                    <span className="text-gray-600">₹{product.price || 0}</span>
                                </div>
                                <button
                                    onClick={() => onUpdateStock(product.id || product.productId, product)}
                                    className="w-full px-3 py-1.5 bg-orange-600 text-white rounded text-xs font-semibold hover:bg-orange-700 transition-all"
                                >
                                    📦 Restock
                                </button>
                            </div>
                        ))}
                    </div>
                    {lowStockProducts.length > 6 && (
                        <p className="text-sm text-orange-700 mt-3 font-medium">+{lowStockProducts.length - 6} more low stock items</p>
                    )}
                </div>
            )}

            {/* Filters & Sort */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white rounded-xl p-4 border border-gray-100">
                <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Filter by Category</label>
                    <select
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                        <option value="">All Categories</option>
                        {Array.from(new Set((stockByCategory || []).map(c => c.category))).map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                <div className="flex-1">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Sort By</label>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                        <option value="stock-asc">Stock: Low to High</option>
                        <option value="stock-desc">Stock: High to Low</option>
                        <option value="value-desc">Inventory Value: High to Low</option>
                    </select>
                </div>
            </div>

            {/* Stock by Category */}
            {stockByCategory && stockByCategory.length > 0 && (
                <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Stock by Category</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {stockByCategory.map((cat, idx) => (
                            <div key={idx} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-3">
                                    <h4 className="font-semibold text-gray-900">{cat.category || 'Uncategorized'}</h4>
                                    <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                        {cat.items?.length || 0} items
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mb-3">
                                    <div>
                                        <p className="text-sm text-gray-600">{cat.totalQuantity || 0} units</p>
                                        <p className="text-lg font-bold text-blue-600">₹{(cat.totalValue || 0).toLocaleString()}</p>
                                    </div>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-500 h-2 rounded-full transition-all"
                                        style={{
                                            width: `${Math.min(100, ((cat.totalQuantity || 0) / 100) * 100)}%`
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Complete Inventory Table */}
            <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">📦 Complete Inventory</h3>
                {filteredProducts.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                        <Package className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                        <p className="text-gray-600 font-semibold">No products found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-left text-gray-600 border-b bg-gray-50">
                                <tr>
                                    <th className="py-3 px-4 font-semibold">Product</th>
                                    <th className="py-3 px-4 font-semibold">Category</th>
                                    <th className="py-3 px-4 font-semibold text-right">Stock</th>
                                    <th className="py-3 px-4 font-semibold text-right">Price</th>
                                    <th className="py-3 px-4 font-semibold text-right">Value</th>
                                    <th className="py-3 px-4 font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map((stock, idx) => {
                                    const isOutOfStock = (stock.quantity || 0) === 0;
                                    const isLowStock = (stock.quantity || 0) < (stock.minimumStock || 10) && !isOutOfStock;
                                    
                                    return (
                                        <tr
                                            key={idx}
                                            className={`border-b hover:bg-gray-50 transition-colors ${
                                                isOutOfStock ? 'bg-red-50' : isLowStock ? 'bg-orange-50' : ''
                                            }`}
                                        >
                                            <td className="py-3 px-4">
                                                <div>
                                                    <p className="font-medium text-gray-900">{stock.productName || stock.name}</p>
                                                    <p className="text-xs text-gray-500">{stock.brand || 'No brand'}</p>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-gray-600">{stock.category || 'Uncategorized'}</td>
                                            <td className="py-3 px-4 text-right">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                    isOutOfStock ? 'bg-red-100 text-red-700' :
                                                    isLowStock ? 'bg-orange-100 text-orange-700' :
                                                    'bg-green-100 text-green-700'
                                                }`}>
                                                    {stock.quantity || 0}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right font-medium text-gray-900">₹{(stock.price || 0).toLocaleString()}</td>
                                            <td className="py-3 px-4 text-right font-bold text-blue-600">
                                                ₹{((stock.price || 0) * (stock.quantity || 0)).toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4">
                                                {isOutOfStock && <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-700 rounded-full">🔴 Out</span>}
                                                {isLowStock && <span className="text-xs font-bold px-2 py-1 bg-orange-100 text-orange-700 rounded-full">🟠 Low</span>}
                                                {!isOutOfStock && !isLowStock && <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full">🟢 Good</span>}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockAnalysisTab;