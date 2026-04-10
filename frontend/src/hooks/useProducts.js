import { useState } from 'react';
import { productsAPI, getMongoId } from '../api';

// Normalize product structure to ensure consistent ID handling
const normalizeProduct = (product) => {
  const mongoId = getMongoId(product);
  
  return {
    ...product,
    id: mongoId,
    _id: mongoId,
    // Ensure all required fields exist
    name: product.name || product.productName || 'Unknown Product',
    price: product.price || 0,
    stockQuantity: product.stockQuantity || 0,
    category: product.category || product.categoryName || 'Uncategorized',
    brand: product.brand || '',
    description: product.description || '',
    imageUrl: product.imageUrl || product.image || ''
  };
};

export const useProducts = () => {
  const [products, setProducts] = useState([]);

  const isTransientError = (err) => {
    const status = err?.response?.status;
    return [426, 429, 502, 503, 504].includes(status);
  };

  const loadProducts = async () => {
    try {
      console.log('📦 Loading products from MongoDB...');
      
      const response = await productsAPI.getAll();
      const rawProducts = response?.data || [];
      
      console.log('Raw products received:', rawProducts.length);
      
      const normalizedProducts = rawProducts.map(normalizeProduct);
      
      setProducts(normalizedProducts);
      console.log('✅ Products loaded and normalized:', normalizedProducts.length);
      
      return normalizedProducts;
    } catch (err) {
      if (isTransientError(err)) {
        try {
          console.warn('⚠️ Transient products load error, retrying once...', err?.response?.status);
          await new Promise(resolve => setTimeout(resolve, 800));
          const retryResponse = await productsAPI.getAll();
          const retryProducts = (retryResponse?.data || []).map(normalizeProduct);
          setProducts(retryProducts);
          return retryProducts;
        } catch (retryErr) {
          console.error('❌ Products retry failed:', retryErr);
          throw new Error(retryErr.response?.data?.message || retryErr.message || 'Failed to load products');
        }
      }

      console.error('❌ Error loading products:', err);
      throw new Error(err.response?.data?.message || err.message || 'Failed to load products');
    }
  };

  const loadProductsPage = async (page = 1, pageSize = 24) => {
    try {
      const response = await productsAPI.getPaged(page, pageSize);
      const payload = response?.data || {};
      const rawProducts = Array.isArray(payload.items) ? payload.items : [];
      const normalizedProducts = rawProducts.map(normalizeProduct);

      setProducts(normalizedProducts);

      return {
        items: normalizedProducts,
        page: payload.page || page,
        pageSize: payload.pageSize || pageSize,
        totalCount: payload.totalCount || normalizedProducts.length,
        totalPages: payload.totalPages || 1
      };
    } catch (err) {
      if (isTransientError(err)) {
        try {
          console.warn('⚠️ Transient paged products error, retrying once...', err?.response?.status);
          await new Promise(resolve => setTimeout(resolve, 800));
          const retryResponse = await productsAPI.getPaged(page, pageSize);
          const retryPayload = retryResponse?.data || {};
          const retryRawProducts = Array.isArray(retryPayload.items) ? retryPayload.items : [];
          const retryProducts = retryRawProducts.map(normalizeProduct);
          setProducts(retryProducts);
          return {
            items: retryProducts,
            page: retryPayload.page || page,
            pageSize: retryPayload.pageSize || pageSize,
            totalCount: retryPayload.totalCount || retryProducts.length,
            totalPages: retryPayload.totalPages || 1
          };
        } catch (retryErr) {
          console.error('❌ Paged products retry failed:', retryErr);
          throw new Error(retryErr.response?.data?.message || retryErr.message || 'Failed to load paged products');
        }
      }

      console.error('❌ Error loading paged products:', err);
      throw new Error(err.response?.data?.message || err.message || 'Failed to load paged products');
    }
  };

  const searchProducts = async (query) => {
  try {
    console.log('🔍 Searching products:', query);

    const response = await productsAPI.search(query);

    console.log("Full API response:", response.data);

    const rawProducts = response?.data?.results || [];

    const normalizedProducts = rawProducts.map(normalizeProduct);

    console.log('✅ Search results:', normalizedProducts.length);

    return normalizedProducts;

  } catch (err) {
    console.error('❌ Error searching products:', err);
    throw new Error(
      err.response?.data?.message ||
      err.message ||
      'Failed to search products'
    );
  }
};

  const getProductById = async (id) => {
    try {
      console.log('🔎 Fetching product by ID:', id);
      
      const response = await productsAPI.getById(id);
      const product = response?.data;
      
      if (!product) {
        throw new Error('Product not found');
      }
      
      const normalized = normalizeProduct(product);
      console.log('✅ Product fetched:', normalized.name);
      
      return normalized;
    } catch (err) {
      console.error('❌ Error fetching product:', err);
      throw new Error(err.response?.data?.message || err.message || 'Failed to fetch product');
    }
  };

  return {
    products,
    setProducts,
    loadProducts,
    loadProductsPage,
    searchProducts,
    getProductById
  };
};