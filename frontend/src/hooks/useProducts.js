import { useState } from 'react';
import { productsAPI } from '../api';

// Helper function to extract MongoDB ObjectId
const getMongoId = (obj) => {
  if (!obj) return null;
  
  if (obj._id && obj._id.$oid) {
    return obj._id.$oid;
  }
  
  if (typeof obj._id === 'string') {
    return obj._id;
  }
  
  if (typeof obj.id === 'string') {
    return obj.id;
  }
  
  if (typeof obj.mongoId === 'string') {
    return obj.mongoId;
  }
  
  return null;
};

// Normalize product structure
const normalizeProduct = (product) => {
  return {
    ...product,
    id: getMongoId(product),
    _id: getMongoId(product)
  };
};

export const useProducts = () => {
  const [products, setProducts] = useState([]);

  const loadProducts = async () => {
    try {
      const response = await productsAPI.getAll();
      const normalizedProducts = response.data.map(normalizeProduct);
      setProducts(normalizedProducts);
      console.log('Products loaded:', normalizedProducts.length);
    } catch (err) {
      console.error('Error loading products:', err);
      throw new Error('Failed to load products');
    }
  };

  return {
    products,
    setProducts,
    loadProducts
  };
};