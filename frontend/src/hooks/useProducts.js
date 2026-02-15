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
      console.error('❌ Error loading products:', err);
      setProducts([]);
      throw new Error(err.response?.data?.message || err.message || 'Failed to load products');
    }
  };

  const searchProducts = async (query) => {
    try {
      console.log('🔍 Searching products:', query);
      
      const response = await productsAPI.search(query);
      const rawProducts = response?.data || [];
      
      const normalizedProducts = rawProducts.map(normalizeProduct);
      
      console.log('✅ Search results:', normalizedProducts.length);
      return normalizedProducts;
    } catch (err) {
      console.error('❌ Error searching products:', err);
      throw new Error(err.response?.data?.message || err.message || 'Failed to search products');
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
    searchProducts,
    getProductById
  };
};