import React, { useState, useEffect } from 'react';
import { Package, Search, Plus, Edit2, Trash2, RefreshCw, AlertCircle, X, Barcode } from 'lucide-react';
import { adminAPI } from '../../api.js';
import BarcodeScanner from '../../components/BarcodeScanner';
import ScannedItemsList from '../../components/ScannedItemsList';

const safeStr = (v) => (v == null ? '' : String(v));

const getCatStr = (product) => {
  if (!product) return 'Uncategorized';
  if (typeof product.categoryName === 'string' && product.categoryName) return product.categoryName;
  if (typeof product.category === 'string' && product.category) return product.category;
  if (product.category && typeof product.category === 'object')
    return safeStr(product.category.name || product.category.Name) || 'Uncategorized';
  return 'Uncategorized';
};

// ─────────────────────────────────────────────────────────────────
// ProductModal is defined OUTSIDE ProductsTab so it is never
// re-created on every keystroke. Defining it inside caused React to
// unmount + remount the whole modal (and lose input focus) on every
// state update triggered by typing.
// ─────────────────────────────────────────────────────────────────
const ProductModal = ({
  show,
  onClose,
  onSubmit,
  title,
  isEdit = false,
  formData,
  setFormData,
  loading,
  localError,
  clearError
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-6 flex items-center justify-between sticky top-0 z-10 rounded-t-2xl">
          <h3 className="text-2xl font-bold">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-all">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Inline error */}
        {localError && (
          <div className="mx-8 mt-4 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="text-sm flex-1">{localError}</p>
            <button onClick={clearError} className="text-red-400 hover:text-red-600">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={onSubmit} className="p-8 space-y-6">
          <div className="grid md:grid-cols-2 gap-6">

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Product Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                placeholder="e.g., Premium Smartphone"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Brand *</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData((prev) => ({ ...prev, brand: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                placeholder="e.g., Samsung"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Price (₹) *</label>
              <input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                placeholder="9999"
                min="0.01"
                step="0.01"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Stock Quantity *</label>
              <input
                type="number"
                value={formData.stockQuantity}
                onChange={(e) => setFormData((prev) => ({ ...prev, stockQuantity: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                placeholder="100"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Category *</label>
              <input
                type="text"
                value={formData.category}
                onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                placeholder="e.g., Electronics"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Examples: Mobiles, Laptops, Fashion, Books</p>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Image URL</label>
              <input
                type="text"
                value={formData.imageUrl}
                onChange={(e) => setFormData((prev) => ({ ...prev, imageUrl: e.target.value }))}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none"
                placeholder="https://... or product.jpg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all outline-none h-24 resize-none"
              placeholder="Product description..."
            />
          </div>

          <div className="flex gap-4 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : isEdit ? '✏️ Update Product' : '➕ Add Product'}
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

// ─────────────────────────────────────────────────────────────────
// Main ProductsTab component
// ─────────────────────────────────────────────────────────────────
const ProductsTab = ({ products, loadProducts, error, setError, loading, setLoading }) => {
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery]           = useState('');
  const [refreshing, setRefreshing]             = useState(false);
  const [showAddModal, setShowAddModal]         = useState(false);
  const [showEditModal, setShowEditModal]       = useState(false);
  const [editingProduct, setEditingProduct]     = useState(null);
  const [localError, setLocalError]             = useState('');
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [scannedBarcodes, setScannedBarcodes]   = useState([]);
  const [showScannedList, setShowScannedList]   = useState(false);

  const emptyForm = {
    name: '', brand: '', price: '', stockQuantity: '',
    category: '', description: '', imageUrl: ''
  };
  const [formData, setFormData] = useState(emptyForm);

  // ── Sync filtered list when products prop changes ──────────────
  useEffect(() => {
    setFilteredProducts(Array.isArray(products) ? products : []);
  }, [products]);

  // ── Client-side search filter ──────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProducts(Array.isArray(products) ? products : []);
      return;
    }
    const q = searchQuery.toLowerCase();
    setFilteredProducts(
      (Array.isArray(products) ? products : []).filter((p) => {
        if (!p || typeof p !== 'object') return false;
        return (
          safeStr(p.name).toLowerCase().includes(q)       ||
          safeStr(p.brand).toLowerCase().includes(q)      ||
          getCatStr(p).toLowerCase().includes(q)          ||
          safeStr(p.description).toLowerCase().includes(q)
        );
      })
    );
  }, [searchQuery, products]);

  const getProductId = (product) => {
    if (!product) return null;
    if (typeof product.id  === 'string' && product.id)  return product.id;
    if (typeof product._id === 'string' && product._id) return product._id;
    if (product._id?.$oid) return product._id.$oid;
    return null;
  };

  const getStockStatus = (qty) => {
    const n = parseInt(qty) || 0;
    if (n === 0) return { text: '🔴 Out of Stock' };
    if (n < 10)  return { text: '🟠 Low Stock' };
    return            { text: '🟢 In Stock' };
  };

  const showErr  = (msg) => { setLocalError(msg); setError && setError(msg); };
  const clearErr = ()    => { setLocalError('');  setError && setError('');  };
  const resetForm = () => setFormData(emptyForm);

  const handleBarcodeDetected = (barcode) => {
    // Add barcode to list when scanner detects one
    setScannedBarcodes(prev => {
      if (!prev.includes(barcode)) {
        return [...prev, barcode];
      }
      return prev;
    });
  };

  const handleCloseBarcodeScanner = () => {
    setShowBarcodeScanner(false);
    // If barcodes were scanned, show the items list
    if (scannedBarcodes.length > 0) {
      setShowScannedList(true);
    }
  };

  const handleProductsAdded = (count) => {
    alert(`✅ Successfully added ${count} product(s) from barcode scan!`);
    setScannedBarcodes([]);
    loadProducts();
  };

  const validateForm = () => {
    if (!formData.name?.trim())                                   throw new Error('Product name is required');
    if (!formData.price || parseFloat(formData.price) <= 0)      throw new Error('Price must be greater than 0');
    if (formData.stockQuantity === '' || parseInt(formData.stockQuantity) < 0)
                                                                  throw new Error('Stock quantity must be 0 or more');
    if (!formData.category?.trim())                               throw new Error('Category is required');
  };

  // ── CRUD operations ────────────────────────────────────────────
  const refreshProducts = async () => {
    setRefreshing(true);
    clearErr();
    try   { await loadProducts(); }
    catch (err) { showErr(err.message || 'Failed to refresh'); }
    finally     { setRefreshing(false); }
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setLoading(true);
    clearErr();
    try {
      validateForm();
      await adminAPI.addProduct({
        name:          formData.name.trim(),
        brand:         formData.brand.trim() || 'No Brand',
        price:         parseFloat(formData.price),
        stockQuantity: parseInt(formData.stockQuantity),
        category:      formData.category.trim(),
        description:   formData.description.trim(),
        imageUrl:      formData.imageUrl.trim()
      });
      await loadProducts();
      setShowAddModal(false);
      resetForm();
      alert('✅ Product added successfully!');
    } catch (err) {
      showErr(err.response?.data?.message || err.message || 'Failed to add product');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct) return;
    setLoading(true);
    clearErr();
    try {
      validateForm();
      const productId = getProductId(editingProduct);
      if (!productId) throw new Error('Cannot determine product ID — please refresh and try again');
      await adminAPI.updateProduct(productId, {
        name:          formData.name.trim(),
        brand:         formData.brand.trim() || 'No Brand',
        price:         parseFloat(formData.price),
        stockQuantity: parseInt(formData.stockQuantity),
        category:      formData.category.trim(),
        description:   formData.description.trim(),
        imageUrl:      formData.imageUrl.trim()
      });
      await loadProducts();
      setShowEditModal(false);
      setEditingProduct(null);
      resetForm();
      alert('✅ Product updated successfully!');
    } catch (err) {
      showErr(err.response?.data?.message || err.message || 'Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (product) => {
    const productId   = getProductId(product);
    const productName = safeStr(product.name) || 'this product';
    if (!productId) { showErr('Cannot determine product ID — please refresh and try again'); return; }
    if (!window.confirm(`Delete "${productName}"?\nThis action cannot be undone.`)) return;
    setLoading(true);
    clearErr();
    try {
      await adminAPI.deleteProduct(productId);
      await loadProducts();
      alert(`✅ "${productName}" deleted successfully`);
    } catch (err) {
      showErr(err.response?.data?.message || err.message || 'Failed to delete product');
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setFormData({
      name:          safeStr(product.name),
      brand:         safeStr(product.brand),
      price:         safeStr(product.price),
      stockQuantity: safeStr(product.stockQuantity),
      category:      getCatStr(product),
      description:   safeStr(product.description),
      imageUrl:      safeStr(product.imageUrl)
    });
    clearErr();
    setShowEditModal(true);
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            Product Inventory
          </h2>
          <p className="text-gray-600 mt-1">Manage your product catalogue</p>
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
            onClick={() => { resetForm(); clearErr(); setShowAddModal(true); }}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
          <button
            onClick={() => { setScannedBarcodes([]); setShowBarcodeScanner(true); }}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold"
          >
            <Barcode className="w-4 h-4" />
            Scan Barcode
          </button>
        </div>
      </div>

      {/* Page-level error banner */}
      {(localError || error) && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <p className="flex-1 text-sm font-medium">{localError || error}</p>
          <button onClick={clearErr}><X className="w-4 h-4 text-red-400 hover:text-red-600" /></button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Products', value: products?.length || 0,        bg: 'from-blue-50 to-indigo-50',   border: 'border-blue-200',   text: 'text-blue-600'   },
          { label: 'In Stock',       value: (products||[]).filter(p=>(parseInt(p.stockQuantity)||0)>0).length, bg:'from-green-50 to-emerald-50', border:'border-green-200', text:'text-green-600' },
          { label: 'Low Stock',      value: (products||[]).filter(p=>{const q=parseInt(p.stockQuantity)||0;return q>0&&q<10;}).length, bg:'from-orange-50 to-amber-50', border:'border-orange-200', text:'text-orange-600'},
          { label: 'Showing',        value: filteredProducts.length,       bg: 'from-purple-50 to-pink-50',   border: 'border-purple-200', text: 'text-purple-600' }
        ].map(({ label, value, bg, border, text }) => (
          <div key={label} className={`bg-gradient-to-br ${bg} rounded-xl shadow-md border ${border} p-5`}>
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</p>
            <p className={`text-4xl font-bold ${text} mt-2`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-5">
        <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-5 py-3 border-2 border-gray-200 focus-within:border-blue-400 transition-all">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            type="text"
            placeholder="Search by name, brand, category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-500"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Products grid */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">Product Catalogue</h3>
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
              {searchQuery ? 'Try a different search term' : 'Click "Add Product" to get started'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredProducts.map((product) => {
              const catStr    = getCatStr(product);
              const stockSt   = getStockStatus(product.stockQuantity);
              const productId = getProductId(product);

              return (
                <div
                  key={productId || safeStr(product.name)}
                  className="border-2 border-gray-200 rounded-xl overflow-hidden hover:border-blue-400 hover:shadow-lg transition-all bg-white"
                >
                  {/* Image */}
                  <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl.startsWith('http') ? product.imageUrl : `/images/${product.imageUrl}`}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/400x300/e5e7eb/9ca3af?text=No+Image'; }}
                      />
                    ) : (
                      <Package className="w-16 h-16 text-gray-400" />
                    )}
                    <div className="absolute top-3 left-3 bg-blue-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow">
                      {catStr}
                    </div>
                    <div className="absolute top-3 right-3 bg-white px-3 py-1 rounded-full text-sm font-bold text-gray-900 shadow">
                      ₹{(parseFloat(product.price) || 0).toLocaleString()}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-5">
                    <p className="text-xs text-gray-500 mb-1">{product.brand || 'No Brand'}</p>
                    <h4 className="font-bold text-gray-900 text-lg line-clamp-2 mb-3">{product.name}</h4>

                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
                      <div>
                        <p className="text-xs text-gray-500">Stock</p>
                        <p className="text-sm font-bold text-gray-800">{parseInt(product.stockQuantity) || 0} units</p>
                      </div>
                      <span className="text-xs font-bold">{stockSt.text}</span>
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
                        onClick={() => handleDeleteProduct(product)}
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

      {/* Modals — stable component identity, no remounting on typing */}
      <ProductModal
        show={showAddModal}
        onClose={() => { setShowAddModal(false); resetForm(); clearErr(); }}
        onSubmit={handleAddProduct}
        title="Add New Product"
        formData={formData}
        setFormData={setFormData}
        loading={loading}
        localError={localError}
        clearError={clearErr}
      />
      <ProductModal
        show={showEditModal}
        onClose={() => { setShowEditModal(false); setEditingProduct(null); resetForm(); clearErr(); }}
        onSubmit={handleEditProduct}
        title="Edit Product"
        isEdit
        formData={formData}
        setFormData={setFormData}
        loading={loading}
        localError={localError}
        clearError={clearErr}
      />

      {/* Barcode Scanner — for scanning product barcodes */}
      <BarcodeScanner
        show={showBarcodeScanner}
        onClose={handleCloseBarcodeScanner}
        onBarcodeDetected={handleBarcodeDetected}
        isLoading={loading}
        manualInput={true}
      />

      {/* Scanned Items List — for processing scanned products */}
      <ScannedItemsList
        show={showScannedList}
        onClose={() => {
          setShowScannedList(false);
          setScannedBarcodes([]);
        }}
        scannedBarcodes={scannedBarcodes}
        onAddProducts={handleProductsAdded}
      />
    </div>
  );
};

export default ProductsTab;