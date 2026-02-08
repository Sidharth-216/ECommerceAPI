 import React, { useState, useEffect } from 'react';
import { setupInterceptors } from './utils/helpers';
import { useAuth } from './hooks/useAuth';
import { useCart } from './hooks/useCart';
import { useProducts } from './hooks/useProducts';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProductsPage from './pages/ProductsPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import OrdersPage from './pages/OrdersPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboard from './pages/admin/AdminDashboard';

const App = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Custom hooks
  const auth = useAuth();
  const cartHook = useCart(auth.user);
  const productsHook = useProducts();

  // Setup interceptors on mount
  useEffect(() => {
    setupInterceptors();
    
    const token = sessionStorage.getItem('token');
    const userData = sessionStorage.getItem('user');
    
    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        auth.setUser(parsedUser);
        setCurrentPage('products');
        
        if (sessionStorage.getItem('cart')) {
          cartHook.setCart(JSON.parse(sessionStorage.getItem('cart')));
        }
        
        loadUserData();
      } catch (err) {
        console.error('Error parsing user data:', err);
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
      }
    }
  }, []);

  const loadUserData = async () => {
    try {
      await Promise.all([
        productsHook.loadProducts(),
        cartHook.loadCart(),
        auth.loadProfile(),
        auth.loadOrders()
      ]);
    } catch (err) {
      console.error('Error loading user data:', err);
    }
  };

  const pageProps = {
    currentPage,
    setCurrentPage,
    searchQuery,
    setSearchQuery,
    error,
    setError,
    loading,
    setLoading,
    user: auth.user,
    setUser: auth.setUser,
    cart: cartHook.cart,
    setCart: cartHook.setCart,
    products: productsHook.products,
    setProducts: productsHook.setProducts,
    orders: auth.orders,
    setOrders: auth.setOrders,
    handleLogout: auth.handleLogout,
    addToCart: cartHook.addToCart,
    updateCartQuantity: cartHook.updateCartQuantity,
    removeFromCart: cartHook.removeFromCart,
    clearCart: cartHook.clearCart,
    profileData: auth.profileData,
    setProfileData: auth.setProfileData,
    loadProducts: productsHook.loadProducts,
    loadOrders: auth.loadOrders
  };

  // Route to appropriate page
  if (!auth.user && currentPage === 'home') {
    return <HomePage {...pageProps} />;
  }

  if (!auth.user && currentPage === 'login') {
    return <LoginPage {...pageProps} />;
  }

  if (!auth.user && currentPage === 'register') {
    return <RegisterPage {...pageProps} />;
  }

  if (auth.user && currentPage === 'products') {
    return <ProductsPage {...pageProps} />;
  }

  if (auth.user && currentPage === 'cart') {
    return <CartPage {...pageProps} />;
  }

  if (auth.user && currentPage === 'checkout') {
    return <CheckoutPage {...pageProps} />;
  }

  if (auth.user && currentPage === 'orders') {
    return <OrdersPage {...pageProps} />;
  }

  if (auth.user && currentPage === 'profile') {
    return <ProfilePage {...pageProps} />;
  }

  if (auth.user && auth.user.role === 'Admin' && currentPage === 'admin') {
    return <AdminDashboard {...pageProps} />;
  }

  // Default fallback
  return <HomePage {...pageProps} />;
};

export default App;

