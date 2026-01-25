import axios from 'axios';

const API_BASE_URL = 'http://localhost:5033/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// Attach JWT token
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

// ===================== AUTH API (UPDATED WITH EMAIL OTP) =====================
export const authAPI = {
  // Email/Password login
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response;
  },
  
  // Registration
  register: async (fullName, email, mobile, password) => {
    const response = await api.post('/auth/register', { fullName, email, mobile, password });
    return response;
  },
  
  // Get user profile
  getProfile: () => api.get('/user/profile'),
  
  // Mobile OTP authentication
  requestOtp: async (mobile) => {
    const response = await api.post('/auth/request-otp', { mobile });
    return response;
  },
  
  verifyOtp: async (mobile, otp) => {
    const response = await api.post('/auth/verify-otp', { mobile, otp });
    return response;
  },

  // NEW: Email OTP authentication
  requestEmailOtp: async (email) => {
    const response = await api.post('/auth/request-email-otp', { email });
    return response;
  },
  
  verifyEmailOtp: async (email, otp) => {
    const response = await api.post('/auth/verify-email-otp', { email, otp });
    return response;
  }
};

// ===================== PAYMENT API =====================
export const paymentAPI = {
  initiate: (orderId, paymentMethod) => 
    api.post('/payment/initiate', { orderId, paymentMethod }),
  verify: (razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId) => 
    api.post('/payment/verify', { 
      razorpayOrderId, 
      razorpayPaymentId, 
      razorpaySignature, 
      orderId 
    }),
  getStatus: (orderId) => 
    api.get(`/payment/status/${orderId}`)
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
  getAll: () => api.get('/products'),
  search: (query) => api.get('/products/search', { params: { query: query || '' } }),
  getById: (id) => api.get(`/products/${id}`)
};

// ===================== CART API =====================
// ===================== CART API (FIXED FOR HYBRID SERVICE) =====================
export const cartAPI = {
  // Get user's cart
  view: (userId) => {
    if (!userId) throw new Error('User ID is required');
    return api.get(`/cart/user/${userId}`);
  },
  
  // Add item to cart
  add: (userId, data) => {
    if (!userId) throw new Error('User ID is required');
    return api.post(`/cart/user/${userId}/items`, {
      productId: data.productId,
      quantity: data.quantity || 1
    });
  },
  
  // Update item quantity
  update: (userId, productId, quantity) => {
    if (!userId) throw new Error('User ID is required');
    return api.put(`/cart/user/${userId}/items/${productId}`, { quantity });
  },
  
  // Remove item
  remove: (userId, productId) => {
    if (!userId) throw new Error('User ID is required');
    return api.delete(`/cart/user/${userId}/items/${productId}`);
  },
  
  // Clear cart
  clear: (userId) => {
    if (!userId) throw new Error('User ID is required');
    return api.delete(`/cart/user/${userId}`);
  }
};

// ===================== ORDERS API =====================
export const ordersAPI = {
  confirm: (shippingAddressId) =>
    api.post('/order/confirm', { shippingAddressId }),
  history: () => api.get('/order/history'),
  getById: (id) => api.get(`/order/${id}`)
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

// ===================== ADMIN API =====================
export const adminAPI = {
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

export default api;