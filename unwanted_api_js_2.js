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

// ===================== AUTH API (SQL + MONGODB SUPPORT) - UPDATED =====================
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

// ===== MONGODB AUTHENTICATION (NEW) - UPDATED WITH GENDER SUPPORT =====
export const mongoAuthAPI = {
  // Email/Password login (MongoDB)
  login: async (email, password) => {
    const response = await api.post('/mongo/auth/login', { email, password });
    return response;
  },
  
  // Registration (MongoDB) - UPDATED TO INCLUDE GENDER
  register: async (fullName, email, mobile, password, gender) => {
    const response = await api.post('/mongo/auth/register', { 
      fullName, 
      email, 
      mobile, 
      password,
      gender // Added gender parameter
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
// ===================== MIGRATION API (NEW) =====================
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

// ===================== ADDRESS API =====================
export const addressAPI = {
  getAll: () => api.get('/user/addresses'),
  add: async (address) => {
    const response = await api.post('/user/addresses', address);
    return response.data;
  },
  update: async (id, address) => {
    const response = await api.put(`/user/addresses/${id}`, address);
    return response.data;
  },
  remove: async (id) => {
    const response = await api.delete(`/user/addresses/${id}`);
    return response.data;
  },
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

// ===================== PRODUCTS API =====================
export const productsAPI = {
  getAll: () => api.get('/mongo/products'),

  search: (query) =>
    api.get('/mongo/products/search', {
      params: { query: query || '' } // matches ProductSearchDto
    }),

  getById: (id) => api.get(`/mongo/products/${id}`)
};


// ===================== CART API (FIXED) =====================
export const cartAPI = {
  // Get user's cart
  view: (userId) => {
    if (!userId) throw new Error('User ID is required');
    console.log('📋 Cart API - View:', `GET /cart/user/${userId}`);
    return api.get(`/cart/user/${userId}`);
  },
  
  // ✅ FIXED: Add item to cart - accepts data object
  add: (userId, data) => {
    if (!userId) throw new Error('User ID is required');
    if (!data || !data.productId) throw new Error('Product ID is required');
    
    console.log('➕ Cart API - Add:', {
      url: `/cart/user/${userId}/items`,
      userId: userId,
      productId: data.productId,
      quantity: data.quantity || 1
    });
    
    return api.post(`/cart/user/${userId}/items`, {
      productId: data.productId,
      quantity: data.quantity || 1
    });
  },
  
  // Update item quantity
  update: (userId, productId, quantity) => {
    if (!userId) throw new Error('User ID is required');
    if (!productId) throw new Error('Product ID is required');
    
    console.log('✏️ Cart API - Update:', {
      url: `/cart/user/${userId}/items/${productId}`,
      quantity: quantity
    });
    
    return api.put(`/cart/user/${userId}/items/${productId}`, { quantity });
  },
  
  // Remove item
  remove: (userId, productId) => {
    if (!userId) throw new Error('User ID is required');
    if (!productId) throw new Error('Product ID is required');
    
    console.log('🗑️ Cart API - Remove:', `/cart/user/${userId}/items/${productId}`);
    
    return api.delete(`/cart/user/${userId}/items/${productId}`);
  },
  
  // Clear cart
  clear: (userId) => {
    if (!userId) throw new Error('User ID is required');
    
    console.log('🧹 Cart API - Clear:', `/cart/user/${userId}`);
    
    return api.delete(`/cart/user/${userId}`);
  }
};
// ===================== UPDATED ORDERS API (MongoDB) =====================
export const ordersAPI = {
  /**
   * Confirm order - Create order from cart (MongoDB)
   * @param {string} shippingAddressId - MongoDB ObjectId (24 hex characters)
   */
  confirm: (shippingAddressId) => {
    // Get user ID from token
    const userId = getUserIdFromToken();
    if (!userId) {
      console.error('❌ Orders API - User ID not found in token');
      return Promise.reject(new Error('User ID is required. Please login again.'));
    }

    // Validate input
    if (!shippingAddressId || typeof shippingAddressId !== 'string') {
      console.error('❌ Orders API - Invalid Shipping Address ID:', shippingAddressId);
      return Promise.reject(new Error('Shipping Address ID is required and must be a string'));
    }

    // Validate MongoDB ObjectId format (24 hex characters)
    const mongoObjectIdRegex = /^[0-9a-f]{24}$/i;
    if (!mongoObjectIdRegex.test(shippingAddressId)) {
      console.error('❌ Orders API - Invalid MongoDB ObjectId format:', shippingAddressId);
      console.error('Expected: 24 hex characters, Got:', shippingAddressId);
      return Promise.reject(new Error('Invalid Shipping Address ID format. Must be a valid MongoDB ObjectId.'));
    }

    console.log('📦 Orders API - Confirm Order (MongoDB):', {
      endpoint: '/api/mongo/order/confirm',
      userId: userId,
      shippingAddressId: shippingAddressId,
      requestBody: { ShippingAddressId: shippingAddressId }
    });

    // Call MongoDB order endpoint with CreateOrderDto structure
    return api.post('/mongo/order/confirm', {
      ShippingAddressId: shippingAddressId
    });
  },

  /**
   * Get order history for current user (MongoDB)
   */
  history: () => {
    console.log('📜 Orders API - Get History (MongoDB): /api/mongo/order/history');
    return api.get('/mongo/order/history');
  },

  /**
   * Get order by MongoDB ObjectId
   * @param {string} mongoId - MongoDB ObjectId
   */
  getById: (mongoId) => {
    if (!mongoId) {
      return Promise.reject(new Error('MongoDB Order ID is required'));
    }
    console.log('📋 Orders API - Get Order by ID (MongoDB):', mongoId);
    return api.get(`/mongo/order/${mongoId}`);
  },

  /**
   * Get order by Order Number
   * @param {string} orderNumber - Order number (e.g., ORD-20250129-ABCD1234)
   */
  getByOrderNumber: (orderNumber) => {
    if (!orderNumber) {
      return Promise.reject(new Error('Order number is required'));
    }
    console.log('📋 Orders API - Get Order by Number (MongoDB):', orderNumber);
    return api.get(`/mongo/order/order-number/${orderNumber}`);
  },

  /**
   * Cancel order by MongoDB ObjectId
   * @param {string} mongoId - MongoDB ObjectId
   */
  cancel: (mongoId) => {
    if (!mongoId) {
      return Promise.reject(new Error('MongoDB Order ID is required'));
    }
    console.log('❌ Orders API - Cancel Order (MongoDB):', mongoId);
    return api.post(`/mongo/order/${mongoId}/cancel`);
  }
};


// ===================== RECOMMENDATIONS API =====================
export const recommendationsAPI = {
  rank: (productIds, criteria) => api.post('/recommendations/rank', { productIds, criteria })
};

// ===================== INVENTORY API =====================
export const inventoryAPI = {
  getStock: (productId) => api.get(`/inventory/stock/${productId}`),
  checkAvailability: (productId, quantity) => 
    api.get('/inventory/check', { params: { productId, quantity } })
};
// ===================== ADMIN API (UPDATED FOR MONGODB) =====================
export const adminAPI = {
  // ===== SQL ENDPOINTS (BACKWARD COMPATIBILITY) =====
  fetchUserDetails: (userId) => api.get(`/admin/users/${userId}`).then(r => r.data),
  getStockAnalysis: () => api.get('/admin/inventory/analysis'),
  getLowStockProducts: () => api.get('/admin/inventory/low-stock'),
  getStockByCategory: (category) => api.get(`/admin/inventory/category/${category}`),
  updateStock: (productId, quantity) => api.put(`/admin/inventory/update`, { productId, quantity }),
  getSalesReport: (startDate, endDate) => 
    api.get('/admin/reports/sales', { params: { start: startDate, end: endDate } }),
  getSalesbyCategory: (startDate, endDate) => 
    api.get('/admin/reports/sales-by-category', { params: { startDate, endDate } }),
  getSalesbyProduct: (startDate, endDate) => 
    api.get('/admin/reports/sales-by-product', { params: { startDate, endDate } }),
  getRevenue: (startDate, endDate) => 
    api.get('/admin/reports/revenue', { params: { startDate, endDate } }),
  getTopProducts: (limit = 10) => 
    api.get('/admin/reports/top-products', { params: { limit } }),
  getOrderStats: () => api.get('/admin/reports/order-stats'),
  getDailyMetrics: (startDate, endDate) => 
    api.get('/admin/reports/daily-metrics', { params: { startDate, endDate } }),
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: () => api.get('/admin/users'),
  getOrders: () => api.get('/admin/orders'),
  createProduct: (data) => api.post('/products', data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/products/${id}`)
};

// ===== MONGODB ADMIN ENDPOINTS (ALIAS FOR MONGODB USERS) =====
export const mongoAdminAPI = {
  getUsers: () => {
    console.log('👥 MongoDB Admin API - Get All Users');
    return api.get('/mongo/admin/users');
  },
  getOrders: () => {
    console.log('📦 MongoDB Admin API - Get All Orders');
    return api.get('/mongo/admin/orders');
  },
  getDashboard: () => {
    console.log('🎯 MongoDB Admin API - Get Dashboard');
    return api.get('/mongo/admin/dashboard');
  }
};
// ===== COMPLETE MONGODB ADMIN API (Updated Version) =====
export const mongoAdminAPIComplete = {
  // ===== USER MANAGEMENT =====
  
  /**
   * Get all users from MongoDB
   * GET /api/mongo/admin/users
   */
  getUsers: () => {
    console.log('👥 MongoDB Admin API - Get All Users');
    return api.get('/mongo/admin/users');
  },
  
  /**
   * Get user by MongoDB ID
   * GET /api/mongo/admin/users/{mongoId}
   */
  getUserById: (mongoId) => {
    if (!mongoId || !isValidMongoId(mongoId)) {
      return Promise.reject(new Error('Valid MongoDB User ID is required'));
    }
    console.log('👤 MongoDB Admin API - Get User:', mongoId);
    return api.get(`/mongo/admin/users/${mongoId}`);
  },
  
  /**
   * Delete user by MongoDB ID
   * DELETE /api/mongo/admin/users/{mongoId}
   */
  deleteUser: (mongoId) => {
    if (!mongoId || !isValidMongoId(mongoId)) {
      return Promise.reject(new Error('Valid MongoDB User ID is required'));
    }
    console.log('🗑️ MongoDB Admin API - Delete User:', mongoId);
    return api.delete(`/mongo/admin/users/${mongoId}`);
  },
  
  // ===== ORDER MANAGEMENT =====
  
  /**
   * Get all orders from MongoDB
   * GET /api/mongo/admin/orders
   */
  getOrders: () => {
    console.log('📦 MongoDB Admin API - Get All Orders');
    return api.get('/mongo/admin/orders');
  },
  
  /**
   * Get order statistics
   * GET /api/mongo/admin/order-stats
   */
  getOrderStats: () => {
    console.log('📊 MongoDB Admin API - Get Order Stats');
    return api.get('/mongo/admin/order-stats');
  },

  /**
   * Update order status
   * PUT /api/mongo/admin/orders/{orderId}/status
   */
  updateOrderStatus: (orderId, statusData) => {
    if (!orderId) {
      return Promise.reject(new Error('Order ID is required'));
    }
    console.log('✏️ MongoDB Admin API - Update Order Status:', { orderId, statusData });
    return api.put(`/mongo/admin/orders/${orderId}/status`, statusData);
  },
  
  // ===== SALES & REVENUE REPORTS =====
  
  /**
   * Get sales report
   * GET /api/mongo/admin/sales-report
   */
  getSalesReport: (startDate, endDate) => {
    console.log('📊 MongoDB Admin API - Get Sales Report:', { startDate, endDate });
    return api.get('/mongo/admin/sales-report', { 
      params: { startDate, endDate } 
    });
  },
  
  /**
   * Get revenue analytics
   * GET /api/mongo/admin/revenue
   */
  getRevenue: (startDate, endDate) => {
    console.log('💰 MongoDB Admin API - Get Revenue:', { startDate, endDate });
    return api.get('/mongo/admin/revenue', { 
      params: { startDate, endDate } 
    });
  },
  
  /**
   * Get sales by category
   * GET /api/mongo/admin/sales-by-category
   */
  getSalesByCategory: (startDate, endDate) => {
    console.log('📊 MongoDB Admin API - Get Sales By Category:', { startDate, endDate });
    return api.get('/mongo/admin/sales-by-category', { 
      params: { startDate, endDate } 
    });
  },
  
  /**
   * Get sales by product
   * GET /api/mongo/admin/sales-by-product
   */
  getSalesByProduct: (startDate, endDate) => {
    console.log('📦 MongoDB Admin API - Get Sales By Product:', { startDate, endDate });
    return api.get('/mongo/admin/sales-by-product', { 
      params: { startDate, endDate } 
    });
  },
  
  /**
   * Get top selling products
   * GET /api/mongo/admin/top-products
   */
  getTopProducts: (limit = 10) => {
    console.log('🏆 MongoDB Admin API - Get Top Products:', { limit });
    return api.get('/mongo/admin/top-products', { 
      params: { limit } 
    });
  },
  
  // ===== STOCK & INVENTORY =====
  
  /**
   * Get stock analysis
   * GET /api/mongo/admin/stock-analysis
   */
  getStockAnalysis: () => {
    console.log('📈 MongoDB Admin API - Get Stock Analysis');
    return api.get('/mongo/admin/stock-analysis');
  },

  /**
   * Get all products (uses existing products endpoint)
   * GET /api/products
   */
  getProducts: () => {
    console.log('📦 MongoDB Admin API - Get All Products');
    return api.get('/products');
  },

  /**
   * Add new product
   * POST /api/products
   */
  addProduct: (productData) => {
    console.log('➕ MongoDB Admin API - Add Product:', productData);
    return api.post('/products', productData);
  },

  /**
   * Update product
   * PUT /api/products/{id}
   */
  updateProduct: (productId, productData) => {
    if (!productId) {
      return Promise.reject(new Error('Product ID is required'));
    }
    console.log('✏️ MongoDB Admin API - Update Product:', { productId, productData });
    return api.put(`/products/${productId}`, productData);
  },

  /**
   * Delete product
   * DELETE /api/products/{id}
   */
  deleteProduct: (productId) => {
    if (!productId) {
      return Promise.reject(new Error('Product ID is required'));
    }
    console.log('🗑️ MongoDB Admin API - Delete Product:', productId);
    return api.delete(`/products/${productId}`);
  },
  
  // ===== CUSTOMER ANALYTICS =====
  
  /**
   * Get customer insights
   * GET /api/mongo/admin/customer-insights
   */
  getCustomerInsights: () => {
    console.log('👥 MongoDB Admin API - Get Customer Insights');
    return api.get('/mongo/admin/customer-insights');
  },
  
  // ===== METRICS & ANALYTICS =====
  
  /**
   * Get daily metrics
   * GET /api/mongo/admin/daily-metrics
   */
  getDailyMetrics: (startDate, endDate) => {
    console.log('📅 MongoDB Admin API - Get Daily Metrics:', { startDate, endDate });
    return api.get('/mongo/admin/daily-metrics', { 
      params: { startDate, endDate } 
    });
  },
  
  // ===== DASHBOARD =====
  
  /**
   * Get admin dashboard summary
   * GET /api/mongo/admin/dashboard
   */
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