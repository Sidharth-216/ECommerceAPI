import React, { useState, useEffect } from 'react';
import { Package, Plus, Minus, Trash2, Loader, AlertCircle } from 'lucide-react';
import { adminAPI } from '../api.js';

/**
 * ScannedItemsList Component
 * Display scanned barcode results and allow quantity input before adding to inventory
 */
const ScannedItemsList = ({
  show,
  onClose,
  scannedBarcodes = [],
  onAddProducts
}) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState([]);

  // Lookup barcode data and populate items
  useEffect(() => {
    if (!show || !scannedBarcodes.length) return;

    const lookupBarcodes = async () => {
      setLoading(true);
      setError('');
      setNotFound([]);

      try {
        // Batch lookup for efficiency
        const response = await adminAPI.lookupMultipleBarcodes(scannedBarcodes);

        if (response.data?.results) {
          const foundByBarcode = new Set(
            response.data.results
              .map(product => product.barcode)
              .filter(Boolean)
          );

          // Create items list with default quantity 1
          const newItems = response.data.results.map((product, index) => ({
            id: product.id || product._id || `${product.barcode || 'barcode'}-${index}-${Date.now()}`,
            barcode: product.barcode || scannedBarcodes[index] || '',
            ...product,
            quantity: 1
          }));

          setItems(newItems);

          // Track not found barcodes
          if (response.data.results.length < scannedBarcodes.length) {
            const unfound = scannedBarcodes.filter(barcode => !foundByBarcode.has(barcode));
            setNotFound(unfound);
          }
        }
      } catch (err) {
        setError(
          err.response?.data?.message || 
          'Failed to lookup barcodes. Please try again.'
        );
        console.error('Barcode lookup error:', err);
      } finally {
        setLoading(false);
      }
    };

    lookupBarcodes();
  }, [show, scannedBarcodes]);

  const updateQuantity = (id, quantity) => {
    if (quantity < 1) return;
    setItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const removeItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const handleAddAll = async () => {
    if (!items.length) {
      setError('No items to add');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Convert items to product creation format
      const productsToAdd = items.map(item => ({
        name: item.name,
        brand: item.brand || 'No Brand',
        price: item.price || 0,
        stockQuantity: item.quantity,
        category: item.category || 'Uncategorized',
        description: item.description || '',
        imageUrl: item.imageUrl || '',
        barcode: item.barcode // Store the barcode
      }));

      // Add each product
      let successCount = 0;
      const errors = [];

      for (const product of productsToAdd) {
        try {
          await adminAPI.addProduct(product);
          successCount++;
        } catch (err) {
          errors.push(`Failed to add ${product.name}: ${err.response?.data?.message || err.message}`);
        }
      }

      if (successCount > 0) {
        onAddProducts?.(successCount);
        setItems([]);
        onClose();
      }

      if (errors.length > 0) {
        setError(`Added ${successCount} products. ${errors.join('; ')}`);
      }
    } catch (err) {
      setError('Failed to add products. Please try again.');
      console.error('Add products error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-6 flex items-center justify-between sticky top-0 z-10 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Package className="w-6 h-6" />
            <h3 className="text-2xl font-bold">Add Scanned Products</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-all"
            disabled={loading}
          >
            ✕
          </button>
        </div>

        {/* Error Messages */}
        {error && (
          <div className="mx-8 mt-4 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="text-sm flex-1">{error}</p>
          </div>
        )}

        {/* Not Found Barcodes Warning */}
        {notFound.length > 0 && (
          <div className="mx-8 mt-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 px-4 py-3 rounded-lg">
            <p className="text-sm font-semibold">⚠️ {notFound.length} barcode(s) not found in database</p>
            <p className="text-xs mt-1">These barcodes were not recognized. You may need to add them first.</p>
          </div>
        )}

        <div className="p-8 space-y-6">
          
          {/* Loading State */}
          {loading && items.length === 0 && (
            <div className="flex items-center justify-center py-16 gap-3">
              <Loader className="w-6 h-6 animate-spin text-blue-500" />
              <p className="text-gray-600">Looking up barcodes...</p>
            </div>
          )}

          {/* Items List */}
          {items.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-bold text-gray-700">Found Products ({items.length})</h4>
              
              {items.map(item => (
                <div
                  key={item.id}
                  className="border-2 border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors"
                >
                  <div className="grid md:grid-cols-4 gap-4">
                    {/* Product Info */}
                    <div className="md:col-span-2 space-y-2">
                      <h5 className="font-semibold text-gray-800">{item.name}</h5>
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold">Brand:</span> {item.brand || 'N/A'}
                      </p>
                      <p className="text-sm text-gray-600">
                        <span className="font-semibold">Category:</span> {item.category || 'N/A'}
                      </p>
                      <p className="text-sm text-blue-600 font-mono">
                        ₹{item.price?.toFixed(2) || '0.00'}
                      </p>
                    </div>

                    {/* Quantity Control */}
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">Quantity</label>
                      <div className="flex items-center border-2 border-gray-300 rounded-lg">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-3 py-2 text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 1)}
                          className="flex-1 px-2 py-2 text-center font-semibold outline-none border-none"
                          min="1"
                        />
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-3 py-2 text-gray-600 hover:bg-gray-100 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Remove Button */}
                    <div className="flex items-end">
                      <button
                        onClick={() => removeItem(item.id)}
                        className="w-full px-4 py-2 bg-red-50 text-red-600 font-semibold rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {!loading && items.length === 0 && scannedBarcodes.length > 0 && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No products found for scanned barcodes</p>
              <p className="text-sm text-gray-400 mt-2">Try adding these barcodes to your database first</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4 pt-6 border-t-2 border-gray-200">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all"
            >
              Cancel
            </button>
            <button
              onClick={handleAddAll}
              disabled={loading || items.length === 0}
              className="flex-1 px-6 py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {loading && <Loader className="w-4 h-4 animate-spin" />}
              Add All {items.length} Product{items.length !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScannedItemsList;