/**
 * 
 * import axios from 'axios';
 
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
   // ===== SQL AUTHENTICATION =====
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
     if (!orderId) {
       return Promise.reject(new Error('Order ID is required'));
     }
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
   getAll: () => api.get('/products'),
   search: (query) => api.get('/products/search', { params: { query: query || '' } }),
   getById: (id) => api.get(`/products/${id}`)
 };
 
 // ===================== CART API =====================
 export const cartAPI = {
   view: (userId) => {
     if (!userId) throw new Error('User ID is required');
     console.log('📋 Cart API - View:', `GET /cart/user/${userId}`);
     return api.get(`/cart/user/${userId}`);
   },
   
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
   
   update: (userId, productId, quantity) => {
     if (!userId) throw new Error('User ID is required');
     if (!productId) throw new Error('Product ID is required');
     
     console.log('✏️ Cart API - Update:', {
       url: `/cart/user/${userId}/items/${productId}`,
       quantity: quantity
     });
     
     return api.put(`/cart/user/${userId}/items/${productId}`, { quantity });
   },
   
   remove: (userId, productId) => {
     if (!userId) throw new Error('User ID is required');
     if (!productId) throw new Error('Product ID is required');
     
     console.log('🗑️ Cart API - Remove:', `/cart/user/${userId}/items/${productId}`);
     
     return api.delete(`/cart/user/${userId}/items/${productId}`);
   },
   
   clear: (userId) => {
     if (!userId) throw new Error('User ID is required');
     
     console.log('🧹 Cart API - Clear:', `/cart/user/${userId}`);
     
     return api.delete(`/cart/user/${userId}`);
   }
 };
 
 // ===================== ORDERS API (MongoDB) =====================
 export const ordersAPI = {
   confirm: (shippingAddressId) => {
     const userId = getUserIdFromToken();
     if (!userId) {
       console.error('❌ Orders API - User ID not found in token');
       return Promise.reject(new Error('User ID is required. Please login again.'));
     }
 
     if (!shippingAddressId || typeof shippingAddressId !== 'string') {
       console.error('❌ Orders API - Invalid Shipping Address ID:', shippingAddressId);
       return Promise.reject(new Error('Shipping Address ID is required and must be a string'));
     }
 
     const mongoObjectIdRegex = /^[0-9a-f]{24}$/i;
     if (!mongoObjectIdRegex.test(shippingAddressId)) {
       console.error('❌ Orders API - Invalid MongoDB ObjectId format:', shippingAddressId);
       return Promise.reject(new Error('Invalid Shipping Address ID format. Must be a valid MongoDB ObjectId.'));
     }
 
     console.log('📦 Orders API - Confirm Order (MongoDB):', {
       endpoint: '/api/mongo/order/confirm',
       userId: userId,
       shippingAddressId: shippingAddressId
     });
 
     return api.post('/mongo/order/confirm', {
       ShippingAddressId: shippingAddressId
     });
   },
 
   history: () => {
     console.log('📜 Orders API - Get History (MongoDB)');
     return api.get('/mongo/order/history');
   },
 
   getById: (mongoId) => {
     if (!mongoId) {
       return Promise.reject(new Error('MongoDB Order ID is required'));
     }
     console.log('📋 Orders API - Get Order by ID (MongoDB):', mongoId);
     return api.get(`/mongo/order/${mongoId}`);
   },
 
   getByOrderNumber: (orderNumber) => {
     if (!orderNumber) {
       return Promise.reject(new Error('Order number is required'));
     }
     console.log('📋 Orders API - Get Order by Number (MongoDB):', orderNumber);
     return api.get(`/mongo/order/order-number/${orderNumber}`);
   },
 
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
 
 // ===================== ADMIN API (SQL - Legacy) =====================
 export const adminAPI = {
   // User Management
   fetchUserDetails: (userId) => api.get(`/admin/users/${userId}`).then(r => r.data),
   getUsers: () => {
     console.log('👥 Admin API (SQL) - Get Users');
     return api.get('/admin/users');
   },
   
   // ✅ CRITICAL: deleteUser method (was missing!)
   deleteUser: (userId) => {
     console.log('🗑️ Admin API (SQL) - Delete User:', userId);
     return api.delete(`/admin/users/${userId}`);
   },
   
   // Stock & Inventory
   getStockAnalysis: () => {
     console.log('📈 Admin API (SQL) - Get Stock Analysis');
     return api.get('/admin/inventory/analysis');
   },
   getLowStockProducts: () => api.get('/admin/inventory/low-stock'),
   getStockByCategory: (category) => api.get(`/admin/inventory/category/${category}`),
   updateStock: (productId, quantity) => api.put(`/admin/inventory/update`, { productId, quantity }),
   
   // Sales & Reports
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
   
   // Orders
   getOrders: () => {
     console.log('📦 Admin API (SQL) - Get Orders');
     return api.get('/admin/orders');
   },
   
   // Products
   getProducts: () => {
     console.log('📦 Admin API (SQL) - Get Products');
     return api.get('/products');
   },
   createProduct: (data) => {
     console.log('➕ Admin API (SQL) - Create Product:', data);
     return api.post('/products', data);
   },
   addProduct: (productData) => {
     console.log('➕ Admin API (SQL) - Add Product:', productData);
     return api.post('/products', productData);
   },
   updateProduct: (id, data) => {
     console.log('✏️ Admin API (SQL) - Update Product:', id);
     return api.put(`/products/${id}`, data);
   },
   deleteProduct: (id) => {
     console.log('🗑️ Admin API (SQL) - Delete Product:', id);
     return api.delete(`/products/${id}`);
   }
 };
 
 // ===================== MONGODB ADMIN API (Complete) =====================
 export const mongoAdminAPI = {
   // ===== USER MANAGEMENT =====
   
   getUsers: () => {
     console.log('👥 MongoDB Admin API - Get All Users');
     return api.get('/mongo/admin/users');
   },
   
   getUserById: (mongoId) => {
     if (!mongoId || !isValidMongoId(mongoId)) {
       return Promise.reject(new Error('Valid MongoDB User ID is required'));
     }
     console.log('👤 MongoDB Admin API - Get User:', mongoId);
     return api.get(`/mongo/admin/users/${mongoId}`);
   },
   
   // ✅ CRITICAL: deleteUser for MongoDB
   deleteUser: (mongoId) => {
     if (!mongoId || !isValidMongoId(mongoId)) {
       return Promise.reject(new Error('Valid MongoDB User ID is required'));
     }
     console.log('🗑️ MongoDB Admin API - Delete User:', mongoId);
     return api.delete(`/mongo/admin/users/${mongoId}`);
   },
   
   // ===== ORDER MANAGEMENT =====
   
   getOrders: () => {
     console.log('📦 MongoDB Admin API - Get All Orders');
     return api.get('/mongo/admin/orders');
   },
   
   getOrderStats: () => {
     console.log('📊 MongoDB Admin API - Get Order Stats');
     return api.get('/mongo/admin/order-stats');
   },
 
   updateOrderStatus: (orderId, statusData) => {
     if (!orderId) {
       return Promise.reject(new Error('Order ID is required'));
     }
     console.log('✏️ MongoDB Admin API - Update Order Status:', { orderId, statusData });
     return api.put(`/mongo/admin/orders/${orderId}/status`, statusData);
   },
   
   // ===== SALES & REVENUE REPORTS =====
   
   getSalesReport: (startDate, endDate) => {
     console.log('📊 MongoDB Admin API - Get Sales Report:', { startDate, endDate });
     return api.get('/mongo/admin/sales-report', { 
       params: { startDate, endDate } 
     });
   },
   
   getRevenue: (startDate, endDate) => {
     console.log('💰 MongoDB Admin API - Get Revenue:', { startDate, endDate });
     return api.get('/mongo/admin/revenue', { 
       params: { startDate, endDate } 
     });
   },
   
   getSalesByCategory: (startDate, endDate) => {
     console.log('📊 MongoDB Admin API - Get Sales By Category:', { startDate, endDate });
     return api.get('/mongo/admin/sales-by-category', { 
       params: { startDate, endDate } 
     });
   },
   
   getSalesByProduct: (startDate, endDate) => {
     console.log('📦 MongoDB Admin API - Get Sales By Product:', { startDate, endDate });
     return api.get('/mongo/admin/sales-by-product', { 
       params: { startDate, endDate } 
     });
   },
   
   getTopProducts: (limit = 10) => {
     console.log('🏆 MongoDB Admin API - Get Top Products:', { limit });
     return api.get('/mongo/admin/top-products', { 
       params: { limit } 
     });
   },
   
   // ===== STOCK & INVENTORY =====
   
   getStockAnalysis: () => {
     console.log('📈 MongoDB Admin API - Get Stock Analysis');
     return api.get('/mongo/admin/stock-analysis');
   },
 
   getProducts: () => {
     console.log('📦 MongoDB Admin API - Get All Products');
     return api.get('/products');
   },
 
   addProduct: (productData) => {
     console.log('➕ MongoDB Admin API - Add Product:', productData);
     return api.post('/products', productData);
   },
 
   updateProduct: (productId, productData) => {
     if (!productId) {
       return Promise.reject(new Error('Product ID is required'));
     }
     console.log('✏️ MongoDB Admin API - Update Product:', { productId, productData });
     return api.put(`/products/${productId}`, productData);
   },
 
   deleteProduct: (productId) => {
     if (!productId) {
       return Promise.reject(new Error('Product ID is required'));
     }
     console.log('🗑️ MongoDB Admin API - Delete Product:', productId);
     return api.delete(`/products/${productId}`);
   },
   
   // ===== CUSTOMER ANALYTICS =====
   
   getCustomerInsights: () => {
     console.log('👥 MongoDB Admin API - Get Customer Insights');
     return api.get('/mongo/admin/customer-insights');
   },
   
   // ===== METRICS & ANALYTICS =====
   
   getDailyMetrics: (startDate, endDate) => {
     console.log('📅 MongoDB Admin API - Get Daily Metrics:', { startDate, endDate });
     return api.get('/mongo/admin/daily-metrics', { 
       params: { startDate, endDate } 
     });
   },
   
   // ===== DASHBOARD =====
   
   getDashboard: () => {
     console.log('🎯 MongoDB Admin API - Get Dashboard');
     return api.get('/mongo/admin/dashboard');
   }
 };
 
 // ===================== VALIDATION HELPER =====================
 export const isValidMongoId = (id) => {
   if (!id || typeof id !== 'string') return false;
   return /^[0-9a-f]{24}$/i.test(id);
 };
 
 // ===================== HELPER: Extract MongoDB ObjectId =====================
 export const getMongoId = (obj) => {
   if (!obj) return null;
   
   if (obj._id) {
     if (typeof obj._id === 'object' && obj._id.$oid) {
       return obj._id.$oid;
     }
     if (typeof obj._id === 'string' && /^[0-9a-f]{24}$/i.test(obj._id)) {
       return obj._id;
     }
   }
   
   if (obj.id) {
     if (typeof obj.id === 'object' && obj.id.$oid) {
       return obj.id.$oid;
     }
     if (typeof obj.id === 'string' && /^[0-9a-f]{24}$/i.test(obj.id)) {
       return obj.id;
     }
   }
   
   if (obj.Id) {
     if (typeof obj.Id === 'object' && obj.Id.$oid) {
       return obj.Id.$oid;
     }
     if (typeof obj.Id === 'string' && /^[0-9a-f]{24}$/i.test(obj.Id)) {
       return obj.Id;
     }
   }
   
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
 */







