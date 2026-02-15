import axios from 'axios';

const API_BASE_URL = 'http://localhost:5033/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Request Interceptor - Attach JWT token to all requests
api.interceptors.request.use(
  (config) => {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Unauthorized - clearing tokens');
      sessionStorage.removeItem('token');
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

// ===================== AUTH API (SQL + MONGODB SUPPORT) =====================
export const authAPI = {
  // ===== SQL AUTHENTICATION (EXISTING) =====
  // Email/Password login (SQL)
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response;
  },
  
  // Registration (SQL)
  register: async (fullName, email, mobile, password) => {
    const response = await api.post('/auth/register', { fullName, email, mobile, password });
    return response;
  },
  
  // Get user profile
  getProfile: () => api.get('/user/profile'),
  
  // Mobile OTP authentication (SQL)
  requestOtp: async (mobile) => {
    const response = await api.post('/auth/request-otp', { mobile });
    return response;
  },
  
  verifyOtp: async (mobile, otp) => {
    const response = await api.post('/auth/verify-otp', { mobile, otp });
    return response;
  },
  
  // Email OTP authentication (SQL)
  requestEmailOtp: async (email) => {
    const response = await api.post('/auth/request-email-otp', { email });
    return response;
  },
  
  verifyEmailOtp: async (email, otp) => {
    const response = await api.post('/auth/verify-email-otp', { email, otp });
    return response;
  }
};

// ===== MONGODB AUTHENTICATION (NEW) =====
export const mongoAuthAPI = {
  // Email/Password login (MongoDB)
  login: async (email, password) => {
    const response = await api.post('/mongo/auth/login', { email, password });
    return response;
  },
  
  // Registration (MongoDB)
  register: async (fullName, email, mobile, password, gender) => {
    const response = await api.post('/mongo/auth/register', { 
      fullName, 
      email, 
      mobile, 
      password,
      gender
    });
    return response;
  },
  
  // Mobile OTP authentication (MongoDB)
  requestOtp: async (mobile) => {
    const response = await api.post('/mongo/auth/request-otp', { mobile });
    return response;
  },
  
  verifyOtp: async (mobile, otp) => {
    const response = await api.post('/mongo/auth/verify-otp', { mobile, otp });
    return response;
  },
  
  // Email OTP authentication (MongoDB)
  requestEmailOtp: async (email) => {
    const response = await api.post('/mongo/auth/request-email-otp', { email });
    return response;
  },
  
  verifyEmailOtp: async (email, otp) => {
    const response = await api.post('/mongo/auth/verify-email-otp', { email, otp });
    return response;
  }
};

// ===================== MIGRATION API =====================
export const migrationAPI = {
  // Migrate all users from SQL to MongoDB
  migrateUsers: async () => {
    const response = await api.post('/migration/migrate-users');
    return response;
  },
  
  // Verify migration status
  verifyMigration: async () => {
    const response = await api.get('/migration/verify-migration');
    return response;
  }
};

// ===================== PAYMENT API =====================
export const paymentAPI = {
  // Initiate payment for MongoDB order
  initiate: (orderId, paymentMethod) => {
    if (!orderId) {
      return Promise.reject(new Error('Order ID is required'));
    }
    console.log('💳 Payment API - Initiate:', { orderId, paymentMethod });
    return api.post('/mongo/payment/initiate', { orderId, paymentMethod });
  },
  
  // Verify Razorpay payment
  verify: (razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId) => {
    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return Promise.reject(new Error('Payment verification details are required'));
    }
    console.log('✅ Payment API - Verify:', { orderId });
    return api.post('/mongo/payment/verify', { 
      razorpayOrderId, 
      razorpayPaymentId, 
      razorpaySignature, 
      orderId 
    });
  },
  
  // Get payment status for order
  getStatus: (orderId) => {
    if (!orderId) {
      return Promise.reject(new Error('Order ID is required'));
    }
    console.log('📊 Payment API - Get Status:', orderId);
    return api.get(`/mongo/payment/status/${orderId}`);
  }
};

