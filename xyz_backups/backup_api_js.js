import axios from 'axios';

//every time check system ip(middle one) and change as per it otherwise the api wont work
const API_BASE_URL = 'http://localhost:5033/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// ===================== Attach JWT token =====================
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

// ===================== Response Interceptor (Error Handling) =====================
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Unauthorized - clearing tokens');
      sessionStorage.removeItem('token');
      localStorage.removeItem('token');
      // Optionally redirect to login
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ===================== ADDRESS API =====================
export const addressAPI = {
  // ✅ FIXED: Return the full response so calling code can access res.data
  getAll: () => api.get('/user/addresses'),

  // ✅ FIXED: Consistent response handling
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

  // ✅ FIXED: Proper batch save handling
  saveAll: async (addresses) => {
    const results = [];
    for (const addr of addresses) {
      try {
        let result;
        if (addr.id || addr.Id) {
          // Update existing address
          result = await addressAPI.update(addr.id || addr.Id, addr);
        } else {
          // Add new address
          result = await addressAPI.add(addr);
        }
        results.push(result);
      } catch (e) {
        console.error('Error saving address:', addr, e);
        results.push(addr); // Keep original on error
      }
    }
    return results;
  }
};

// ===================== AUTH API =====================
export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response;
  },
  
  register: async (fullName, email, mobile, password) => {
    const response = await api.post('/auth/register', { fullName, email, mobile, password });
    return response;
  },
  
  getProfile: () => api.get('/user/profile')
};

// ===================== PRODUCTS API =====================
export const productsAPI = {
  getAll: () => api.get('/products'),
  search: (query) => api.get('/products/search', { params: { query: query || '' } }),
  getById: (id) => api.get(`/products/${id}`)
};

// ===================== CART API =====================
export const cartAPI = {
  view: () => api.get('/cart/view'),
  add: (data) => api.post('/cart/add', data),
  remove: (productId) => api.delete(`/cart/remove/${productId}`),
  update: (productId, quantity) => api.put('/cart/update', { productId, quantity }),
  clear: () => api.delete('/cart/clear')
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

// ===================== PAYMENT API =====================
export const paymentAPI = {
  initiate: (orderId, amount, paymentMethod) => 
    api.post('/payment/initiate', { orderId, amount, paymentMethod }),
  verify: (paymentId, transactionId) => 
    api.post('/payment/verify', { paymentId, transactionId }),
  getStatus: (paymentId) => 
    api.get(`/payment/status/${paymentId}`)
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
  // Stock analysis endpoints
  getStockAnalysis: () => api.get('/admin/inventory/analysis'),
  getLowStockProducts: () => api.get('/admin/inventory/low-stock'),
  getStockByCategory: (category) => api.get(`/admin/inventory/category/${category}`),
  updateStock: (productId, quantity) => api.put(`/admin/inventory/update`, { productId, quantity }),

  // Sales report endpoints
  getSalesReport: (startDate, endDate) => 
    api.get('/admin/reports/sales', { params: { startDate, endDate } }),
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
  //placeOrder: (orderData) => api.post('/order/place', orderData),
  getOrders: () => api.get('/admin/orders'),
  createProduct: (data) => api.post('/products', data),
  updateProduct: (id, data) => api.put(`/products/${id}`, data),
  deleteProduct: (id) => api.delete(`/products/${id}`)
};

export default api;