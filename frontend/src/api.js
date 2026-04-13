import axios from 'axios';

const isLocalhost = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
const defaultApiBaseUrl = isLocalhost
  ? 'http://localhost:5033/api'
  : 'https://ecommerceapi-er8d.onrender.com/api';

const rawApiBaseUrl = (process.env.REACT_APP_API_URL || defaultApiBaseUrl).trim();
const normalizeApiBaseUrl = (url) => {
  let normalized = (url || '').trim();
  if (!normalized) return normalized;

  // If frontend is served on HTTPS, avoid mixed-content or upgrade issues
  // by forcing non-local API endpoints to HTTPS.
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && normalized.startsWith('http://')) {
    try {
      const parsed = new URL(normalized);
      if (!/^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname)) {
        normalized = normalized.replace(/^http:\/\//i, 'https://');
      }
    } catch {
      normalized = normalized.replace(/^http:\/\//i, 'https://');
    }
  }
  return normalized;
};

const normalizedApiBaseUrl = normalizeApiBaseUrl(rawApiBaseUrl);
const API_BASE_URL = normalizedApiBaseUrl.endsWith('/api')
  ? normalizedApiBaseUrl
  : `${normalizedApiBaseUrl.replace(/\/$/, '')}/api`;
const API_TIMEOUT_MS = Number(process.env.REACT_APP_API_TIMEOUT_MS || 60000);

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: Number.isFinite(API_TIMEOUT_MS) && API_TIMEOUT_MS > 0 ? API_TIMEOUT_MS : 60000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
});

// ===================== INTERCEPTORS =====================

/**
 * Request Interceptor — attach the JWT Bearer token to every outgoing request.
 *
 * TOKEN PRIORITY (matches the session isolation strategy in useAuth.js):
 *   1. sessionStorage — tab-scoped; set on login and promoted from localStorage
 *                       during rehydration. Always reflects THIS tab's user.
 *   2. localStorage   — cross-tab fallback; only used when sessionStorage is empty
 *                       (e.g. very first load before rehydration promotes it).
 *
 * This ordering ensures that Tab A (User A) and Tab B (User B) each send the
 * correct token even if their localStorage still holds a stale value from the
 * other tab.
 */
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

// Response Interceptor — clear tokens on 401 to force re-login
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error?.config;

    // Retry once after protocol upgrade when upstream/proxy asks for upgrade.
    if (error?.response?.status === 426 && config && !config._retry426) {
      config._retry426 = true;

      const currentBase = (config.baseURL || API_BASE_URL || '').toString();
      if (currentBase.startsWith('http://')) {
        config.baseURL = currentBase.replace(/^http:\/\//i, 'https://');
      }

      return api(config);
    }

    if (error.response?.status === 401) {
      const requestUrl = String(config?.url || '');
      // Only hard-clear on explicit auth validation failure.
      if (requestUrl.includes('/mongo/auth/validate')) {
        console.error('Unauthorized validation — clearing tokens');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } else {
        console.warn('401 received for request, preserving session to avoid false logout:', requestUrl);
      }
    }
    return Promise.reject(error);
  }
);

// ===================== AUTH API (SQL + MONGODB SUPPORT) =====================
export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response;
  },

  register: async (fullName, email, mobile, password) => {
    const response = await api.post('/auth/register', { fullName, email, mobile, password });
    return response;
  },

  getProfile: () => api.get('/user/profile'),

  requestOtp: async (mobile) => {
    const response = await api.post('/auth/request-otp', { mobile });
    return response;
  },

  verifyOtp: async (mobile, otp) => {
    const response = await api.post('/auth/verify-otp', { mobile, otp });
    return response;
  },

  requestEmailOtp: async (email) => {
    const response = await api.post('/auth/request-email-otp', { email });
    return response;
  },

  verifyEmailOtp: async (email, otp) => {
    const response = await api.post('/auth/verify-email-otp', { email, otp });
    return response;
  }
};

// ===== MONGODB AUTHENTICATION =====
export const mongoAuthAPI = {
  login: async (email, password) => {
    const response = await api.post('/mongo/auth/login', { email, password });
    return response;
  },

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

  requestOtp: async (mobile) => {
    const response = await api.post('/mongo/auth/request-otp', { mobile });
    return response;
  },

  verifyOtp: async (mobile, otp) => {
    const response = await api.post('/mongo/auth/verify-otp', { mobile, otp });
    return response;
  },

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
  migrateUsers: async () => {
    const response = await api.post('/migration/migrate-users');
    return response;
  },

  verifyMigration: async () => {
    const response = await api.get('/migration/verify-migration');
    return response;
  }
};