// ===================== ADDRESS API (MONGODB) - FIXED ROUTES =====================
export const addressAPI = {
  // Get all addresses for current user (uses token authentication)
  getAll: () => {
    console.log('📍 Address API - Get All (MongoDB): GET /api/MongoAddress');
    return api.get('/MongoAddress');
  },
  
  // Add new address
  add: async (address) => {
  console.log('➕ Address API - Add (MongoDB): POST /api/MongoAddress', address);
  
  // DO NOT attach userId here
  const response = await api.post('/MongoAddress', address);
  return response.data;
},
  
  // Update existing address
  update: async (id, address) => {
    if (!id) {
      throw new Error('Address ID is required');
    }
    console.log('✏️ Address API - Update (MongoDB): PUT /api/MongoAddress/' + id, address);
    const response = await api.put(`/MongoAddress/${id}`, address);
    return response.data;
  },
  
  // Delete address
  remove: async (id) => {
    if (!id) {
      throw new Error('Address ID is required');
    }
    console.log('🗑️ Address API - Delete (MongoDB): DELETE /api/MongoAddress/' + id);
    const response = await api.delete(`/MongoAddress/${id}`);
    return response.data;
  },
  
  // Get default address
  getDefault: async (userId) => {
    if (!userId) {
      const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
      userId = userData.id || userData.userId || userData.Id;
    }
    console.log('⭐ Address API - Get Default: GET /api/MongoAddress/default/' + userId);
    return api.get(`/MongoAddress/default/${userId}`);
  },
  
  // Unset default addresses
  unsetDefaults: async (userId, exceptId = null) => {
    if (!userId) {
      const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
      userId = userData.id || userData.userId || userData.Id;
    }
    console.log('🔄 Address API - Unset Defaults: PUT /api/MongoAddress/' + userId + '/unset-default');
    const params = exceptId ? { exceptId } : {};
    return api.put(`/MongoAddress/${userId}/unset-default`, {}, { params });
  },
  
  // Save all addresses (batch operation)
  saveAll: async (addresses) => {
    const results = [];
    for (const addr of addresses) {
      try {
        let result;
        if (addr.id || addr.Id) {
          result = await addressAPI.update(addr.id || addr.Id, addr);
        } else {
          result = await addressAPI.add(addr);
        }
        results.push(result);
      } catch (e) {
        console.error('Error saving address:', addr, e);
        results.push(addr);
      }
    }
    return results;
  }
};

// ===================== PRODUCTS API (MONGODB) =====================
export const productsAPI = {
  // Get all products
  getAll: () => {
    console.log('📦 Products API - Get All (MongoDB)');
    return api.get('/mongo/products');
  },

  // Search products
  search: (query) => {
    console.log('🔍 Products API - Search (MongoDB):', query);
    return api.get('/mongo/products/search', {
      params: { query: query || '' }
    });
  },

  // Get product by ID
  getById: (id) => {
    if (!id) {
      return Promise.reject(new Error('Product ID is required'));
    }
    console.log('📦 Products API - Get By ID (MongoDB):', id);
    return api.get(`/mongo/products/${id}`);
  }
};

// ===================== CART API (MONGODB) =====================
export const cartAPI = {
  // Get user's cart
  view: (userId) => {
    if (!userId) throw new Error('User ID is required');
    console.log('📋 Cart API - View (MongoDB):', `GET /mongo/cart/user/${userId}`);
    return api.get(`/mongo/cart/user/${userId}`);
  },
  
  // Add item to cart
  add: (userId, data) => {
    if (!userId) throw new Error('User ID is required');
    if (!data || !data.productId) throw new Error('Product ID is required');
    
    console.log('➕ Cart API - Add (MongoDB):', {
      url: `/mongo/cart/user/${userId}/items`,
      userId: userId,
      productId: data.productId,
      quantity: data.quantity || 1
    });
    
    return api.post(`/mongo/cart/user/${userId}/items`, {
      productId: data.productId,
      quantity: data.quantity || 1
    });
  },
  
  // Update item quantity
  update: (userId, productId, quantity) => {
    if (!userId) throw new Error('User ID is required');
    if (!productId) throw new Error('Product ID is required');
    
    console.log('✏️ Cart API - Update (MongoDB):', {
      url: `/mongo/cart/user/${userId}/items/${productId}`,
      quantity: quantity
    });
    
    return api.put(`/mongo/cart/user/${userId}/items/${productId}`, { quantity });
  },
  
  // Remove item from cart
  remove: (userId, productId) => {
    if (!userId) throw new Error('User ID is required');
    if (!productId) throw new Error('Product ID is required');
    
    console.log('🗑️ Cart API - Remove (MongoDB):', `/mongo/cart/user/${userId}/items/${productId}`);
    
    return api.delete(`/mongo/cart/user/${userId}/items/${productId}`);
  },
  
  // Clear entire cart
  clear: (userId) => {
    if (!userId) throw new Error('User ID is required');
    
    console.log('🧹 Cart API - Clear (MongoDB):', `/mongo/cart/user/${userId}`);
    
    return api.delete(`/mongo/cart/user/${userId}`);
  }
};

