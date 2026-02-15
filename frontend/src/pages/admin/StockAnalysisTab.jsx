import React, { useState, useEffect } from 'react';
import { Package, TrendingUp, AlertCircle, BarChart3, Download, RefreshCw } from 'lucide-react';
import { adminAPI } from '../../api';

const StockAnalysisTab = () => {
    const [stockAnalysis, setStockAnalysis] = useState([]);
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [stockByCategory, setStockByCategory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [sortBy, setSortBy] = useState('stock-asc');

    // Load stock analysis on mount
    useEffect(() => {
        fetchStockAnalysis();
    }, []);

    // ✅ FIXED: Proper stock analysis fetching
    const fetchStockAnalysis = async () => {
        console.group('📊 Fetching Stock Analysis');
        setLoading(true);
        setError('');

        try {
            console.log('🔄 Calling adminAPI.getStockAnalysis()...');
            const response = await adminAPI.getStockAnalysis();
            console.log('✅ Stock analysis response:', response.data);

            const data = response.data;

            // Extract stock analysis (array of products with stock info)
            const analysisArray = Array.isArray(data) 
                ? data 
                : data.lowStockItems || data.stockAnalysis || [];

            console.log('📦 Stock analysis array:', analysisArray);

            // Extract low stock items
            const lowStock = Array.isArray(data.lowStockItems) 
                ? data.lowStockItems 
                : analysisArray.filter(item => {
                    const qty = getNumber(item.quantity || item.currentStock || item.stockQuantity);
                    const minStock = getNumber(item.minimumStock || item.reorderLevel, 10);
                    return qty > 0 && qty <= minStock;
                });

            console.log('⚠️ Low stock items:', lowStock);

            // Extract category breakdown
            const categoryBreakdown = Array.isArray(data.stockByCategory) 
                ? data.stockByCategory 
                : groupByCategory(analysisArray);

            console.log('📊 Stock by category:', categoryBreakdown);

            setStockAnalysis(analysisArray);
            setLowStockProducts(lowStock);
            setStockByCategory(categoryBreakdown);

            console.log('✅ Stock analysis loaded successfully');
        } catch (err) {
            console.error('❌ Stock analysis error:', err);
            console.error('Error response:', err.response?.data);
            setError(
                err.response?.data?.message || 
                err.message || 
                'Failed to load stock analysis. Please try again.'
            );
            
            // Set empty arrays to prevent crashes
            setStockAnalysis([]);
            setLowStockProducts([]);
            setStockByCategory([]);
        } finally {
            setLoading(false);
            console.groupEnd();
        }
    };

    // Helper: Group products by category
    const groupByCategory = (products) => {
        if (!Array.isArray(products) || products.length === 0) return [];

        const grouped = products.reduce((acc, item) => {
            const category = getCategoryString(item);
            
            if (!acc[category]) {
                acc[category] = {
                    category: category,
                    productCount: 0,
                    totalStock: 0,
                    totalValue: 0,
                    items: []
                };
            }

            const qty = getNumber(item.quantity || item.stockQuantity);
            const price = getNumber(item.price);

            acc[category].productCount++;
            acc[category].totalStock += qty;
            acc[category].totalValue += qty * price;
            acc[category].items.push(item);

            return acc;
        }, {});

        return Object.values(grouped).sort((a, b) => b.totalValue - a.totalValue);
    };

    // Helper: Safe number extraction
    const getNumber = (value, defaultVal = 0) => {
        const num = parseFloat(value);
        return isNaN(num) ? defaultVal : num;
    };

    // Helper: Safe category string extraction
    const getCategoryString = (item) => {
        if (!item) return 'Uncategorized';
        
        const cat = item.category || item.categoryName || item.Category;
        
        if (typeof cat === 'string') {
            return cat;
        } else if (cat && typeof cat === 'object') {
            return String(cat.name || cat.Name || 'Uncategorized');
        }
        
        return 'Uncategorized';
    };

    // Helper: Safe product name extraction
    const getProductName = (item) => {
        if (!item) return 'Unknown Product';
        const name = item.productName || item.name || item.ProductName || item.Name;
        return String(name || 'Unknown Product');
    };

    // Helper: Safe brand extraction
    const getBrandString = (item) => {
        if (!item) return 'No brand';
        const brand = item.brand || item.Brand;
        return String(brand || 'No brand');
    };

    // Filter and sort products
    const filteredProducts = stockAnalysis
        .filter(item => !filterCategory || getCategoryString(item) === filterCategory)
        .sort((a, b) => {
            if (sortBy === 'stock-asc') {
                return getNumber(a.quantity || a.stockQuantity) - getNumber(b.quantity || b.stockQuantity);
            }
            if (sortBy === 'stock-desc') {
                return getNumber(b.quantity || b.stockQuantity) - getNumber(a.quantity || a.stockQuantity);
            }
            if (sortBy === 'value-desc') {
                const aValue = getNumber(a.price) * getNumber(a.quantity || a.stockQuantity);
                const bValue = getNumber(b.price) * getNumber(b.quantity || b.stockQuantity);
                return bValue - aValue;
            }
            return 0;
        });

    // Calculate totals
    const totalValue = stockAnalysis.reduce((sum, item) => {
        const price = getNumber(item.price);
        const qty = getNumber(item.quantity || item.stockQuantity);
        return sum + (price * qty);
    }, 0);

    const outOfStockCount = stockAnalysis.filter(item => 
        getNumber(item.quantity || item.stockQuantity) === 0
    ).length;

    // Get unique categories for filter
    const uniqueCategories = Array.from(
        new Set(stockByCategory.map(c => getCategoryString(c)).filter(Boolean))
    );

    // Update stock handler
    const handleUpdateStock = async (productId, product) => {
        const productName = getProductName(product);
        const currentStock = getNumber(product.quantity || product.stockQuantity);
        
        const newQty = window.prompt(
            `Update stock for "${productName}"\nCurrent: ${currentStock} units\n\nEnter new quantity:`,
            String(currentStock)
        );
        
        if (newQty === null) return;
        
        const qty = Number(newQty);
        if (isNaN(qty) || qty < 0) {
            alert('Please enter a valid quantity');
            return;
        }
        
        setLoading(true);
        setError('');
        
        try {
            console.log(`📦 Updating stock for product ${productId} to ${qty}`);
            
            // Try adminAPI.updateStock first
            if (typeof adminAPI.updateStock === 'function') {
                await adminAPI.updateStock(productId, qty);
            } 
            // Fallback to updateProduct
            else if (typeof adminAPI.updateProduct === 'function') {
                await adminAPI.updateProduct(productId, { 
                    ...product,
                    stockQuantity: qty 
                });
            }
            
            // Refresh stock analysis
            await fetchStockAnalysis();
            
            alert(`✅ Stock updated to ${qty} units`);
        } catch (err) {
            console.error('Stock update error:', err);
            setError(err.response?.data?.message || err.message || 'Failed to update stock');
        } finally {
            setLoading(false);
        }
    };

    // Export to CSV
    const exportToCSV = () => {
        const headers = ['Product Name', 'Category', 'Brand', 'Current Stock', 'Min Threshold', 'Unit Price', 'Inventory Value', 'Status'];
        const rows = filteredProducts.map(item => {
            const qty = getNumber(item.quantity || item.stockQuantity);
            const price = getNumber(item.price);
            const minStock = getNumber(item.minimumStock || item.reorderLevel, 10);
            
            return [
                getProductName(item),
                getCategoryString(item),
                getBrandString(item),
                qty,
                minStock,
                price,
                (price * qty).toLocaleString(),
                qty === 0 ? 'Out of Stock' : qty < minStock ? 'Low Stock' : 'Good'
            ];
        });

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
                        onClick={fetchStockAnalysis}
                        disabled={loading}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all disabled:opacity-50 font-medium"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        {loading ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <button
                        onClick={exportToCSV}
                        disabled={filteredProducts.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:border-green-400 hover:bg-green-50 transition-all font-medium disabled:opacity-50"
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
                    <p className="text-3xl font-bold text-gray-900">{stockAnalysis.length}</p>
                    <p className="text-xs text-gray-400 mt-2">In inventory</p>
                </div>

                <div className="bg-white rounded-xl shadow p-5 border border-orange-200 bg-orange-50 hover:shadow-lg transition-all">
                    <p className="text-sm text-orange-700 mb-2 font-semibold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4" />
                        Low Stock Items
                    </p>
                    <p className="text-3xl font-bold text-orange-600">{lowStockProducts.length}</p>
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
            {lowStockProducts.length > 0 && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6">
                    <h3 className="text-lg font-bold text-orange-900 mb-4 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        ⚠️ Low Stock Alert ({lowStockProducts.length} items)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {lowStockProducts.slice(0, 6).map((product, idx) => {
                            const qty = getNumber(product.quantity || product.currentStock || product.stockQuantity);
                            const price = getNumber(product.price);
                            const minStock = getNumber(product.minimumStock || product.reorderLevel, 10);
                            const productId = product.productId || product.id || product._id;
                            
                            return (
                                <div key={idx} className="bg-white p-3 rounded-lg border border-orange-100 hover:border-orange-300 transition-all">
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex-1">
                                            <p className="font-semibold text-gray-900 text-sm line-clamp-1">
                                                {getProductName(product)}
                                            </p>
                                            <p className="text-xs text-gray-600">{getCategoryString(product)}</p>
                                        </div>
                                        <span className="text-xs font-bold bg-orange-100 text-orange-700 px-2 py-1 rounded whitespace-nowrap">
                                            {qty} units
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs mb-2">
                                        <span className="text-gray-600">Min: {minStock}</span>
                                        <span className="text-gray-600">₹{price}</span>
                                    </div>
                                    <button
                                        onClick={() => handleUpdateStock(productId, product)}
                                        disabled={loading}
                                        className="w-full px-3 py-1.5 bg-orange-600 text-white rounded text-xs font-semibold hover:bg-orange-700 transition-all disabled:opacity-50"
                                    >
                                        📦 Restock
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                    {lowStockProducts.length > 6 && (
                        <p className="text-sm text-orange-700 mt-3 font-medium">
                            +{lowStockProducts.length - 6} more low stock items
                        </p>
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
                        {uniqueCategories.map(cat => (
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
            {stockByCategory.length > 0 && (
                <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">📊 Stock by Category</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {stockByCategory.map((cat, idx) => {
                            const categoryName = getCategoryString(cat);
                            const itemCount = getNumber(cat.productCount || cat.items?.length, 0);
                            const totalQty = getNumber(cat.totalStock || cat.totalQuantity, 0);
                            const totalVal = getNumber(cat.totalValue, 0);
                            
                            return (
                                <div key={idx} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all">
                                    <div className="flex justify-between items-start mb-3">
                                        <h4 className="font-semibold text-gray-900">{categoryName}</h4>
                                        <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                            {itemCount} items
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center mb-3">
                                        <div>
                                            <p className="text-sm text-gray-600">{totalQty} units</p>
                                            <p className="text-lg font-bold text-blue-600">₹{totalVal.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                        <div
                                            className="bg-blue-500 h-2 rounded-full transition-all"
                                            style={{ width: `${Math.min(100, Math.max(0, (totalQty / 100) * 100))}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Complete Inventory Table */}
            <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
                <h3 className="text-lg font-bold text-gray-900 mb-4">📦 Complete Inventory</h3>
                {loading ? (
                    <div className="text-center py-12">
                        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading inventory...</p>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                        <Package className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                        <p className="text-gray-600 font-semibold">No products found</p>
                        <button
                            onClick={fetchStockAnalysis}
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
                        >
                            Refresh Stock Data
                        </button>
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
                                    <th className="py-3 px-4 font-semibold">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map((stock, idx) => {
                                    const qty = getNumber(stock.quantity || stock.stockQuantity);
                                    const price = getNumber(stock.price);
                                    const minStock = getNumber(stock.minimumStock || stock.reorderLevel, 10);
                                    const isOutOfStock = qty === 0;
                                    const isLowStock = qty < minStock && !isOutOfStock;
                                    const productId = stock.productId || stock.id || stock._id;
                                    
                                    return (
                                        <tr
                                            key={idx}
                                            className={`border-b hover:bg-gray-50 transition-colors ${
                                                isOutOfStock ? 'bg-red-50' : isLowStock ? 'bg-orange-50' : ''
                                            }`}
                                        >
                                            <td className="py-3 px-4">
                                                <div>
                                                    <p className="font-medium text-gray-900">{getProductName(stock)}</p>
                                                    <p className="text-xs text-gray-500">{getBrandString(stock)}</p>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-gray-600">{getCategoryString(stock)}</td>
                                            <td className="py-3 px-4 text-right">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                    isOutOfStock ? 'bg-red-100 text-red-700' :
                                                    isLowStock ? 'bg-orange-100 text-orange-700' :
                                                    'bg-green-100 text-green-700'
                                                }`}>
                                                    {qty}
                                                </span>
                                            </td>
                                            <td className="py-3 px-4 text-right font-medium text-gray-900">
                                                ₹{price.toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4 text-right font-bold text-blue-600">
                                                ₹{(price * qty).toLocaleString()}
                                            </td>
                                            <td className="py-3 px-4">
                                                {isOutOfStock && (
                                                    <span className="text-xs font-bold px-2 py-1 bg-red-100 text-red-700 rounded-full">
                                                        🔴 Out
                                                    </span>
                                                )}
                                                {isLowStock && (
                                                    <span className="text-xs font-bold px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                                                        🟠 Low
                                                    </span>
                                                )}
                                                {!isOutOfStock && !isLowStock && (
                                                    <span className="text-xs font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full">
                                                        🟢 Good
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">
                                                <button
                                                    onClick={() => handleUpdateStock(productId, stock)}
                                                    disabled={loading}
                                                    className="px-3 py-1 bg-blue-50 text-blue-600 rounded text-xs font-semibold hover:bg-blue-100 transition-all disabled:opacity-50"
                                                >
                                                    Update
                                                </button>
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