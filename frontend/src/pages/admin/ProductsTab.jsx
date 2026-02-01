import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Search, Package, TrendingUp, AlertCircle } from 'lucide-react';

const ProductsTab = ({ 
    products = [], 
    onAddProduct, 
    onUpdateProduct, 
    onDeleteProduct,
    loading = false,
    error = null,
    categories = []
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        brand: '',
        price: 0,
        stockQuantity: 0,
        description: '',
        specifications: '',
        category: '',
        imageUrl: ''
    });

    // Filter products
    const filteredProducts = (products || []).filter(product => {
        const matchesSearch = 
            (product.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (product.brand?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
            (product.description?.toLowerCase() || '').includes(searchQuery.toLowerCase());
        
        const matchesCategory = !filterCategory || 
            (product.category || '').includes(filterCategory) ||
            (product.categoryId || '').toString() === filterCategory;
        
        return matchesSearch && matchesCategory;
    });

    // Reset form
    const resetForm = () => {
        setFormData({
            name: '',
            brand: '',
            price: 0,
            stockQuantity: 0,
            description: '',
            specifications: '',
            category: '',
            imageUrl: ''
        });
        setEditingId(null);
        setShowAddForm(false);
    };

    // Handle edit
    const handleEdit = (product) => {
        setFormData({
            name: product.name || '',
            brand: product.brand || '',
            price: product.price || 0,
            stockQuantity: product.stockQuantity || 0,
            description: product.description || '',
            specifications: product.specifications || product.specs || '',
            category: product.category || product.categoryId || '',
            imageUrl: product.imageUrl || product.image || ''
        });
        setEditingId(product.id);
        setShowAddForm(true);
    };

    // Handle submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.name.trim()) {
            alert('Product name is required');
            return;
        }
        
        if (formData.price <= 0) {
            alert('Price must be greater than 0');
            return;
        }

        try {
            if (editingId) {
                await onUpdateProduct(editingId, formData);
            } else {
                await onAddProduct(formData);
            }
            resetForm();
        } catch (err) {
            console.error('Form submission error:', err);
        }
    };

    // Get unique categories from products
    const uniqueCategories = Array.from(
        new Set((products || []).map(p => p.category || p.categoryName || 'Uncategorized'))
    ).filter(Boolean);

    return (
        <div className="space-y-6 p-6 bg-gradient-to-b from-gray-50 to-white rounded-lg">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Package className="w-7 h-7 text-blue-600" />
                        Products Management
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                        {filteredProducts.length} of {products.length} products
                    </p>
                </div>
                <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg font-bold transition-all active:scale-95 flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    {showAddForm ? 'Cancel' : 'Add Product'}
                </button>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                        <p className="font-medium">Error</p>
                        <p className="text-sm">{error}</p>
                    </div>
                </div>
            )}

            {/* Add/Edit Form */}
            {showAddForm && (
                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                    <h3 className="text-lg font-bold mb-4">
                        {editingId ? 'Edit Product' : 'Add New Product'}
                    </h3>
                    
                    <form onSubmit={handleSubmit} className="grid md:grid-cols-2 gap-4">
                        {/* Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Product Name *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                placeholder="e.g., Premium Smartphone X1"
                                required
                            />
                        </div>

                        {/* Brand */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Brand
                            </label>
                            <input
                                type="text"
                                value={formData.brand}
                                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                placeholder="e.g., TechBrand"
                            />
                        </div>

                        {/* Price */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Price (₹) *
                            </label>
                            <input
                                type="number"
                                value={formData.price}
                                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                placeholder="9999"
                                min="0"
                                step="0.01"
                                required
                            />
                        </div>

                        {/* Stock Quantity */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Stock Quantity *
                            </label>
                            <input
                                type="number"
                                value={formData.stockQuantity}
                                onChange={(e) => setFormData({ ...formData, stockQuantity: Number(e.target.value) })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                placeholder="100"
                                min="0"
                                required
                            />
                        </div>

                        {/* Category */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Category
                            </label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                            >
                                <option value="">Select a category</option>
                                {uniqueCategories.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Image URL */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Image URL
                            </label>
                            <input
                                type="url"
                                value={formData.imageUrl}
                                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                placeholder="https://example.com/image.jpg"
                            />
                        </div>

                        {/* Description - Full Width */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Description
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                placeholder="Product description..."
                                rows="3"
                            />
                        </div>

                        {/* Specifications - Full Width */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Specifications
                            </label>
                            <textarea
                                value={formData.specifications}
                                onChange={(e) => setFormData({ ...formData, specifications: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                placeholder="e.g., 6GB RAM, 128GB Storage, 48MP Camera"
                                rows="2"
                            />
                        </div>

                        {/* Buttons */}
                        <div className="md:col-span-2 flex gap-3 pt-4 border-t">
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Plus className="w-4 h-4" />
                                        {editingId ? 'Update Product' : 'Create Product'}
                                    </>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-bold transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search products..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                </div>
                
                <select
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                    <option value="">All Categories</option>
                    {uniqueCategories.map((cat) => (
                        <option key={cat} value={cat}>
                            {cat}
                        </option>
                    ))}
                </select>
            </div>

            {/* Products Grid */}
            {filteredProducts.length === 0 ? (
                <div className="bg-white rounded-xl shadow p-12 text-center border border-gray-100">
                    <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700">No products found</h3>
                    <p className="text-sm text-gray-500 mt-2">
                        {searchQuery || filterCategory ? 'Try adjusting your search' : 'Create your first product to get started'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProducts.map((product) => (
                        <div
                            key={product.id}
                            className="bg-white rounded-xl shadow-md hover:shadow-xl overflow-hidden border border-gray-100 transform hover:-translate-y-1 transition-all duration-300 flex flex-col group"
                        >
                            {/* Product Image */}
                            <div className="relative h-48 bg-gray-200 overflow-hidden">
                                <img
                                    src={product.imageUrl || product.image || 'https://via.placeholder.com/300x300?text=No+Image'}
                                    alt={product.name}
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                                    onError={(e) => {
                                        e.target.src = 'https://via.placeholder.com/300x300?text=Product';
                                    }}
                                />
                                
                                {/* Stock Badge */}
                                <div
                                    className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-bold text-white ${
                                        product.stockQuantity > 20
                                            ? 'bg-green-500'
                                            : product.stockQuantity > 5
                                            ? 'bg-yellow-500'
                                            : 'bg-red-500'
                                    }`}
                                >
                                    {product.stockQuantity} in stock
                                </div>

                                {/* Price Badge */}
                                <div className="absolute top-3 right-3 bg-blue-600 text-white px-3 py-1 rounded-full font-bold text-sm shadow-lg">
                                    ₹{product.price?.toLocaleString()}
                                </div>
                            </div>

                            {/* Product Info */}
                            <div className="p-4 flex-1 flex flex-col">
                                <div className="mb-3">
                                    <p className="text-xs text-gray-500 uppercase font-semibold">
                                        {product.brand || product.category || 'Product'}
                                    </p>
                                    <h3 className="font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                                        {product.name}
                                    </h3>
                                </div>

                                {/* Description */}
                                {product.description && (
                                    <p className="text-xs text-gray-600 line-clamp-2 mb-2">
                                        {product.description}
                                    </p>
                                )}

                                {/* Specs */}
                                {(product.specifications || product.specs) && (
                                    <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded mb-3 line-clamp-2">
                                        {product.specifications || product.specs}
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100">
                                    <button
                                        onClick={() => handleEdit(product)}
                                        className="flex-1 px-3 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100 transition-all font-medium text-sm flex items-center justify-center gap-2 group/btn"
                                    >
                                        <Edit2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm(`Delete "${product.name}"?`)) {
                                                onDeleteProduct(product.id);
                                            }
                                        }}
                                        className="flex-1 px-3 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-all font-medium text-sm flex items-center justify-center gap-2 group/btn"
                                    >
                                        <Trash2 className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Summary */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200 flex items-center justify-between">
                <div>
                    <p className="text-sm text-gray-600">Total Inventory Value</p>
                    <p className="text-3xl font-bold text-blue-600">
                        ₹{products.reduce((sum, p) => sum + (p.price * p.stockQuantity), 0).toLocaleString()}
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-600">Products with low stock</p>
                    <p className="text-3xl font-bold text-orange-600">
                        {products.filter(p => (p.stockQuantity || 0) < 10).length}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ProductsTab;