// ===================== ORDERS API (MONGODB) =====================
export const ordersAPI = {
  // Confirm order - Create order from cart
  confirm: (shippingAddressId) => {
    if (!shippingAddressId) {
      return Promise.reject(new Error('Shipping address ID is required'));
    }
    console.log('🚀 Orders API - Confirm (MongoDB):', { shippingAddressId });
    return api.post('/mongo/order/confirm', { shippingAddressId });
  },
  
  // Get order history
  history: () => {
    console.log('📜 Orders API - Get History (MongoDB)');
    return api.get('/mongo/order/history');
  },
  
  // Get specific order by ID
  getById: (orderId) => {
    if (!orderId) {
      return Promise.reject(new Error('Order ID is required'));
    }
    console.log('📦 Orders API - Get By ID (MongoDB):', orderId);
    return api.get(`/mongo/order/${orderId}`);
  },
  
  // Get order by order number
  getByOrderNumber: (orderNumber) => {
    if (!orderNumber) {
      return Promise.reject(new Error('Order number is required'));
    }
    console.log('📦 Orders API - Get By Order Number (MongoDB):', orderNumber);
    return api.get(`/mongo/order/order-number/${orderNumber}`);
  },
  
  // Cancel order
  cancel: (orderId) => {
    if (!orderId) {
      return Promise.reject(new Error('Order ID is required'));
    }
    console.log('❌ Orders API - Cancel (MongoDB):', orderId);
    return api.post(`/mongo/order/${orderId}/cancel`);
  }
};

// ===================== RECOMMENDATIONS API (MONGODB) =====================
export const recommendationsAPI = {
  // Get personalized recommendations for user
  getForUser: (userId) => {
    if (!userId) {
      return Promise.reject(new Error('User ID is required'));
    }
    console.log('🎯 Recommendations API - Get For User:', userId);
    return api.get('/mongo/recommendations/user', { params: { userId } });
  },
  
  // Get trending products
  getTrending: (limit = 10) => {
    console.log('🔥 Recommendations API - Get Trending:', { limit });
    return api.get('/mongo/recommendations/trending', { params: { limit } });
  },
  
  // Get recommended products based on product
  getRelated: (productId, limit = 5) => {
    if (!productId) {
      return Promise.reject(new Error('Product ID is required'));
    }
    console.log('🔗 Recommendations API - Get Related:', { productId, limit });
    return api.get(`/mongo/recommendations/related/${productId}`, { params: { limit } });
  },
  
  // Get popular products in category
  getPopularByCategory: (categoryId, limit = 10) => {
    if (!categoryId) {
      return Promise.reject(new Error('Category ID is required'));
    }
    console.log('⭐ Recommendations API - Get Popular By Category:', { categoryId, limit });
    return api.get(`/mongo/recommendations/category/${categoryId}`, { params: { limit } });
  }
};