// ===================== PAYMENT API =====================
export const paymentAPI = {
  initiate: (orderId, paymentMethod) => {
    if (!orderId) return Promise.reject(new Error('Order ID is required'));
    console.log('💳 Payment API - Initiate:', { orderId, paymentMethod });
    return api.post('/mongo/payment/initiate', { orderId, paymentMethod });
  },

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

  getStatus: (orderId) => {
    if (!orderId) return Promise.reject(new Error('Order ID is required'));
    console.log('📊 Payment API - Get Status:', orderId);
    return api.get(`/mongo/payment/status/${orderId}`);
  }
};

// ===================== ADDRESS API (MONGODB) =====================
export const addressAPI = {
  getAll: () => {
    console.log('📍 Address API - Get All: GET /api/MongoAddress');
    return api.get('/MongoAddress');
  },

  add: async (address) => {
    console.log('➕ Address API - Add: POST /api/MongoAddress', address);
    const response = await api.post('/MongoAddress', address);
    return response.data;
  },

  update: async (id, address) => {
    if (!id) throw new Error('Address ID is required');
    console.log('✏️ Address API - Update: PUT /api/MongoAddress/' + id);
    const response = await api.put(`/MongoAddress/${id}`, address);
    return response.data;
  },

  remove: async (id) => {
    if (!id) throw new Error('Address ID is required');
    console.log('🗑️ Address API - Delete: DELETE /api/MongoAddress/' + id);
    const response = await api.delete(`/MongoAddress/${id}`);
    return response.data;
  },

  getDefault: async (userId) => {
    if (!userId) {
      // Read from sessionStorage first (tab-scoped), then fall back to localStorage
      const raw = sessionStorage.getItem('user') || localStorage.getItem('user');
      const userData = JSON.parse(raw || '{}');
      userId = userData.id || userData.userId || userData.Id;
    }
    console.log('⭐ Address API - Get Default: GET /api/MongoAddress/default/' + userId);
    return api.get(`/MongoAddress/default/${userId}`);
  },

  unsetDefaults: async (userId, exceptId = null) => {
    if (!userId) {
      const raw = sessionStorage.getItem('user') || localStorage.getItem('user');
      const userData = JSON.parse(raw || '{}');
      userId = userData.id || userData.userId || userData.Id;
    }
    console.log('🔄 Address API - Unset Defaults: PUT /api/MongoAddress/' + userId + '/unset-default');
    const params = exceptId ? { exceptId } : {};
    return api.put(`/MongoAddress/${userId}/unset-default`, {}, { params });
  },

  saveAll: async (addresses) => {
    const results = [];
    for (const addr of addresses) {
      try {
        const result = (addr.id || addr.Id)
          ? await addressAPI.update(addr.id || addr.Id, addr)
          : await addressAPI.add(addr);
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
  getAll: () => {
    console.log('📦 Products API - Get All');
    return api.get('/mongo/products');
  },

  getPaged: (page = 1, pageSize = 24) => {
    const safePage = Number.isFinite(page) ? Math.max(1, page) : 1;
    const safePageSize = Number.isFinite(pageSize) ? Math.min(Math.max(1, pageSize), 100) : 24;
    return api.get('/mongo/products/paged', { params: { page: safePage, pageSize: safePageSize } });
  },

  search: (query, topK = 8) => {
    if (!query?.trim()) return Promise.resolve({ data: { results: [] } });
    return api.get('/mongo/search', { params: { query: query.trim(), topK } });
  },

  getById: (id) => {
    if (!id) return Promise.reject(new Error('Product ID is required'));
    console.log('📦 Products API - Get By ID:', id);
    return api.get(`/mongo/products/${id}`);
  }
};

// ===================== CART API (MONGODB) =====================
export const cartAPI = {
  view: (userId) => {
    if (!userId) throw new Error('User ID is required');
    return api.get(`/mongo/cart/user/${userId}`);
  },

  add: (userId, data) => {
    if (!userId) throw new Error('User ID is required');
    if (!data?.productId) throw new Error('Product ID is required');
    return api.post(`/mongo/cart/user/${userId}/items`, {
      productId: data.productId,
      quantity: data.quantity || 1
    });
  },

  update: (userId, productId, quantity) => {
    if (!userId) throw new Error('User ID is required');
    if (!productId) throw new Error('Product ID is required');
    return api.put(`/mongo/cart/user/${userId}/items/${productId}`, { quantity });
  },

  remove: (userId, productId) => {
    if (!userId) throw new Error('User ID is required');
    if (!productId) throw new Error('Product ID is required');
    return api.delete(`/mongo/cart/user/${userId}/items/${productId}`);
  },

  clear: (userId) => {
    if (!userId) throw new Error('User ID is required');
    return api.delete(`/mongo/cart/user/${userId}`);
  }
};

// ===================== ORDERS API (MONGODB) =====================
export const ordersAPI = {
  confirm: (shippingAddressId) => {
    if (!shippingAddressId) return Promise.reject(new Error('Shipping address ID is required'));
    console.log('🚀 Orders API - Confirm:', { shippingAddressId });
    return api.post('/mongo/order/confirm', { shippingAddressId });
  },

  history: () => {
    console.log('📜 Orders API - Get History');
    return api.get('/mongo/order/history');
  },

  getById: (orderId) => {
    if (!orderId) return Promise.reject(new Error('Order ID is required'));
    return api.get(`/mongo/order/${orderId}`);
  },

  getByOrderNumber: (orderNumber) => {
    if (!orderNumber) return Promise.reject(new Error('Order number is required'));
    return api.get(`/mongo/order/order-number/${orderNumber}`);
  },

  cancel: (orderId) => {
    if (!orderId) return Promise.reject(new Error('Order ID is required'));
    return api.post(`/mongo/order/${orderId}/cancel`);
  },

  downloadInvoice: (orderId) => {
    if (!orderId) return Promise.reject(new Error('Order ID is required'));
    return api.get(`/mongo/order/${orderId}/invoice`, {
      responseType: 'blob',
      headers: {
        Accept: 'application/pdf'
      }
    });
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// Add this block to your existing api.js file (after the ordersAPI section)
// ─────────────────────────────────────────────────────────────────────────────

// ===================== QR PAYMENT API =====================
export const qrPaymentAPI = {
  /**
   * Initiate a QR payment session for a given order.
   * POST /api/mongo/qr-payment/initiate
   * @param {string} orderId - MongoDB ObjectId of the order
   * @returns {Promise} QRPaymentResponseDto
   */
  initiate: (orderId) => {
    if (!orderId) return Promise.reject(new Error('Order ID is required'));
    console.log('💳 QR Payment API - Initiate:', orderId);
    return api.post('/mongo/qr-payment/initiate', { orderId });
  },

  /**
   * Poll the status of a QR session for an order.
   * GET /api/mongo/qr-payment/status/{orderId}
   */
  getStatus: (orderId) => {
    if (!orderId) return Promise.reject(new Error('Order ID is required'));
    return api.get(`/mongo/qr-payment/status/${orderId}`);
  },

  /**
   * Customer marks they have completed the UPI transfer.
   * POST /api/mongo/qr-payment/{paymentId}/mark-received
   * @param {string} paymentId - QR Payment session ObjectId
   * @param {string} [utr]     - Optional UTR / transaction reference
   */
  markReceived: (paymentId, utr = '') => {
    if (!paymentId) return Promise.reject(new Error('Payment ID is required'));
    console.log('📲 QR Payment API - Mark Received:', { paymentId, utr });
    return api.post(`/mongo/qr-payment/${paymentId}/mark-received`, { utr });
  },

  // ── Admin ────────────────────────────────────────────────────────────────

  /**
   * Admin: get all sessions awaiting confirmation.
   * GET /api/mongo/qr-payment/admin/pending
   */
  adminGetPending: () => {
    console.log('🔔 QR Payment API - Admin Get Pending');
    return api.get('/mongo/qr-payment/admin/pending');
  },

  /**
   * Admin: get full QR payment history.
   * GET /api/mongo/qr-payment/admin/all
   */
  adminGetAll: () => api.get('/mongo/qr-payment/admin/all'),

  /**
   * Admin: confirm a payment → order moves to Pending.
   * POST /api/mongo/qr-payment/admin/{paymentId}/confirm
   */
  adminConfirm: (paymentId, note = '') => {
    if (!paymentId) return Promise.reject(new Error('Payment ID is required'));
    console.log('✅ QR Payment API - Admin Confirm:', paymentId);
    return api.post(`/mongo/qr-payment/admin/${paymentId}/confirm`, { confirm: true, note });
  },

  /**
   * Admin: reject a payment session.
   * POST /api/mongo/qr-payment/admin/{paymentId}/reject
   */
  adminReject: (paymentId, note = '') => {
    if (!paymentId) return Promise.reject(new Error('Payment ID is required'));
    console.log('❌ QR Payment API - Admin Reject:', paymentId);
    return api.post(`/mongo/qr-payment/admin/${paymentId}/reject`, { confirm: false, note });
  },
};

// ===================== RECOMMENDATIONS API (MONGODB) =====================
export const recommendationsAPI = {
  getForUser: (userId) => {
    if (!userId) return Promise.reject(new Error('User ID is required'));
    return api.get('/mongo/recommendations/user', { params: { userId } });
  },

  getTrending: (limit = 10) =>
    api.get('/mongo/recommendations/trending', { params: { limit } }),

  getRelated: (productId, limit = 5) => {
    if (!productId) return Promise.reject(new Error('Product ID is required'));
    return api.get(`/mongo/recommendations/related/${productId}`, { params: { limit } });
  },

  getPopularByCategory: (categoryId, limit = 10) => {
    if (!categoryId) return Promise.reject(new Error('Category ID is required'));
    return api.get(`/mongo/recommendations/category/${categoryId}`, { params: { limit } });
  }
};

// ===================== ADMIN API (MONGODB) =====================
export const adminAPI = {
  getUsers: () => {
    console.log('👥 Admin API - Get All Users');
    return api.get('/mongo/admin/users');
  },

  getUserById: (userId) => {
    if (!userId) return Promise.reject(new Error('User ID is required'));
    return api.get(`/mongo/admin/users/${userId}`);
  },

  deleteUser: (userId) => {
    if (!userId) return Promise.reject(new Error('User ID is required'));
    return api.delete(`/mongo/admin/users/${userId}`);
  },

  getOrders: () => {
    console.log('📦 Admin API - Get All Orders');
    return api.get('/mongo/admin/orders');
  },

  getOrderStats: () => api.get('/mongo/admin/order-stats'),

  updateOrderStatus: (orderId, newStatus) => {
    if (!orderId) return Promise.reject(new Error('Order ID is required'));
    const statusValue = typeof newStatus === 'string' ? newStatus : newStatus.status;
    return api.put(`/mongo/admin/orders/${orderId}/status`, { status: statusValue });
  },

  getSalesReport:     (startDate, endDate) => api.get('/mongo/admin/sales-report',     { params: { startDate, endDate } }),
  getRevenue:         (startDate, endDate) => api.get('/mongo/admin/revenue',           { params: { startDate, endDate } }),
  getSalesByCategory: (startDate, endDate) => api.get('/mongo/admin/sales-by-category', { params: { startDate, endDate } }),
  getSalesByProduct:  (startDate, endDate) => api.get('/mongo/admin/sales-by-product',  { params: { startDate, endDate } }),
  getTopProducts:     (limit = 10)         => api.get('/mongo/admin/top-products',      { params: { limit } }),

  getStockAnalysis: () => {
    console.log('📈 Admin API - Get Stock Analysis');
    return api.get('/mongo/admin/stock-analysis');
  },

  getProducts: () => {
    console.log('📦 Admin API - Get All Products');
    return api.get('/mongo/products/paged', { params: { page: 1, pageSize: 100 } });
  },

  getProductsPaged: (page = 1, pageSize = 100) => {
    const safePage = Number.isFinite(page) ? Math.max(1, page) : 1;
    const safePageSize = Number.isFinite(pageSize) ? Math.min(Math.max(1, pageSize), 100) : 100;
    return api.get('/mongo/products/paged', { params: { page: safePage, pageSize: safePageSize } });
  },

  getAllProducts: async () => {
    const pageSize = 100;
    const first = await api.get('/mongo/products/paged', { params: { page: 1, pageSize } });
    const firstData = first?.data || {};
    const all = Array.isArray(firstData.items) ? [...firstData.items] : [];
    const totalPages = Number.isFinite(firstData.totalPages) ? firstData.totalPages : 1;

    if (totalPages > 1) {
      for (let page = 2; page <= totalPages; page += 1) {
        const res = await api.get('/mongo/products/paged', { params: { page, pageSize } });
        const items = Array.isArray(res?.data?.items) ? res.data.items : [];
        all.push(...items);
      }
    }

    return { data: all };
  },

  addProduct: (productData) => {
    console.log('➕ Admin API - Add Product:', productData);
    const payload = {
      name:           (productData.name          || '').trim(),
      brand:          (productData.brand         || '').trim(),
      price:          parseFloat(productData.price)       || 0,
      stockQuantity:  parseInt(productData.stockQuantity) || 0,
      categoryName:   (productData.category || productData.categoryName || '').trim(),
      categoryId:     0,
      description:    (productData.description   || '').trim(),
      imageUrl:       (productData.imageUrl       || '').trim(),
      specifications: ''
    };
    return api.post('/mongo/products', payload);
  },

  updateProduct: (productId, productData) => {
    if (!productId) return Promise.reject(new Error('Product ID is required'));
    console.log('✏️ Admin API - Update Product:', { productId });
    const payload = {
      name:           (productData.name          || '').trim(),
      brand:          (productData.brand         || '').trim(),
      price:          parseFloat(productData.price)       || 0,
      stockQuantity:  parseInt(productData.stockQuantity) || 0,
      categoryName:   (productData.category || productData.categoryName || '').trim(),
      categoryId:     0,
      description:    (productData.description   || '').trim(),
      imageUrl:       (productData.imageUrl       || '').trim(),
      specifications: ''
    };
    return api.put(`/mongo/products/${productId}`, payload);
  },

  deleteProduct: (productId) => {
    if (!productId) return Promise.reject(new Error('Product ID is required'));
    console.log('🗑️ Admin API - Delete Product:', productId);
    return api.delete(`/mongo/products/${productId}`);
  },

  getCustomerInsights: () => api.get('/mongo/admin/customer-insights'),
  getDailyMetrics:     (startDate, endDate) => api.get('/mongo/admin/daily-metrics', { params: { startDate, endDate } }),

  getDashboard: () => {
    console.log('🎯 Admin API - Get Dashboard');
    return api.get('/mongo/admin/dashboard');
  },

  // ══════════════ BARCODE SCANNING APIs ══════════════
  lookupBarcode: (barcode) => {
    if (!barcode) return Promise.reject(new Error('Barcode is required'));
    console.log('🔍 Admin API - Lookup Barcode:', barcode);
    return api.get('/mongo/barcodes/lookup', { params: { barcode } });
  },

  lookupMultipleBarcodes: (barcodes) => {
    if (!barcodes || !barcodes.length) return Promise.reject(new Error('Barcodes array is required'));
    console.log('🔍 Admin API - Batch Lookup Barcodes:', barcodes.length);
    return api.post('/mongo/barcodes/lookup-batch', { barcodes });
  },

  createBarcode: (barcodeData) => {
    if (!barcodeData || !barcodeData.barcode) return Promise.reject(new Error('Barcode data is required'));
    console.log('➕ Admin API - Create Barcode:', barcodeData.barcode);
    return api.post('/mongo/barcodes/create', barcodeData);
  },

  createBarcodesBatch: (barcodes) => {
    if (!barcodes || !barcodes.length) return Promise.reject(new Error('Barcodes array is required'));
    console.log('➕ Admin API - Batch Create Barcodes:', barcodes.length);
    return api.post('/mongo/barcodes/create-batch', { barcodes });
  },

  syncBarcodesFromProducts: () => {
    console.log('🔄 Admin API - Sync Barcodes from Products');
    return api.post('/mongo/barcodes/sync-from-products', {});
  }
};

// ===================== VALIDATION HELPERS =====================

export const isValidMongoId = (id) => {
  if (!id || typeof id !== 'string') return false;
  return /^[0-9a-f]{24}$/i.test(id);
};

export const getMongoId = (obj) => {
  if (!obj) return null;

  for (const key of ['_id', 'id', 'Id', 'mongoId']) {
    const val = obj[key];
    if (!val) continue;
    if (typeof val === 'object' && val.$oid) return val.$oid;
    if (typeof val === 'string' && /^[0-9a-f]{24}$/i.test(val)) return val;
  }

  console.warn('⚠️ Could not extract MongoDB ObjectId from object:', obj);
  return null;
};

export const getUserType = () => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.UserType || 'SQL';
  } catch {
    return 'SQL';
  }
};

/**
 * Extract the user ID claim from the JWT stored for THIS tab.
 * Reads sessionStorage first so multi-tab sessions stay isolated.
 */
export const getUserIdFromToken = () => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (!token) {
    console.warn('⚠️ No token found in storage');
    return null;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId =
      payload.nameid ||
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