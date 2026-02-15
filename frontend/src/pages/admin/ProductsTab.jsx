import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Edit2, Trash2, RefreshCw, AlertCircle, X } from 'lucide-react';
import { adminAPI } from '../../api';

/**
 * ProductsTab Component - COMPLETE FIX
 * ✅ Proper category handling (string-based)
 * ✅ Robust error handling
 * ✅ Clean MongoDB integration
 * ✅ Comprehensive validation
 */
const ProductsTab = ({ products, loadProducts, error, setError, loading, setLoading }) => {
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    price: '',
    stockQuantity: '',
    category: '',
    description: '',
    imageUrl: ''
  });

  // Update filtered products when products change
  useEffect(() => {
    if (products && Array.isArray(products)) {
      setFilteredProducts(products);
    }
  }, [products]);

  // Filter products when search changes
  useEffect(() => {
    filterProducts();
  }, [searchQuery, products]);

  const filterProducts = () => {
    if (!searchQuery.trim()) {
      setFilteredProducts(Array.isArray(products) ? products : []);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = (Array.isArray(products) ? products : []).filter(product => {
      if (!product || typeof product !== 'object') return false;
      
      const name = safeString(product.name).toLowerCase();
      const brand = safeString(product.brand).toLowerCase();
      const category = getCategoryString(product).toLowerCase();
      const description = safeString(product.description).toLowerCase();
      
      return name.includes(query) || 
             brand.includes(query) || 
             category.includes(query) || 
             description.includes(query);
    });

    setFilteredProducts(filtered);
  };

  const refreshProducts = async () => {
    setRefreshing(true);
    setError('');
    try {
      await loadProducts();
    } catch (err) {
      console.error('Refresh error:', err);
      setError(err.message || 'Failed to refresh products');
    } finally {
      setRefreshing(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      brand: '',
      price: '',
      stockQuantity: '',
      category: '',
      description: '',
      imageUrl: ''
    });
  };

  const validateForm = () => {
    if (!formData.name?.trim()) {
      throw new Error('Product name is required');
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      throw new Error('Valid price is required');
    }
    if (!formData.stockQuantity || parseInt(formData.stockQuantity) < 0) {
      throw new Error('Valid stock quantity is required');
    }
    if (!formData.category?.trim()) {
      throw new Error('Category is required');
    }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      validateForm();

      // ✅ FIXED: Send category as string in Specifications field
      const payload = {
        name: formData.name.trim(),
        brand: formData.brand.trim() || 'No Brand',
        price: parseFloat(formData.price),
        stockQuantity: parseInt(formData.stockQuantity),
        categoryId: 0, // Not using ID-based categories
        specifications: formData.category.trim(), // ✅ Category name goes here
        description: formData.description.trim() || '',
        imageUrl: formData.imageUrl.trim() || ''
      };

      console.log('📦 Adding product:', payload);
      await adminAPI.addProduct(payload);
      
      await loadProducts();
      setShowAddModal(false);
      resetForm();
      alert('✅ Product added successfully!');
    } catch (err) {
      console.error('Add product error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      validateForm();

      // ✅ FIXED: Send category as string in Specifications field
      const payload = {
        name: formData.name.trim(),
        brand: formData.brand.trim() || 'No Brand',
        price: parseFloat(formData.price),
        stockQuantity: parseInt(formData.stockQuantity),
        categoryId: 0, // Not using ID-based categories
        specifications: formData.category.trim(), // ✅ Category name goes here
        description: formData.description.trim() || '',
        imageUrl: formData.imageUrl.trim() || ''
      };

      console.log('✏️ Updating product:', editingProduct.id, payload);
      await adminAPI.updateProduct(editingProduct.id, payload);
      
      await loadProducts();
      setShowEditModal(false);
      setEditingProduct(null);
      resetForm();
      alert('✅ Product updated successfully!');
    } catch (err) {
      console.error('Update product error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (!window.confirm(`Delete "${productName}"? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      console.log('🗑️ Deleting product:', productId);
      await adminAPI.deleteProduct(productId);
      
      await loadProducts();
      alert(`✅ Product "${productName}" deleted successfully`);
    } catch (err) {
      console.error('Delete product error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to delete product');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    
    // Extract category as string
    const categoryValue = getCategoryString(product);
    
    setFormData({
      name: safeString(product.name),
      brand: safeString(product.brand),
      price: safeString(product.price),
      stockQuantity: safeString(product.stockQuantity),
      category: categoryValue,
      description: safeString(product.description),
      imageUrl: safeString(product.imageUrl)
    });
    setShowEditModal(true);
  };

  // Helper: Safe string extraction
  const safeString = (value) => {
    if (value === null || value === undefined) return '';
    return String(value);
  };

  // Helper: Extract category as string
  const getCategoryString = (product) => {
    if (!product) return 'Uncategorized';
    
    // Try multiple possible category field names
    if (typeof product.category === 'string') {
      return product.category;
    } else if (typeof product.categoryName === 'string') {
      return product.categoryName;
    } else if (product.category && typeof product.category === 'object') {
      return safeString(product.category.name || product.category.Name || 'Uncategorized');
    }
    
    return 'Uncategorized';
  };

  // Helper: Get stock status color
  const getStockStatus = (quantity) => {
    const qty = parseInt(quantity) || 0;
    if (qty === 0) return { color: 'red', text: '🔴 Out' };
    if (qty < 10) return { color: 'orange', text: '🟠 Low' };
    return { color: 'green', text: '🟢 Good' };
  };

  const ProductModal = ({ show, onClose, onSubmit, title, isEdit = false }) => {
    if (!show) return null;

    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-6 flex items-center justify-between sticky top-0 z-10">
            <h3 className="text-2xl font-bold">{title}</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-all"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <form onSubmit={onSubmit} className="p-8 space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="e.g., Premium Smartphone"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Brand *
                </label>
                <input
                  type="text"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="e.g., Apple"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Price (₹) *
                </label>
                <input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="9999"
                  min="0"
                  step="0.01"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Stock Quantity *
                </label>
                <input
                  type="number"
                  value={formData.stockQuantity}
                  onChange={(e) => setFormData({ ...formData, stockQuantity: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="100"
                  min="0"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Category *
                </label>
                <input
                  type="text"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="e.g., Electronics"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Examples: Mobiles, Laptops, Fashion, Books</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Image Filename
                </label>
                <input
                  type="text"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                  placeholder="product.jpg"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all h-24"
                placeholder="Product description..."
              />
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : isEdit ? 'Update Product' : 'Add Product'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 border-2 border-gray-300 text-gray-700 py-4 rounded-xl font-bold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            Product Inventory
          </h2>
          <p className="text-gray-600 mt-1">Manage your product catalog</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={refreshProducts}
            disabled={refreshing}
            className="flex items-center gap-2 px-5 py-3 bg-white border-2 border-gray-300 text-gray-700 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all font-semibold disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-md border border-blue-200 p-6">
          <p className="text-sm font-semibold text-gray-600 uppercase">Total Products</p>
          <p className="text-4xl font-bold text-blue-600 mt-2">{products?.length || 0}</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-md border border-green-200 p-6">
          <p className="text-sm font-semibold text-gray-600 uppercase">In Stock</p>
          <p className="text-4xl font-bold text-green-600 mt-2">
            {(products || []).filter(p => (parseInt(p.stockQuantity) || 0) > 0).length}
          </p>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-xl shadow-md border border-red-200 p-6">
          <p className="text-sm font-semibold text-gray-600 uppercase">Low Stock</p>
          <p className="text-4xl font-bold text-red-600 mt-2">
            {(products || []).filter(p => {
              const qty = parseInt(p.stockQuantity) || 0;
              return qty < 10 && qty > 0;
            }).length}
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-md border border-purple-200 p-6">
          <p className="text-sm font-semibold text-gray-600 uppercase">Showing</p>
          <p className="text-4xl font-bold text-purple-600 mt-2">{filteredProducts.length}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex items-center gap-4 bg-gray-50 rounded-xl px-5 py-3 border-2 border-gray-200 focus-within:border-blue-400 transition-all">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search products by name, brand, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Products Grid */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Product Catalog</h3>
          <p className="text-sm text-gray-600 mt-1">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
          </p>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center">
            <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">
              {searchQuery ? 'No products match your search' : 'No products in inventory'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {searchQuery ? 'Try a different search term' : 'Add your first product to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredProducts.map((product) => {
              const categoryString = getCategoryString(product);
              const stockStatus = getStockStatus(product.stockQuantity);
              
              return (
                <div
                  key={product.id || product._id}
                  className="border-2 border-gray-200 rounded-xl overflow-hidden hover:border-blue-400 hover:shadow-lg transition-all duration-300 bg-white"
                >
                  <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative">
                    {product.imageUrl ? (
                      <img
                        src={`/images/${product.imageUrl}`}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/400x300/e5e7eb/9ca3af?text=Product';
                        }}
                      />
                    ) : (
                      <Package className="w-16 h-16 text-gray-400" />
                    )}
                    <div className="absolute top-3 left-3 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                      {categoryString}
                    </div>
                    <div className="absolute top-3 right-3 bg-white px-3 py-1 rounded-full text-sm font-bold text-gray-900">
                      ₹{(parseFloat(product.price) || 0).toLocaleString()}
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="mb-3">
                      <p className="text-xs text-gray-500 mb-1">{product.brand || 'No Brand'}</p>
                      <h4 className="font-bold text-gray-900 text-lg line-clamp-2">{product.name}</h4>
                    </div>

                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                      <div>
                        <p className="text-xs text-gray-500">Stock</p>
                        <p className={`text-sm font-bold text-${stockStatus.color}-600`}>
                          {parseInt(product.stockQuantity) || 0} units
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Status</p>
                        <p className="text-xs font-bold">{stockStatus.text}</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditModal(product)}
                        className="flex-1 px-4 py-2.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all font-semibold flex items-center justify-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(product.id || product._id, product.name)}
                        disabled={loading}
                        className="flex-1 px-4 py-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modals */}
      <ProductModal
        show={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        onSubmit={handleAddProduct}
        title="Add New Product"
      />

      <ProductModal
        show={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingProduct(null);
          resetForm();
        }}
        onSubmit={handleEditProduct}
        title="Edit Product"
        isEdit={true}
      />
    </div>
  );
};

export default ProductsTab;