// ===================== ADMIN API (MONGODB) - COMPLETE FIX =====================
export const adminAPI = {
  // ===== USER MANAGEMENT =====
  
  // Get all users from MongoDB
  getUsers: () => {
    console.log('👥 MongoDB Admin API - Get All Users');
    return api.get('/mongo/admin/users');
  },
  
  // Get user by ID
  getUserById: (userId) => {
    if (!userId) {
      return Promise.reject(new Error('User ID is required'));
    }
    console.log('👤 MongoDB Admin API - Get User By ID:', userId);
    return api.get(`/mongo/admin/users/${userId}`);
  },
  
  // ===== ORDER MANAGEMENT =====
  
  // Get all orders from MongoDB
  getOrders: () => {
    console.log('📦 MongoDB Admin API - Get All Orders');
    return api.get('/mongo/admin/orders');
  },
  
  // Get order statistics
  getOrderStats: () => {
    console.log('📊 MongoDB Admin API - Get Order Stats');
    return api.get('/mongo/admin/order-stats');
  },

  // Update order status - FIXED: Now uses correct endpoint
  updateOrderStatus: (orderId, newStatus) => {
    if (!orderId) {
      return Promise.reject(new Error('Order ID is required'));
    }
    console.log('✏️ MongoDB Admin API - Update Order Status:', { orderId, newStatus });
    
    // The status can be passed as string or object
    const statusValue = typeof newStatus === 'string' ? newStatus : newStatus.status;
    
    return api.put(`/mongo/admin/orders/${orderId}/status`, { status: statusValue });
  },
  
  // ===== SALES & REVENUE REPORTS =====
  
  // Get sales report
  getSalesReport: (startDate, endDate) => {
    console.log('📊 MongoDB Admin API - Get Sales Report:', { startDate, endDate });
    return api.get('/mongo/admin/sales-report', { 
      params: { startDate, endDate } 
    });
  },
  
  // Get revenue analytics
  getRevenue: (startDate, endDate) => {
    console.log('💰 MongoDB Admin API - Get Revenue:', { startDate, endDate });
    return api.get('/mongo/admin/revenue', { 
      params: { startDate, endDate } 
    });
  },
  
  // Get sales by category
  getSalesByCategory: (startDate, endDate) => {
    console.log('📊 MongoDB Admin API - Get Sales By Category:', { startDate, endDate });
    return api.get('/mongo/admin/sales-by-category', { 
      params: { startDate, endDate } 
    });
  },
  
  // Get sales by product
  getSalesByProduct: (startDate, endDate) => {
    console.log('📦 MongoDB Admin API - Get Sales By Product:', { startDate, endDate });
    return api.get('/mongo/admin/sales-by-product', { 
      params: { startDate, endDate } 
    });
  },
  
  // Get top selling products
  getTopProducts: (limit = 10) => {
    console.log('🏆 MongoDB Admin API - Get Top Products:', { limit });
    return api.get('/mongo/admin/top-products', { 
      params: { limit } 
    });
  },
  
  // ===== STOCK & INVENTORY =====
  
  // Get stock analysis
  getStockAnalysis: () => {
    console.log('📈 MongoDB Admin API - Get Stock Analysis');
    return api.get('/mongo/admin/stock-analysis');
  },

  // ===== PRODUCT MANAGEMENT - FIXED =====
  
  // Get all products
  getProducts: () => {
    console.log('📦 MongoDB Admin API - Get All Products');
    return api.get('/mongo/products');
  },

  // Add new product - FIXED: Proper payload structure
  addProduct: (productData) => {
    console.log('➕ MongoDB Admin API - Add Product:', productData);
    
    // Ensure proper structure for MongoDB
    const payload = {
      name: productData.name,
      brand: productData.brand || '',
      price: parseFloat(productData.price),
      stockQuantity: parseInt(productData.stockQuantity),
      category: productData.category || 'Uncategorized',
      description: productData.description || '',
      imageUrl: productData.imageUrl || ''
    };
    
    return api.post('/mongo/products', payload);
  },

  // Update product - FIXED: Proper payload structure
  updateProduct: (productId, productData) => {
    if (!productId) {
      return Promise.reject(new Error('Product ID is required'));
    }
    console.log('✏️ MongoDB Admin API - Update Product:', { productId, productData });
    
    // Ensure proper structure for MongoDB
    const payload = {
      name: productData.name,
      brand: productData.brand || '',
      price: parseFloat(productData.price),
      stockQuantity: parseInt(productData.stockQuantity),
      category: productData.category || 'Uncategorized',
      description: productData.description || '',
      imageUrl: productData.imageUrl || ''
    };
    
    return api.put(`/mongo/products/${productId}`, payload);
  },

  // Delete product
  deleteProduct: (productId) => {
    if (!productId) {
      return Promise.reject(new Error('Product ID is required'));
    }
    console.log('🗑️ MongoDB Admin API - Delete Product:', productId);
    return api.delete(`/mongo/products/${productId}`);
  },
  
  // ===== CUSTOMER ANALYTICS =====
  
  // Get customer insights
  getCustomerInsights: () => {
    console.log('👥 MongoDB Admin API - Get Customer Insights');
    return api.get('/mongo/admin/customer-insights');
  },
  
  // ===== METRICS & ANALYTICS =====
  
  // Get daily metrics
  getDailyMetrics: (startDate, endDate) => {
    console.log('📅 MongoDB Admin API - Get Daily Metrics:', { startDate, endDate });
    return api.get('/mongo/admin/daily-metrics', { 
      params: { startDate, endDate } 
    });
  },
  
  // ===== DASHBOARD =====
  
  // Get admin dashboard summary
  getDashboard: () => {
    console.log('🎯 MongoDB Admin API - Get Dashboard');
    return api.get('/mongo/admin/dashboard');
  }
};

// ===================== VALIDATION HELPER =====================
/**
 * Validate MongoDB ObjectId format
 * @param {string} id - ID to validate
 * @returns {boolean} True if valid MongoDB ObjectId
 */
export const isValidMongoId = (id) => {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{24}$/i.test(id);
};

// ===================== HELPER: Extract MongoDB ObjectId =====================
/**
 * Extract MongoDB ObjectId from various object formats
 * @param {Object} obj - Object that may contain MongoDB ID
 * @returns {string|null} MongoDB ObjectId string or null
 */
export const getMongoId = (obj) => {
  if (!obj) return null;
  
  // Check _id field (most common)
  if (obj._id) {
    // MongoDB extended JSON format: { $oid: "..." }
    if (typeof obj._id === 'object' && obj._id.$oid) {
      return obj._id.$oid;
    }
    // String format
    if (typeof obj._id === 'string' && /^[0-9a-f]{24}$/i.test(obj._id)) {
      return obj._id;
    }
  }
  
  // Check id field
  if (obj.id) {
    if (typeof obj.id === 'object' && obj.id.$oid) {
      return obj.id.$oid;
    }
    if (typeof obj.id === 'string' && /^[0-9a-f]{24}$/i.test(obj.id)) {
      return obj.id;
    }
  }
  
  // Check Id field (PascalCase)
  if (obj.Id) {
    if (typeof obj.Id === 'object' && obj.Id.$oid) {
      return obj.Id.$oid;
    }
    if (typeof obj.Id === 'string' && /^[0-9a-f]{24}$/i.test(obj.Id)) {
      return obj.Id;
    }
  }
  
  // Check mongoId field
  if (obj.mongoId && typeof obj.mongoId === 'string' && /^[0-9a-f]{24}$/i.test(obj.mongoId)) {
    return obj.mongoId;
  }
  
  console.warn('⚠️ Could not extract MongoDB ObjectId from object:', obj);
  return null;
};

// ===================== HELPER: Detect User Type =====================
export const getUserType = () => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (!token) return null;
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.UserType || 'SQL';
  } catch (error) {
    console.error('Error decoding token:', error);
    return 'SQL';
  }
};

// ===================== HELPER: Get User ID from Token =====================
export const getUserIdFromToken = () => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (!token) {
    console.warn('⚠️ No token found in storage');
    return null;
  }
  
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    // Extract user ID from various possible claim names
    const userId = payload.nameid || 
                   payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
                   payload.sub ||
                   payload.userId;
    
    console.log('✅ User ID from token:', userId);
    return userId;
  } catch (error) {
    console.error('❌ Error extracting user ID from token:', error);
    return null;
  }
};

export default api;