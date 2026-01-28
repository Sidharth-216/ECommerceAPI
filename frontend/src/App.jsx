import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { Mail, Lock, User, Phone, Eye, EyeOff, ShoppingBag, TrendingUp, Package, Users, BarChart3, Settings, MessageCircle, Search, X, Send, ShoppingCart, LogOut, UserCircle, MapPin, CreditCard, Clock, Plus, Minus, Trash2, Calendar, Smartphone, KeyRound, ArrowLef  } from 'lucide-react';
import {
  adminAPI,
  authAPI,
  productsAPI,
  cartAPI,
  ordersAPI,
  recommendationsAPI,
  addressAPI,
  paymentAPI,
  mongoAuthAPI, 
  getUserIdFromToken ,
} from './api'; // adjusted to use services/api which exports addressAPI and attaches JWT

// Setup interceptors function (will be called in useEffect)
const setupInterceptors = () => {
  const apis = [authAPI, productsAPI, cartAPI, ordersAPI, recommendationsAPI, adminAPI, addressAPI];
  
  apis.forEach(api => {
    if (api && api.interceptors) {
      // Request interceptor to add token (must be first)
      api.interceptors.request.use(
        config => {
          const token = sessionStorage.getItem('token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          return config;
        },
        error => Promise.reject(error)
      );
      
      // Response interceptor for 401 handling - only redirect if truly unauthorized
      api.interceptors.response.use(
        response => response,
        error => {
          // Only clear session and redirect on actual 401 authentication failures
          // Not on missing/invalid tokens from the cart API itself
          if (error.response?.status === 401 && error.response?.data?.message?.includes('authentication')) {
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            window.location.href = '/';
          }
          return Promise.reject(error);
        }
      );
    }
  });
};

// Ensure authAPI.register accepts role parameter
const originalRegister = authAPI.register;
authAPI.register = (fullName, email, mobile, password, role) =>
  originalRegister(fullName, email, mobile, password, role);



const CompleteIntegratedApp = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [user, setUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [registerData, setRegisterData] = useState({ fullName: '', email: '', mobile: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Shopping state
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [orders, setOrders] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);
  const [editMode, setEditMode] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [loginRole, setLoginRole] = useState('Customer');
  const [editingId, setEditingId] = useState(null);
  
  // Admin Dashboard hooks - moved to top level
  const [adminStats, setAdminStats] = useState([]);
  const [adminCustomers, setAdminCustomers] = useState([]);
  const [adminOrders, setAdminOrders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  
  // Stock Analysis State
  const [stockAnalysis, setStockAnalysis] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [stockByCategory, setStockByCategory] = useState([]);
  
  // Sales Report State
  const [salesReport, setSalesReport] = useState(null);
  const [salesByCategory, setSalesByCategory] = useState([]);
  const [salesByProduct, setSalesByProduct] = useState([]);
  const [revenue, setRevenue] = useState(null);
  const [topProducts, setTopProducts] = useState([]);
  const [orderStats, setOrderStats] = useState(null);
  const [dailyMetrics, setDailyMetrics] = useState([]);

  //email otp 
const [emailForOtp, setEmailForOtp] = useState('');
const [emailOtpSent, setEmailOtpSent] = useState(false);
const [emailOtp, setEmailOtp] = useState(['', '', '', '', '', '']);
  
  // Login / OTP UI state
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'mobile'
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  // Date Range State
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  //profile state 2
  useEffect(() => {
    fetchAddresses();
  }, []);
  const [profileData, setProfileData] = useState({
  fullName: '',
  email: '',
  mobile: '',
  addresses: []
});
const [form, setForm] = useState({
    AddressLine1: '',
    AddressLine2: '',
    City: '',
    State: '',
    PostalCode: '',
    Country: '',
    IsDefault: false
  });
// In your component where you have fetchProfile

const fetchProfile = async () => {
    try {
        setLoadingProfile(true);
        const res = await authAPI.getProfile();
        console.log('Profile API response:', res.data);
        
        // Backend returns UserProfileDto directly
        const data = res.data;
        
        setProfileData({
            fullName: data.fullName || user?.name || '',
            email: data.email || user?.email || '',
            mobile: data.mobile || user?.mobile || '+91 00000 00000', // Default fallback
            addresses: data.addresses || []
        });
    } catch (err) {
        console.error('Profile fetch error:', err);
        // Fallback to user state if API fails
        if (user) {
            setProfileData({
                fullName: user.name || '',
                email: user.email || '',
                mobile: user.mobile || '+91 00000 00000',
                addresses: []
            });
        }
    } finally {
        setLoadingProfile(false);
    }
};

const fetchCustomers = async () => {
  try {
    const res = await authAPI.getAll(); // or use appropriate API endpoint
    setCustomers(res.data || []);
  } catch (err) {
    console.error('Customers fetch failed', err);
    setCustomers([]);
  }
};

const fetchOrders = async () => {
  try {
    const res = await ordersAPI.history();
    setOrders(res.data || []);
  } catch (err) {
    console.error('Orders fetch failed', err);
  }
};

useEffect(() => {
  if (user && currentPage === 'profile') {
    fetchProfile();
    fetchOrders();
  }
  if (user && user.role === 'Admin' && activeTab === 'customers') {
    fetchCustomers();
  }
}, [user, currentPage, activeTab]);

const handleSaveProfile = async () => {
  setEditMode(false);
  // Add API call to save profile if needed
};


  // Check for existing session on mount and setup interceptors
    useEffect(() => {
      setupInterceptors();
      
      const token = sessionStorage.getItem('token');
      const userData = sessionStorage.getItem('user');
      const savedCart = sessionStorage.getItem('cart');
      
      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);
          setCurrentPage('products');
          
          // Restore cart from session storage
          if (savedCart) {
            setCart(JSON.parse(savedCart));
          }
          
          loadUserData();
        } catch (err) {
          console.error('Error parsing user data:', err);
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
        }
      }
    }, []);

// Load products from backend
/*const loadProducts = async () => {
  try {
    const response = await productsAPI.getAll();
    console.log('Products API response:', response);
    
    // Handle both array and object response formats
    const productData = Array.isArray(response.data) ? response.data : response.data?.data || response.data?.products || [];
    
    if (productData.length > 0) {
      setProducts(productData);
    } else {
      console.warn('No products received, using sample data');
      setProducts(getSampleProducts());
    }
  } catch (err) {
    console.error('Error loading products:', err);
    setProducts(getSampleProducts());
  }
};
*/


// ✅ Use this when loading products
const loadProducts = async () => {
  try {
    const response = await productsAPI.getAll();
    const products = response.data.map(normalizeProduct);
    setProducts(products);
    console.log('Products loaded:', products.length);
  } catch (err) {
    console.error('Error loading products:', err);
    setError('Failed to load products');
  }
};


// Load user data (profile, cart, products)
const loadUserData = async () => {
  try {
    await Promise.all([
      loadProducts(),
      loadCart(),
      loadProfile(),
      loadOrders()
    ]);
  } catch (err) {
    console.error('Error loading user data:', err);
  }
};

// Load cart from backend
const loadCart = async () => {
  if (!user) return;
  
  try {
    // Extract userId from JWT token (works for both SQL and MongoDB)
    const userId = getUserIdFromToken();
    
    if (!userId) {
      console.error('No user ID found in token');
      return;
    }

    const response = await cartAPI.view(userId);
    setCart(response.data.items || []);
  } catch (err) {
    console.error('Error loading cart:', err);
  }
};

// Load profile from backend (map backend Address entity to frontend shape; fallback to localStorage)
const loadProfile = async () => {
  if (!user) return;
  try {
    // Prefer dedicated address API if available (it handles a local fallback)
    let addresses = [];
    try {
      if (typeof addressAPI?.getAll === 'function') {
        const addrRes = await addressAPI.getAll();
        addresses = Array.isArray(addrRes?.data) ? addrRes.data : addrRes?.data?.addresses || addrRes?.data || [];
      } else {
        // fallback to profile endpoint if addressAPI not provided
        const response = await authAPI.getProfile();
        const data = response.data || {};
        const rawAddresses = data.addresses || data.addressList || [];
        addresses = Array.isArray(rawAddresses) ? rawAddresses : [];
      }
    } catch (innerErr) {
      console.warn('Address fetch via addressAPI failed, trying authAPI profile', innerErr);
      try {
        const response = await authAPI.getProfile();
        const data = response.data || {};
        const rawAddresses = data.addresses || data.addressList || [];
        addresses = Array.isArray(rawAddresses) ? rawAddresses : [];
      } catch (e) {
        addresses = [];
      }
    }

    // Normalize addresses to frontend shape
    addresses = (addresses || []).map(a => {
      const addrLine1 = a.AddressLine1 || a.address || a.line1 || '';
      const addrLine2 = a.AddressLine2 || a.line2 || '';
      const city = a.City || a.city || '';
      const state = a.State || a.state || '';
      const postal = a.PostalCode || a.postalCode || a.pincode || '';
      const country = a.Country || a.country || '';

      const addressString = a.address || [
        addrLine1,
        addrLine2,
        city,
        state,
        postal,
        country
      ].filter(Boolean).join(', ').trim();

      return {
        id: a.Id ?? a.id ?? a.addressId ?? null,
        label: a.label || (a.IsDefault ? 'Home' : a.type) || 'Address',
        AddressLine1: addrLine1 || '',
        AddressLine2: addrLine2 || '',
        City: city || '',
        State: state || '',
        PostalCode: postal || '',
        Country: country || '',
        IsDefault: !!a.IsDefault,
        address: addressString || ''
      };
    });

    setProfileData(prev => ({
      ...prev,
      fullName: prev.fullName || '',
      email: prev.email || '',
      mobile: (prev.mobile || '').toString().trim(),
      addresses: addresses || []
    }));
  } catch (err) {
    console.error('Error loading profile:', err);
    // final fallback: empty addresses
    setProfileData(prev => ({ ...prev, addresses: [] }));
  }
};


useEffect(() => {
  const loadCategories = async () => {
    try {
      const res = await adminAPI.getCategories(); // you need to implement this in adminAPI
      setCategories(res.data);
    } catch (err) {
      console.error('Failed to fetch categories', err);
    }
  };
  loadCategories();
}, []);

// Load order history
const loadOrders = async () => {
  if (!user) return;
  try {
    const response = await ordersAPI.history();
    setOrders(response.data || []);
  } catch (err) {
    console.error('Error loading orders:', err);
  }
};

// Expose fetchAdminData at component scope so other handlers (e.g. buttons) can call it
const fetchAdminData = async () => {
  if (!user || user.role !== 'Admin' || currentPage !== 'admin') return;
  
  // ensure token exists before attempting admin requests
  const token = sessionStorage.getItem('token');
  if (!token) {
    sessionStorage.removeItem('user');
    setUser(null);
    setCurrentPage('home');
    return;
  }

  try {
    // allow missing API methods and tolerate partial failures
    const customersPromise =
      typeof adminAPI.getUsers === 'function'
        ? adminAPI.getUsers()
        : Promise.resolve({ data: [] });
    
    // ✅ FIXED: Use adminAPI.getOrders() instead of ordersAPI.history()
    const ordersPromise =
      typeof adminAPI.getOrders === 'function'
        ? adminAPI.getOrders()
        : Promise.resolve({ data: [] });

    const [customersRes, ordersRes] = await Promise.all([
      customersPromise,
      ordersPromise
    ]);

    const customersData = customersRes?.data || [];
    const ordersData = ordersRes?.data || [];

    // update raw state
    setAdminCustomers(customersData);
    setAdminOrders(ordersData);

    // calculate stats from FRESH data (not state)
    const totalSales = ordersData.reduce(
      (sum, order) => sum + (order?.totalAmount || 0),
      0
    );

    setAdminStats([
      {
        label: 'Total Sales',
        value: `₹${totalSales.toLocaleString()}`,
        change: '+12.5%'
      },
      {
        label: 'Total Orders',
        value: ordersData.length.toString(),
        change: '+8.2%'
      },
      {
        label: 'Total Customers',
        value: customersData.length.toString(),
        change: '+15.3%'
      },
      {
        label: 'Total Products',
        value: (products || []).length.toString(),
        change: '+3'
      }
    ]);
  } catch (err) {
    console.error('Failed to fetch admin data:', err);
    
    if (err?.response?.status === 401) {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      setUser(null);
      window.location.href = '/';
      return;
    }
    
    setError('Unable to load some admin data (see console).');
  }
};

useEffect(() => {
  fetchAdminData();
}, [user, currentPage, products]);


  // Sample products fallback
  const getSampleProducts = () => [
    {
      id: 1,
      name: 'Premium Smartphone X1',
      brand: 'TechBrand',
      price: 9999,
      rating: 4.5,
      reviewCount: 1250,
      image: 'https://via.placeholder.com/300x300/3b82f6/ffffff?text=Smartphone',
      category: 'Electronics',
      description: 'Powerful processor, stunning camera, all-day battery',
      specs: '6GB RAM, 128GB Storage, 48MP Camera'
    },
    {
      id: 2,
      name: 'Wireless Earbuds Pro',
      brand: 'AudioMax',
      price: 2999,
      rating: 4.7,
      reviewCount: 890,
      image: 'https://via.placeholder.com/300x300/8b5cf6/ffffff?text=Earbuds',
      category: 'Audio',
      description: 'Active noise cancellation, 30hr battery life',
      specs: 'Bluetooth 5.2, IPX4 Water Resistant'
    },
    {
      id: 3,
      name: 'Smart Watch Ultra',
      brand: 'FitTech',
      price: 4999,
      rating: 4.3,
      reviewCount: 567,
      image: 'https://via.placeholder.com/300x300/10b981/ffffff?text=Watch',
      category: 'Wearables',
      description: 'Health tracking, GPS, always-on display',
      specs: 'Heart Rate Monitor, Sleep Tracking, 7-day Battery'
    },
    {
      id: 4,
      name: 'Gaming Laptop Z9',
      brand: 'GameForce',
      price: 59999,
      rating: 4.8,
      reviewCount: 432,
      image: 'https://via.placeholder.com/300x300/ef4444/ffffff?text=Laptop',
      category: 'Computers',
      description: 'High-performance gaming, RGB keyboard',
      specs: 'RTX 3060, 16GB RAM, 512GB SSD, 144Hz Display'
    },
    {
      id: 5,
      name: 'Camera DSLR Pro',
      brand: 'PhotoMax',
      price: 45999,
      rating: 4.6,
      reviewCount: 289,
      image: 'https://via.placeholder.com/300x300/f59e0b/ffffff?text=Camera',
      category: 'Photography',
      description: 'Professional photography, 4K video',
      specs: '24MP Sensor, Dual Card Slots, Weather Sealed'
    },
    {
      id: 6,
      name: 'Tablet Pro 11',
      brand: 'TechBrand',
      price: 34999,
      rating: 4.4,
      reviewCount: 678,
      image: 'https://via.placeholder.com/300x300/06b6d4/ffffff?text=Tablet',
      category: 'Electronics',
      description: 'Stunning display, all-day battery, perfect for work',
      specs: '11-inch Display, 128GB Storage, Stylus Support'
    }
  ];


// ==========================================
// LOGIN HANDLER (MongoDB)
// ==========================================
const handleLogin = async () => {
  setError('');
  setLoading(true);

  try {
    // Validate input before sending
    if (!loginData.email?.trim()) {
      throw new Error('Email is required');
    }
    if (!loginData.password) {
      throw new Error('Password is required');
    }

    // USE MONGODB AUTHENTICATION
    const response = await mongoAuthAPI.login(
      loginData.email.trim(),
      loginData.password
    );

    const data = response?.data;

    if (!data) {
      throw new Error('No response data from server');
    }

    if (!data.token) {
      throw new Error('Authentication token not received from server');
    }

    // MongoDB returns role as string directly (not numeric)
    const userRole = String(data.role || '').trim();

    if (!userRole || (userRole !== 'Customer' && userRole !== 'Admin')) {
      throw new Error('Invalid user role received from server');
    }

    // 🔐 Role mismatch protection
    if (userRole !== loginRole) {
      throw new Error(
        `This account is registered as ${userRole}. Please select ${userRole} login.`
      );
    }

    // Extract MongoDB ObjectId from JWT token
    const userIdFromToken = getUserIdFromToken();
    
    // ✅ Use response data as fallback if token extraction fails
    const finalUserId = userIdFromToken || data.mongoUserId || data.userId || data.id;
    
    if (!finalUserId) {
      console.error('Login response data:', data);
      console.error('Decoded token userId:', userIdFromToken);
      throw new Error('User ID not found. Please contact support.');
    }

    // Persist session with all necessary user data
    const userData = { 
      ...data, 
      role: userRole, 
      userId: finalUserId, // MongoDB ObjectId from token or response
      id: finalUserId,
      email: data.email
    };
    
    sessionStorage.setItem('token', data.token);
    sessionStorage.setItem('user', JSON.stringify(userData));

    setUser({
      id: userIdFromToken,
      userId: userIdFromToken,
      email: data.email || '',
      role: userRole,
      name: data.fullName || data.name || '',
      mobile: data.mobile || ''
    });

    if (userRole === 'Admin') {
      setActiveTab('overview');
      setCurrentPage('admin');
    } else {
      setCurrentPage('products');
    }

  } catch (err) {
    console.error('Login error details:', err);
    setError(
      err.response?.data?.message ||
      err.response?.data?.title ||
      err.message ||
      'Login failed. Please try again.'
    );
  } finally {
    setLoading(false);
  }
};


// ==========================================
// REGISTER HANDLER (MongoDB)
// ==========================================
const handleRegister = async () => {
  const { fullName, email, mobile, password, confirmPassword } = registerData;
  
  // Validation
  if (!fullName?.trim()) {
    setError('Full name is required');
    return;
  }
  
  if (!email?.trim()) {
    setError('Email is required');
    return;
  }
  
  if (!mobile?.trim()) {
    setError('Mobile number is required');
    return;
    
  }
  
  if (!password) {
    setError('Password is required');
    return;
  }
  
  if (password !== confirmPassword) {
    setError('Passwords do not match');
    return;
  }
  
  if (password.length < 6) {
    setError('Password must be at least 6 characters');
    return;
  }
  
  setLoading(true);
  setError('');
  
  try {
    console.log('Attempting registration:', { fullName, email, mobile, role: loginRole });
    
    // USE MONGODB AUTHENTICATION
    const response = await mongoAuthAPI.register(
      fullName.trim(),
      email.trim(),
      mobile.trim(),
      password
    );
    
    console.log('Registration response:', response.data);
    
    const data = response.data;
    
    // Validate response
    if (!data.token) {
      throw new Error('No token received from server');
    }

    if (!data.role) {
      throw new Error('No role returned from server');
    }

    // Store token FIRST before extracting user ID
    sessionStorage.setItem('token', data.token);
    
    // Extract MongoDB ObjectId from JWT token
    const userIdFromToken = getUserIdFromToken();
    
    // Use fallback: try response data or generate from timestamp
    const finalUserId = userIdFromToken || data.userId || data.id || data.mongoUserId || `user_${Date.now()}`;
    
    if (!finalUserId) {
      console.error('Registration response data:', data);
      throw new Error('User ID not found in token. Please contact support.');
    }
    
    // Store token and user data
    const userData = {
      ...data,
      userId: finalUserId,
      id: finalUserId
    };
    
    sessionStorage.setItem('user', JSON.stringify(userData));
    
    // Set user state
    setUser({
      id: finalUserId,
      userId: finalUserId,
      email: data.email,
      role: data.role,
      name: data.fullName,
      mobile: data.mobile || mobile
    });
    
    // Set profile data
    setProfileData({
      fullName: data.fullName || fullName,
      email: data.email || email,
      mobile: data.mobile || mobile,
      addresses: []
    });
    
    console.log('Registration successful with userId:', finalUserId);
    
    // Redirect to products (new users are always customers)
    setCurrentPage('products');
    
  } catch (err) {
    console.error('Registration error:', err);
    console.error('Error response:', err.response?.data);
    
    const errorMessage = err.response?.data?.message || 
                        err.response?.data?.title ||
                        err.response?.data?.errors?.Email?.[0] ||
                        err.message || 
                        'Registration failed. Please try again.';
    
    setError(errorMessage);
  } finally {
    setLoading(false);
  }
};

// ==========================================
// LOGOUT (No changes needed)
// ==========================================
const handleLogout = () => {
  // Clear storage
  sessionStorage.removeItem('token');
  sessionStorage.removeItem('user');
  
  // Reset all state
  setUser(null);
  setCurrentPage('home');
  setCart([]);
  setOrders([]);
  setChatMessages([]);
  setChatOpen(false);
  setProfileData({
    fullName: '',
    email: '',
    mobile: '',
    addresses: []
  });
  
  console.log('User logged out successfully');
};

// Add this where you fetch customers
useEffect(() => {
  const fetchCustomers = async () => {
    try {
      const response = await adminAPI.getUsers();

      console.log('Admin users response:', response.data);

      // Axios always puts payload in response.data
      const users = Array.isArray(response.data)
        ? response.data
        : response.data?.users || [];

      setAdminCustomers(users);
      setCustomers(users);

    } catch (error) {
      console.error('Error fetching customers:', error);
      setAdminCustomers([]);
      setCustomers([]);
    }
  };

  if (activeTab === 'customers' && user?.role === 'Admin') {
    fetchCustomers();
  }
}, [activeTab, user]);

// At the top of your component, after state declarations
useEffect(() => {
  const token = sessionStorage.getItem('token');
  const savedUser = sessionStorage.getItem('user');

  if (!token || !savedUser) return;

  try {
    const userData = JSON.parse(savedUser);

    if (!userData.role || !userData.email) {
      throw new Error('Invalid session');
    }

    setUser({
      email: userData.email,
      role: userData.role,
      name: userData.fullName || userData.name,
      mobile: userData.mobile || ''
    });

    if (userData.role === 'Admin') {
      setActiveTab('overview');
      setCurrentPage('admin');
    } else {
      setCurrentPage('products');
      loadProducts();
    }

  } catch {
    sessionStorage.clear();
    setUser(null);
    setCurrentPage('home');
  }
}, []);

const fetchCart = async () => {
  if (!user) {
    // Guest user - load from localStorage
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
      try {
        setCart(JSON.parse(storedCart));
      } catch (e) {
        console.error('Error parsing cart from localStorage:', e);
        setCart([]);
      }
    }
    return;
  }

  // Logged-in user - fetch from backend
  try {
    // Extract userId from JWT token
    const userId = getUserIdFromToken();
    
    if (!userId) {
      console.error('No user ID found in token');
      setError('User session invalid. Please login again.');
      return;
    }

    const response = await cartAPI.view(userId);
    const backendCart = response.data?.items || response.data || [];
    setCart(backendCart);
    
    // Keep localStorage in sync for offline access
    localStorage.setItem('cart', JSON.stringify(backendCart));
  } catch (err) {
    console.error('Error fetching cart:', err);
    
    // Fallback to localStorage if backend fails
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
      try {
        setCart(JSON.parse(storedCart));
      } catch (e) {
        setCart([]);
      }
    }
  }
};

// ✅ Fetch cart when user state changes
useEffect(() => {
  fetchCart();
}, [user]);


// ==========================================
// FIXED: Properly extract MongoDB ObjectId from product
// ==========================================

// Helper function to extract MongoDB ObjectId
const getMongoId = (obj) => {
  if (!obj) return null;
  
  // If _id is an object with $oid property
  if (obj._id && obj._id.$oid) {
    return obj._id.$oid;
  }
  
  // If _id is already a string
  if (typeof obj._id === 'string') {
    return obj._id;
  }
  
  // Fallback to id property
  if (typeof obj.id === 'string') {
    return obj.id;
  }
  
  // Last resort - check for mongoId
  if (typeof obj.mongoId === 'string') {
    return obj.mongoId;
  }
  
  return null;
};

// ✅ FIXED: Add to cart with proper ObjectId extraction
const addToCart = async (product) => {
  console.log('Raw product object:', product);
  
  // ✅ Extract MongoDB ObjectId correctly
  const productId = getMongoId(product);
  
  console.log('Extracted product ID:', productId);
  
  if (!productId) {
    console.error('Could not extract product ID from:', product);
    setError('Product ID not found. Please try again.');
    return;
  }

  // Normalize product fields
  const normalizedProduct = {
    productId: productId,
    productName: product.name || product.productName || 'Unknown Product',
    price: product.price || 0,
    imageUrl: product.imageUrl || product.image || 'https://via.placeholder.com/300x300',
    brand: product.brand || '',
    ...product
  };

  if (!normalizedProduct.productName) {
    setError('Product information incomplete.');
    return;
  }

  if (user) {
    // Logged-in user → backend cart
    try {
      // ✅ Extract userId from JWT token
      const userId = getUserIdFromToken();
      
      if (!userId) {
        console.error('User object:', user);
        setError('User ID not found. Please login again.');
        return;
      }

      console.log('Adding to cart with:', {
        userId: userId,
        productId: productId,
        quantity: 1
      });

      // ✅ Send request with proper IDs
      const response = await cartAPI.add(userId, { 
        productId: productId, // Already a string
        quantity: 1 
      });

      console.log('Cart API response:', response.data);

      // ✅ Handle response
      const cartData = response.data;
      const updatedCart = Array.isArray(cartData?.items) 
        ? cartData.items 
        : Array.isArray(cartData) 
        ? cartData 
        : [];
      
      setCart(updatedCart);
      localStorage.setItem('cart', JSON.stringify(updatedCart));
      setError('');
      
      console.log('✅ Item added to cart successfully');
      
    } catch (err) {
      console.error('Error adding to cart:', err);
      console.error('Error response:', err.response?.data);
      console.error('Error status:', err.response?.status);
      
      if (err.response?.status === 404) {
        setError('Product not found in catalog.');
      } else if (err.response?.status === 400) {
        const errorMsg = err.response?.data?.message || 'Invalid request. Check product details.';
        setError(errorMsg);
        console.error('Bad Request Details:', {
          userId: getUserIdFromToken(),
          productId: productId,
          requestBody: { productId: productId, quantity: 1 }
        });
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to add item to cart.');
      }
    }
  } else {
    // Guest user → localStorage cart
    const updatedCart = [...cart];
    const existing = updatedCart.find(item => 
      String(item.productId) === String(productId)
    );
    
    if (existing) {
      existing.quantity += 1;
    } else {
      updatedCart.push({
        productId: productId,
        productName: normalizedProduct.productName,
        price: normalizedProduct.price,
        quantity: 1,
        imageUrl: normalizedProduct.imageUrl,
        brand: normalizedProduct.brand
      });
    }
    
    setCart(updatedCart);
    localStorage.setItem('cart', JSON.stringify(updatedCart));
    setError('');
    console.log('✅ Item added to guest cart');
  }
};


// ✅ When displaying products, normalize the _id field
const normalizeProduct = (product) => {
  return {
    ...product,
    id: getMongoId(product), // Extract proper ID
    _id: getMongoId(product) // Keep as string
  };
};



// ✅ UPDATED: Update cart quantity
const updateCartQuantity = async (productId, quantity) => {
  if (quantity <= 0) {
    await removeFromCart(productId);
    return;
  }

  if (user) {
    try {
      const userId = getUserIdFromToken();
      
      if (!userId) {
        setError('User session invalid. Please login again.');
        return;
      }

      // Ensure productId is a string
      const productIdString = String(productId);

      await cartAPI.update(userId, productIdString, quantity);
      
      setCart(prev => {
        const updatedCart = prev.map(item => {
          const itemId = String(item.productId || item.productIdString);
          return itemId === productIdString
            ? { ...item, quantity }
            : item;
        });
        localStorage.setItem('cart', JSON.stringify(updatedCart));
        return updatedCart;
      });
      
    } catch (err) {
      console.error('Error updating cart:', err);
      setError(err.response?.data?.message || 'Failed to update cart');
    }
  } else {
    // Guest user
    setCart(prev => {
      const updatedCart = prev.map(item =>
        String(item.productId) === String(productId)
          ? { ...item, quantity }
          : item
      );
      localStorage.setItem('cart', JSON.stringify(updatedCart));
      return updatedCart;
    });
  }
};



// ✅ UPDATED: Remove from cart
const removeFromCart = async (productId) => {
  if (user) {
    try {
      const userId = getUserIdFromToken();
      
      if (!userId) {
        setError('User session invalid. Please login again.');
        return;
      }

      const productIdString = String(productId);

      await cartAPI.remove(userId, productIdString);
      
      setCart(prev => {
        const updatedCart = prev.filter(item => {
          const itemId = String(item.productId || item.productIdString);
          return itemId !== productIdString;
        });
        localStorage.setItem('cart', JSON.stringify(updatedCart));
        return updatedCart;
      });
      
    } catch (err) {
      console.error('Error removing from cart:', err);
      setError(err.response?.data?.message || 'Failed to remove item');
    }
  } else {
    // Guest user
    setCart(prev => {
      const updatedCart = prev.filter(item => 
        String(item.productId) !== String(productId)
      );
      localStorage.setItem('cart', JSON.stringify(updatedCart));
      return updatedCart;
    });
  }
};

// ==========================================
// DEBUG: Add this to check what's being sent
// ==========================================
const debugAddToCart = (product) => {
  console.group('🔍 Add to Cart Debug Info');
  console.log('1. Raw Product:', product);
  console.log('2. Product _id:', product._id);
  console.log('3. Product _id.$oid:', product._id?.$oid);
  console.log('4. Extracted ID:', getMongoId(product));
  console.log('5. User ID from token:', getUserIdFromToken());
  console.groupEnd();
  
  // Then call actual add to cart
  addToCart(product);
};
// ==============================
// Clear entire cart (Mongo-safe)
// ==============================
const clearCart = async () => {
  if (user) {
    try {
      const userId = getUserIdFromToken();
      if (!userId) {
        setError('User session invalid. Please login again.');
        return;
      }

      console.log(`Clearing cart: userId=${userId}`);

      await cartAPI.clear(userId);

      setCart([]);
      localStorage.removeItem('cart');
      setError('');
      console.log('✅ Cart cleared successfully');

    } catch (err) {
      console.error('Error clearing cart:', err);
      setError(err.response?.data?.message || 'Failed to clear cart');
    }
  } else {
    // Guest user → localStorage
    setCart([]);
    localStorage.removeItem('cart');
    setError('');
  }
};

// ✅ OPTIONAL: Merge guest cart with backend cart on login
const mergeGuestCartOnLogin = async () => {
  const guestCart = localStorage.getItem('cart');
  if (!guestCart || !user) return;

  try {
    const guestItems = JSON.parse(guestCart);
    
    // Add each guest cart item to backend
    for (const item of guestItems) {
      try {
        await cartAPI.add({
          productId: item.productId,
          quantity: item.quantity
        });
      } catch (err) {
        console.error('Error merging cart item:', item, err);
      }
    }
    
    // Fetch updated cart from backend
    await fetchCart();
    
  } catch (err) {
    console.error('Error merging guest cart:', err);
  }
};


// Load Razorpay script
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

// Open Razorpay Checkout
const openRazorpay = async ({ orderId, amount, user }) => {
  const loaded = await loadRazorpayScript();
  if (!loaded) {
    alert('Failed to load Razorpay SDK');
    return;
  }

  // 1️⃣ Create Razorpay order (backend)
  const res = await fetch('http://localhost:5033/api/payment/initiate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({
      orderId,
      paymentMethod: 'Online'
    })
  });

  const data = await res.json();

  // 2️⃣ Razorpay options
  const options = {
    key: data.razorpayKeyId,
    amount: data.amount * 100,
    currency: data.currency,
    name: 'Your E-Commerce Store',
    description: `Order #${orderId}`,
    order_id: data.razorpayOrderId,
    prefill: {
      name: user?.fullName,
      email: user?.email,
      contact: user?.mobile
    },
    theme: { color: '#3B82F6' },

    handler: async function (response) {
      // 3️⃣ Verify payment
      const verifyRes = await fetch(
        'http://localhost:5033/api/payment/verify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            orderId
          })
        }
      );

      const verifyData = await verifyRes.json();

      if (verifyData.success) {
        alert('✅ Payment successful!');
        setCurrentPage('profile');
      } else {
        alert('❌ Payment verification failed');
      }
    },

    modal: {
      ondismiss: () => setLoading(false)
    }
  };

  const rzp = new window.Razorpay(options);
  rzp.open();
};

  // AI Chat simulation
  const sendMessageToAgent = async (message) => {
    setIsTyping(true);
    
    const userMsg = { role: 'user', content: message };
    setChatMessages(prev => [...prev, userMsg]);
    setCurrentMessage('');

    setTimeout(() => {
      let agentResponse = '';
      const lowerMsg = message.toLowerCase();

      if (lowerMsg.includes('hi') || lowerMsg.includes('hello')) {
        agentResponse = "Hello! I'm your AI shopping assistant. I can help you find products, add items to cart, or answer questions about your orders. What are you looking for today?";
      } else if (lowerMsg.includes('smartphone') || lowerMsg.includes('phone')) {
        const phones = products.filter(p => p.category === 'Electronics');
        if (lowerMsg.includes('under') || lowerMsg.includes('below')) {
          agentResponse = "I found some great smartphones under ₹10,000! Here's the best option:\n\n📱 Premium Smartphone X1 by TechBrand\nPrice: ₹9,999\nRating: 4.5/5 (1,250 reviews)\nFeatures: 6GB RAM, 128GB Storage, 48MP Camera\n\nWould you like me to add this to your cart?";
        } else {
          agentResponse = `I found ${phones.length} smartphones for you! The Premium Smartphone X1 is our top pick with excellent camera and battery life. Would you like more details?`;
        }
      } else if (lowerMsg.includes('add') && lowerMsg.includes('cart')) {
        if (products.length > 0) {
          addToCart(products[0]);
          agentResponse = `Great choice! I've added ${products[0].name} to your cart. Your cart now has ${cart.length + 1} items. Would you like to continue shopping or proceed to checkout?`;
        }
      } else if (lowerMsg.includes('cart') || lowerMsg.includes('show')) {
        if (cart.length === 0) {
          agentResponse = "Your cart is currently empty. Would you like me to help you find some products?";
        } else {
          const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
          agentResponse = `You have ${cart.length} items in your cart:\n\n${cart.map(item => `• ${item.product?.name || item.name} - ₹${item.price} x ${item.quantity}`).join('\n')}\n\nTotal: ₹${total}\n\nReady to checkout?`;
        }
      } else if (lowerMsg.includes('recommend') || lowerMsg.includes('suggest')) {
        agentResponse = "Based on popular choices, I recommend:\n\n1. Premium Smartphone X1 - Best value for money\n2. Wireless Earbuds Pro - Great audio quality\n3. Smart Watch Ultra - Perfect for fitness tracking\n\nWhich category interests you most?";
      } else if (lowerMsg.includes('checkout') || lowerMsg.includes('buy')) {
        agentResponse = "Perfect! To proceed with checkout, I'll need to confirm your shipping address. You have saved addresses. Would you like to use them, or add a new one?";
      } else {
        agentResponse = "I can help you with:\n• Finding products by category or budget\n• Adding items to your cart\n• Checking order status\n• Product recommendations\n\nWhat would you like to do?";
      }

      const assistantMsg = { role: 'assistant', content: agentResponse };
      setChatMessages(prev => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const stats = [
    { label: 'Total Sales', value: '₹2,45,890', change: '+12.5%', icon: <TrendingUp className="w-6 h-6" /> },
    { label: 'Total Orders', value: orders.length.toString(), change: '+8.2%', icon: <Package className="w-6 h-6" /> },
    { label: 'Total Customers', value: '856', change: '+15.3%', icon: <Users className="w-6 h-6" /> },
    { label: 'Total Products', value: products.length.toString(), change: '+3', icon: <ShoppingBag className="w-6 h-6" /> }
  ];

// ✅ FIXED: Filter addresses by logged-in user
const fetchAddresses = async () => {
  if (currentPage !== 'profile') return;

  try {
    let res;
    let currentUserId = null;
    
    // Get current user ID first
    try {
      const profileRes = await authAPI.getProfile();
      currentUserId = profileRes.data?.id || profileRes.data?.userId || profileRes.data?.Id;
      console.log('Current user ID:', currentUserId);
    } catch (err) {
      console.error('Failed to get user profile:', err);
    }
    
    // Primary: use dedicated address API
    if (typeof addressAPI?.getAll === 'function') {
      res = await addressAPI.getAll();
    }
    // Secondary: fallback to profile API containing addresses
    else if (typeof authAPI?.getProfile === 'function') {
      const profileRes = await authAPI.getProfile();
      res = { data: profileRes.data?.addresses || profileRes.data?.addressList || [] };
    }
    else {
      console.warn('No API available for fetching addresses');
      setProfileData(prev => ({ ...prev, addresses: [] }));
      return;
    }

    // Extract raw addresses
    const rawAddresses = Array.isArray(res.data) 
      ? res.data 
      : (res.data?.addresses || res.data?.addressList || []);

    console.log('Raw addresses from API:', rawAddresses);

    // ✅ CRITICAL FIX: Filter addresses by current user ID
    const userAddresses = currentUserId 
      ? rawAddresses.filter(a => {
          const addrUserId = a.userId || a.UserId || a.user_id || a.UserID;
          return addrUserId === currentUserId || addrUserId === String(currentUserId);
        })
      : rawAddresses; // If no user ID, show all (fallback)

    console.log('Filtered addresses for user:', userAddresses);

    // Normalize addresses
    const normalized = userAddresses.map((a, index) => {
      const addrLine1 = a.AddressLine1 || a.addressLine1 || a.line1 || '';
      const addrLine2 = a.AddressLine2 || a.addressLine2 || a.line2 || '';
      const city = a.City || a.city || '';
      const state = a.State || a.state || '';
      const postal = a.PostalCode || a.postalCode || a.pincode || '';
      const country = a.Country || a.country || '';
      const addressString = [addrLine1, addrLine2, city, state, postal, country]
        .filter(Boolean)
        .join(', ')
        .trim();

      return {
        id: a.Id || a.id || `addr_${Date.now()}_${index}`,
        label: a.Label || a.label || (a.IsDefault ? 'Home' : 'Address'),
        AddressLine1: addrLine1,
        AddressLine2: addrLine2,
        City: city,
        State: state,
        PostalCode: postal,
        Country: country,
        IsDefault: !!(a.IsDefault || a.isDefault),
        address: addressString,
        userId: a.userId || a.UserId || a.user_id || currentUserId
      };
    });

    console.log('Final normalized addresses:', normalized);
    setProfileData(prev => ({ ...prev, addresses: normalized }));
    
  } catch (err) {
    console.error('Failed to fetch addresses for profile page', err);
    setProfileData(prev => ({ ...prev, addresses: [] }));
  }
};

// Use in useEffect with proper dependency
useEffect(() => {
  if (currentPage === 'profile') {
    fetchAddresses();
  }
}, [currentPage]);
// Updated Login Component with Email OTP support
// Add this state at the top of your component:



// ==========================================
// EMAIL OTP HANDLERS (MongoDB)
// ==========================================
const handleRequestEmailOTP = async () => {
  if (!emailForOtp.includes('@')) {
    setError('Please enter a valid email address');
    return;
  }

  setLoading(true);
  setError('');

  try {
    // USE MONGODB EMAIL OTP
    const response = await mongoAuthAPI.requestEmailOtp(emailForOtp);
    
    if (response.data.success) {
      setEmailOtpSent(true);
      setOtpTimer(300); // 5 minutes
      setCanResend(false);
      
      // Auto-focus first OTP input
      setTimeout(() => {
        document.getElementById('email-otp-0')?.focus();
      }, 100);
    }
  } catch (err) {
    console.error('Email OTP request error:', err);
    setError(
      err.response?.data?.message || 
      err.message || 
      'Failed to send OTP. Please try again.'
    );
  } finally {
    setLoading(false);
  }
};


const handleVerifyEmailOTP = async () => {
  const otpValue = emailOtp.join('');
  
  if (otpValue.length !== 6) {
    setError('Please enter complete 6-digit OTP');
    return;
  }

  setLoading(true);
  setError('');

  try {
    // USE MONGODB EMAIL OTP VERIFICATION
    const response = await mongoAuthAPI.verifyEmailOtp(emailForOtp, otpValue);
    const data = response.data;

    if (!data.token) {
      throw new Error('No token received');
    }

    // Extract user ID from token
    sessionStorage.setItem('token', data.token);
    const userIdFromToken = getUserIdFromToken();

    const userData = {
      ...data,
      userId: userIdFromToken,
      id: userIdFromToken
    };

    sessionStorage.setItem('user', JSON.stringify(userData));

    setUser({
      id: userIdFromToken,
      userId: userIdFromToken,
      email: data.email,
      role: data.role,
      name: data.fullName,
      mobile: data.mobile
    });

    if (data.role === 'Admin') {
      setActiveTab('overview');
      setCurrentPage('admin');
    } else {
      setCurrentPage('products');
    }

  } catch (err) {
    console.error('Email OTP verification error:', err);
    setError(
      err.response?.data?.message || 
      err.message || 
      'Invalid OTP. Please try again.'
    );
  } finally {
    setLoading(false);
  }
};
// ==========================================
// SESSION RESTORATION (Updated)
// ==========================================
useEffect(() => {
  const token = sessionStorage.getItem('token');
  const savedUser = sessionStorage.getItem('user');

  if (!token || !savedUser) return;

  try {
    const userData = JSON.parse(savedUser);

    if (!userData.role || !userData.email) {
      throw new Error('Invalid session');
    }

    // Extract user ID from token (works for both SQL and MongoDB)
    const userIdFromToken = getUserIdFromToken();

    setUser({
      id: userIdFromToken || userData.id || userData.userId,
      userId: userIdFromToken || userData.userId || userData.id,
      email: userData.email,
      role: userData.role,
      name: userData.fullName || userData.name,
      mobile: userData.mobile || ''
    });

    if (userData.role === 'Admin') {
      setActiveTab('overview');
      setCurrentPage('admin');
    } else {
      setCurrentPage('products');
      loadProducts();
    }

  } catch {
    sessionStorage.clear();
    setUser(null);
    setCurrentPage('home');
  }
}, []);
//login
// OTP Timer countdown moved out of conditional to satisfy Hooks rules
useEffect(() => {
  if (currentPage === 'login') {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (otpTimer === 0 && otpSent) {
      setCanResend(true);
    }
  }
}, [otpTimer, otpSent, currentPage]);

if (!user && currentPage === 'login') {
  const handleEmailLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await authAPI.login(loginData.email.trim(), loginData.password);
      const data = response.data;
      const roleMap = { 0: 'Customer', 1: 'Admin' };
      const userRole = typeof data.role === 'number' ? roleMap[data.role] : data.role;
      
      if (userRole !== loginRole) {
        throw new Error(`This account is registered as ${userRole}. Please select ${userRole} login.`);
      }
      
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('user', JSON.stringify({ ...data, role: userRole }));
      setUser({ email: data.email, role: userRole, name: data.fullName, mobile: data.mobile || '' });
      setCurrentPage(userRole === 'Admin' ? 'admin' : 'products');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };
  const handleOtpLogin = async (mobile, otpCode) => {
    try {
      setLoading(true);
      setError('');

      // Try multiple possible API method names for robustness
      let response = null;
      const tryFns = [
        authAPI.verifyOtp?.bind(authAPI),
        authAPI.verifyOTP?.bind(authAPI),
        authAPI.verify?.bind(authAPI)
      ].filter(Boolean);

      if (tryFns.length === 0) throw new Error('OTP verify method not available on authAPI');

      for (const fn of tryFns) {
        try {
          response = await fn(mobile, otpCode);
          if (response && response.status >= 200 && response.status < 300) break;
        } catch (e) {
          // try next
        }
      }

      if (!response) throw new Error('OTP verification failed');

      const data = response.data;

      // Normalize role (0 = Customer, 1 = Admin)
      const roleMap = { 0: 'Customer', 1: 'Admin' };
      const userRole = typeof data.role === 'number' ? roleMap[data.role] : data.role;

      // Persist session
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('user', JSON.stringify({ ...data, role: userRole }));

      // Update user state
      setUser({
        email: data.email,
        role: userRole,
        name: data.fullName || data.name,
        mobile: data.mobile || mobile
      });

      // Redirect
      setCurrentPage(userRole === 'Admin' ? 'admin' : 'products');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };
 // ==========================================
// MOBILE OTP HANDLERS (MongoDB)
// ==========================================
const handleRequestOTP = async () => {
  if (mobileNumber.length !== 10) {
    setError('Please enter a valid 10-digit mobile number');
    return;
  }

  setLoading(true);
  setError('');

  try {
    // USE MONGODB OTP
    const response = await mongoAuthAPI.requestOtp(mobileNumber);
    
    if (response.data.success) {
      setOtpSent(true);
      setOtpTimer(300); // 5 minutes
      setCanResend(false);
      
      // Auto-focus first OTP input
      setTimeout(() => {
        document.getElementById('otp-0')?.focus();
      }, 100);
    }
  } catch (err) {
    console.error('OTP request error:', err);
    setError(
      err.response?.data?.message || 
      err.message || 
      'Failed to send OTP. Please try again.'
    );
  } finally {
    setLoading(false);
  }
};

const handleVerifyOTP = async () => {
  const otpValue = otp.join('');
  
  if (otpValue.length !== 6) {
    setError('Please enter complete 6-digit OTP');
    return;
  }

  setLoading(true);
  setError('');

  try {
    // USE MONGODB OTP VERIFICATION
    const response = await mongoAuthAPI.verifyOtp(mobileNumber, otpValue);
    const data = response.data;

    if (!data.token) {
      throw new Error('No token received');
    }

    // Extract user ID from token
    sessionStorage.setItem('token', data.token);
    const userIdFromToken = getUserIdFromToken();

    const userData = {
      ...data,
      userId: userIdFromToken,
      id: userIdFromToken
    };

    sessionStorage.setItem('user', JSON.stringify(userData));

    setUser({
      id: userIdFromToken,
      userId: userIdFromToken,
      email: data.email,
      role: data.role,
      name: data.fullName,
      mobile: data.mobile
    });

    if (data.role === 'Admin') {
      setActiveTab('overview');
      setCurrentPage('admin');
    } else {
      setCurrentPage('products');
    }

  } catch (err) {
    console.error('OTP verification error:', err);
    setError(
      err.response?.data?.message || 
      err.message || 
      'Invalid OTP. Please try again.'
    );
  } finally {
    setLoading(false);
  }
};

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-400 to-purple-500 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      <div className="max-w-xl w-full relative z-10">
        {/* Brand & Intro */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4 bg-white/20 backdrop-blur-md px-6 py-3 rounded-full border border-white/30">
            <ShoppingBag className="w-8 h-8 text-white" />
            <h1 className="text-2xl font-bold text-white">ShopAI</h1>
          </div>
          <p className="text-white/90 text-lg font-medium">Welcome back — sign in to continue</p>
          <p className="text-white/70 text-sm mt-1">Choose a login method that suits you</p>
        </div>

        {/* Card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Sign In</h2>
                <p className="text-sm text-gray-600 mt-2">Access your ShopAI account securely</p>
              </div>
              <div className="text-sm text-gray-600">
                New here?{' '}
                <button
            onClick={() => setCurrentPage('register')}
            className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
                >
            Create account
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-5 py-4 rounded-lg mb-6 flex items-start gap-3 animate-pulse">
                <div className="w-1 h-1 bg-red-500 rounded-full mt-2.5"></div>
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            {/* Login Method Tabs - Enhanced */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Select Login Method</label>
              <div className="grid grid-cols-3 gap-2 bg-gray-100 rounded-xl p-1.5">
                <button
            onClick={() => {
              setLoginMethod('email');
              setError('');
              setOtpSent(false);
              setEmailOtpSent(false);
              setLoginData({ email: '', password: '' });
            }}
            className={`py-2.5 px-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              loginMethod === 'email'
                ? 'bg-white shadow-md text-blue-600 scale-105'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            aria-pressed={loginMethod === 'email'}
                >
            <Lock className="w-4 h-4" />
            <span className="hidden sm:inline">Password</span>
                </button>

                <button
            onClick={() => {
              setLoginMethod('mobile');
              setError('');
              setOtpSent(false);
              setEmailOtpSent(false);
              setMobileNumber('');
              setOtp(['', '', '', '', '', '']);
            }}
            className={`py-2.5 px-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              loginMethod === 'mobile'
                ? 'bg-white shadow-md text-blue-600 scale-105'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            aria-pressed={loginMethod === 'mobile'}
                >
            <Smartphone className="w-4 h-4" />
            <span className="hidden sm:inline">Mobile</span>
                </button>

                <button
            onClick={() => {
              setLoginMethod('emailOtp');
              setError('');
              setOtpSent(false);
              setEmailOtpSent(false);
              setEmailForOtp('');
              setEmailOtp(['', '', '', '', '', '']);
            }}
            className={`py-2.5 px-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
              loginMethod === 'emailOtp'
                ? 'bg-white shadow-md text-blue-600 scale-105'
                : 'text-gray-600 hover:text-gray-900'
            }`}
            aria-pressed={loginMethod === 'emailOtp'}
                >
            <Mail className="w-4 h-4" />
            <span className="hidden sm:inline">Email</span>
                </button>
              </div>
            </div>

            {/* Role Selector - Enhanced */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Login As</label>
              <div className="relative">
                <select
            value={loginRole}
            onChange={(e) => setLoginRole(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 bg-white hover:bg-gray-50 cursor-pointer text-gray-700 font-medium appearance-none"
                >
            <option value="Customer">👤 Customer</option>
            <option value="Admin">🏢 Admin</option>
                </select>
                <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
                </div>
              </div>
            </div>

            {/* EMAIL + PASSWORD LOGIN */}
            {loginMethod === 'email' && (
              <form
                onSubmit={(e) => {
            e.preventDefault();
            handleLogin();
                }}
                className="space-y-5"
              >
                {/* Email Input */}
                <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Email Address</label>
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
              <input
                type="email"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 bg-gray-50 focus:bg-white placeholder-gray-400"
                placeholder="you@example.com"
                required
              />
            </div>
                </div>

                {/* Password Input */}
                <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Password</label>
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 bg-gray-50 focus:bg-white placeholder-gray-400"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
                </div>

                {/* Sign In Button */}
                <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
                >
            {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Signing in...
              </>
            ) : (
              <>
                <span>Sign In</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" />
                </svg>
              </>
            )}
                </button>
              </form>
            )}

            {/* MOBILE OTP LOGIN */}
            {loginMethod === 'mobile' && (
              <div className="space-y-5">
                {!otpSent ? (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Mobile Number</label>
                <div className="relative group">
                  <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
                  <input
              type="tel"
              value={mobileNumber}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                setMobileNumber(val);
              }}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 bg-gray-50 focus:bg-white placeholder-gray-400"
              placeholder="9876543210"
              maxLength={10}
              required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">📱 We'll send a 6-digit OTP to this number</p>
              </div>

              <button
                onClick={handleRequestOTP}
                disabled={loading || mobileNumber.length !== 10}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Sending OTP...
                  </>
                ) : (
                  <>
              <span>Send OTP</span>
              <KeyRound className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  </>
                )}
              </button>
            </>
                ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Enter 6-Digit OTP</label>
                <p className="text-xs text-gray-500 mb-4">
                  ⏱️ Sent to {mobileNumber} • Expires in{' '}
                  <span className="font-bold text-red-600">{formatTime(otpTimer)}</span>
                </p>
                <div className="flex gap-2 justify-center mb-4">
                  {otp.map((digit, idx) => (
              <input
                key={idx}
                id={`otp-${idx}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(idx, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                className="w-12 h-12 text-center text-2xl font-bold border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
              />
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleVerifyOTP}
                  disabled={loading || otp.join('').length !== 6}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
                >
                  {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Verifying...
              </>
                  ) : (
              <>
                <span>Verify & Sign In</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" />
                </svg>
              </>
                  )}
                </button>
                <button
                  onClick={() => {
              setOtpSent(false);
              setOtp(['', '', '', '', '', '']);
              setError('');
                  }}
                  className="px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-blue-300 hover:bg-blue-50 transition-all"
                >
                  Change Number
                </button>
              </div>

              <div className="text-sm text-center text-gray-500 mt-3">
                <button
                  onClick={handleRequestOTP}
                  disabled={!canResend || loading}
                  className="text-blue-600 hover:text-blue-700 font-semibold disabled:opacity-50 transition-colors"
                >
                  {canResend ? '🔄 Resend OTP' : `Resend in ${formatTime(otpTimer)}`}
                </button>
              </div>
            </>
                )}
              </div>
            )}

            {/* EMAIL OTP LOGIN */}
            {loginMethod === 'emailOtp' && (
              <div className="space-y-5">
                {!emailOtpSent ? (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
                  <input
              type="email"
              value={emailForOtp}
              onChange={(e) => setEmailForOtp(e.target.value)}
              className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 bg-gray-50 focus:bg-white placeholder-gray-400"
              placeholder="you@example.com"
              required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">📧 We'll send a 6-digit code to your email</p>
              </div>

              <button
                onClick={handleRequestEmailOTP}
                disabled={loading || !emailForOtp.includes('@')}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Sending OTP...
                  </>
                ) : (
                  <>
              <span>Send OTP to Email</span>
              <KeyRound className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                  </>
                )}
              </button>
            </>
                ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Enter 6-Digit OTP</label>
                <p className="text-xs text-gray-500 mb-4">
                  ⏱️ Sent to {emailForOtp} • Expires in{' '}
                  <span className="font-bold text-red-600">{formatTime(otpTimer)}</span>
                </p>
                <div className="flex gap-2 justify-center mb-4">
                  {emailOtp.map((digit, idx) => (
              <input
                key={idx}
                id={`email-otp-${idx}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => {
                  const val = e.target.value;
                  if (!/^\d*$/.test(val)) return;
                  const newOtp = [...emailOtp];
                  newOtp[idx] = val;
                  setEmailOtp(newOtp);
                  if (val && idx < 5) {
                    document.getElementById(`email-otp-${idx + 1}`)?.focus();
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Backspace' && !emailOtp[idx] && idx > 0) {
                    document.getElementById(`email-otp-${idx - 1}`)?.focus();
                  }
                }}
                className="w-12 h-12 text-center text-2xl font-bold border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
              />
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleVerifyEmailOTP}
                  disabled={loading || emailOtp.join('').length !== 6}
                  className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
                >
                  {loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Verifying...
              </>
                  ) : (
              <>
                <span>Verify & Sign In</span>
                <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" />
                </svg>
              </>
                  )}
                </button>
                <button
                  onClick={() => {
              setEmailOtpSent(false);
              setEmailOtp(['', '', '', '', '', '']);
              setError('');
                  }}
                  className="px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-blue-300 hover:bg-blue-50 transition-all"
                >
                  Change Email
                </button>
              </div>

              <div className="text-sm text-center text-gray-500 mt-3">
                <button
                  onClick={handleRequestEmailOTP}
                  disabled={!canResend || loading}
                  className="text-blue-600 hover:text-blue-700 font-semibold disabled:opacity-50 transition-colors"
                >
                  {canResend ? '🔄 Resend OTP' : `Resend in ${formatTime(otpTimer)}`}
                </button>
              </div>
            </>
                )}
              </div>
            )}
          <div className="mt-6 bg-white/20 backdrop-blur-md rounded-lg p-4 border border-white/30">
            <p className="text-xs text-gray-700 mb-2">Demo credentials</p>
            <div className="flex gap-2">
              <button
                onClick={() => { setLoginRole('Admin'); setLoginData({ email: 'admin@ecommerce.com', password: 'admin123' }); setLoginMethod('email'); }}
                className="flex-1 text-sm px-3 py-2 bg-gray-50 rounded-lg"
              >
                Admin — admin@ecommerce.com / admin123
              </button>
              <button
                onClick={() => { setLoginRole('Customer'); setLoginData({ email: 'customer@test.com', password: 'password123' }); setLoginMethod('email'); }}
                className="flex-1 text-sm px-3 py-2 bg-gray-50 rounded-lg"
              >
                Customer — customer@test.com / password123
              </button>
            </div>
          </div>

          {/* Back to Home */}
          <div className="mt-5 text-center">
            <button onClick={() => setCurrentPage('home')} className="text-gray-600 text-sm hover:text-gray-800">
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


  // Register Page
  if (!user && currentPage === 'register') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-400 to-purple-500 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>

        <div className="max-w-md w-full relative z-10">
          {/* Header Section */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 mb-4 bg-white/20 backdrop-blur-md px-6 py-3 rounded-full border border-white/30">
              <ShoppingBag className="w-8 h-8 text-white" />
              <h1 className="text-2xl font-bold text-white">ShopAI</h1>
            </div>
            <p className="text-white/90 text-lg font-medium">Join our shopping community</p>
            <p className="text-white/70 text-sm mt-2">Create your account to explore amazing deals</p>
          </div>

          {/* Main Card */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
            <div className="mb-8">
              <h2 className="text-3xl font-bold text-gray-900 mb-1">Sign Up</h2>
              <div className="h-1 w-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"></div>
            </div>

            {/* Error Alert */}
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-4 rounded-lg mb-6 flex items-start gap-3 animate-pulse">
                <div className="w-1 h-1 bg-red-500 rounded-full mt-2"></div>
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <div className="space-y-5">
              {/* Register As */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Register As
                </label>
                <div className="relative">
                  <select
                    value={loginRole}
                    onChange={(e) => setLoginRole(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 bg-gray-50 hover:bg-white cursor-pointer text-gray-700 font-medium appearance-none"
                  >
                    <option value="Customer">👤 Customer</option>
                    <option value="Admin">🏢 Admin</option>
                  </select>
                  <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Full Name
                </label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="text"
                    value={registerData.fullName}
                    onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 bg-gray-50 focus:bg-white placeholder-gray-400"
                    placeholder="John Doe"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 bg-gray-50 focus:bg-white placeholder-gray-400"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              {/* Mobile */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Mobile Number
                </label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="tel"
                    value={registerData.mobile}
                    onChange={(e) => setRegisterData({ ...registerData, mobile: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 bg-gray-50 focus:bg-white placeholder-gray-400"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                    className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 bg-gray-50 focus:bg-white placeholder-gray-400"
                    placeholder="••••••••"
                  />
                  <button
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">At least 6 characters recommended</p>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Confirm Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                    onKeyDown={(e) => e.key === 'Enter' && handleRegister()}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 bg-gray-50 focus:bg-white placeholder-gray-400"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              {/* Terms & Conditions */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="terms"
                  className="w-5 h-5 border-2 border-gray-300 rounded-lg cursor-pointer accent-blue-600"
                />
                <label htmlFor="terms" className="text-sm text-gray-600 cursor-pointer">
                  I agree to the <span className="text-blue-600 font-semibold hover:underline">Terms & Conditions</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleRegister}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Creating Account...
                  </>
                ) : (
                  <>
                    <span>Create Account</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" />
                    </svg>
                  </>
                )}
              </button>
            </div>

            {/* Sign In Link */}
            <div className="mt-8 text-center">
              <p className="text-gray-600 text-sm">
                Already have an account?{' '}
                <button
                  onClick={() => setCurrentPage('login')}
                  className="text-blue-600 hover:text-blue-700 font-bold transition-colors hover:underline"
                >
                  Sign In
                </button>
              </p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4 my-8">
              <div className="flex-1 h-px bg-gray-200"></div>
              <span className="text-gray-400 text-sm font-medium">Or continue as</span>
              <div className="flex-1 h-px bg-gray-200"></div>
            </div>

            {/* Social Login Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button className="py-3 px-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-300 flex items-center justify-center gap-2 group">
                <span className="text-xl">📧</span>
                <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600 transition-colors">Google</span>
              </button>
              <button className="py-3 px-4 border-2 border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-300 flex items-center justify-center gap-2 group">
                <span className="text-xl">🔵</span>
                <span className="text-sm font-medium text-gray-600 group-hover:text-blue-600 transition-colors">Apple</span>
              </button>
            </div>
          </div>

          {/* Back to Home */}
          <div className="text-center mt-8">
            <button
              onClick={() => setCurrentPage('home')}
              className="text-white/80 hover:text-white transition-colors font-medium flex items-center justify-center gap-2 mx-auto group"
            >
              <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" />
              </svg>
              Back to Home
            </button>
          </div>

          {/* Trust Badges */}
          <div className="mt-8 grid grid-cols-3 gap-3 text-center">
            <div className="bg-white/20 backdrop-blur-md rounded-xl p-3 border border-white/30">
              <div className="text-lg mb-1">🔒</div>
              <p className="text-white/80 text-xs font-semibold">Secure</p>
            </div>
            <div className="bg-white/20 backdrop-blur-md rounded-xl p-3 border border-white/30">
              <div className="text-lg mb-1">✅</div>
              <p className="text-white/80 text-xs font-semibold">Verified</p>
            </div>
            <div className="bg-white/20 backdrop-blur-md rounded-xl p-3 border border-white/30">
              <div className="text-lg mb-1">⚡</div>
              <p className="text-white/80 text-xs font-semibold">Fast</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
                // Helper functions for products page (must be before the conditional)
                /*const filteredProducts = (products || []).filter(product =>
                  product && (
                    (product.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (product.brand || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (product.category || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (product.categoryId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (product.description || '').toLowerCase().includes(searchQuery.toLowerCase())
                  )
                );*/
                
                  const filteredProducts = (products || []).filter(product =>
                  product && (
                    (typeof product.name === 'string' && product.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (typeof product.brand === 'string' && product.brand.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (typeof product.category === 'string' && product.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (typeof product.categoryId === 'string' && product.categoryId.toLowerCase().includes(searchQuery.toLowerCase())) ||
                    (typeof product.description === 'string' && product.description.toLowerCase().includes(searchQuery.toLowerCase()))
                  )
                );

                const uniqueCategories = Array.from(new Set((products || []).map(p => p.category || 'Uncategorized'))).slice(0, 20);

                const handleSort = (value) => {
                  if (!value) return;
                  const copy = [...(products || [])];
                  if (value === 'price-asc') copy.sort((a,b)=> (a.price||0)-(b.price||0));
                  if (value === 'price-desc') copy.sort((a,b)=> (b.price||0)-(a.price||0));
                  if (value === 'rating-desc') copy.sort((a,b)=> (b.rating||0)-(a.rating||0));
                  setProducts(copy);
                };

                const applyCategory = (cat) => {
                  setSearchQuery(cat === '' ? '' : cat);
                };

                const quickView = (p) => {
                  alert(`${p.name}\n\n${p.brand || ''}\n\n₹${p.price}\n\n${p.description || ''}`);
                };

                // Products Page (upgraded visual design)
                if (user && currentPage === 'products') {
                  return (
                    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
                      {/* Header */}
                      <header className="bg-white shadow-md sticky top-0 z-40 backdrop-blur-md bg-opacity-95">
                        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center gap-4">
                          <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg">
                              <ShoppingBag className="w-7 h-7 text-white" />
                            </div>
                            <div>
                              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">ShopAI</h1>
                              <p className="text-xs text-gray-500">AI-Powered Shopping Assistant</p>
                            </div>
                          </div>

                          <div className="hidden sm:flex items-center gap-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-full px-4 py-2.5 border border-gray-200 shadow-sm flex-1 max-w-md group hover:shadow-md transition-shadow">
                            <Search className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" />
                            <input
                              aria-label="Search products"
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              placeholder="Search products, brands, categories..."
                              className="bg-transparent outline-none text-sm w-full placeholder-gray-400"
                            />
                          </div>

                          <div className="flex items-center gap-2 sm:gap-3">
                            <button 
                              onClick={() => setCurrentPage('cart')} 
                              className="relative p-3 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 rounded-xl transition-all duration-300 group"
                            >
                              <ShoppingCart className="w-6 h-6 text-gray-700 group-hover:text-blue-600 transition-colors" />
                              {cart.length > 0 && (
                                <span className="absolute -top-2 -right-2 bg-gradient-to-br from-red-500 to-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                                  {cart.length}
                                </span>
                              )}
                            </button>

                            <button 
                              onClick={() => setChatOpen(!chatOpen)} 
                              className="p-3 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 rounded-xl transition-all duration-300 group"
                            >
                              <MessageCircle className="w-6 h-6 text-gray-700 group-hover:text-blue-600 transition-colors" />
                            </button>

                            <button 
                              onClick={() => setCurrentPage('profile')} 
                              className="p-3 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 rounded-xl transition-all duration-300 group"
                            >
                              <UserCircle className="w-6 h-6 text-gray-700 group-hover:text-blue-600 transition-colors" />
                            </button>

                            <button 
                              onClick={handleLogout} 
                              className="p-3 hover:bg-gradient-to-br hover:from-red-50 hover:to-orange-50 rounded-xl transition-all duration-300 group"
                            >
                              <LogOut className="w-6 h-6 text-gray-700 group-hover:text-red-600 transition-colors" />
                            </button>
                          </div>
                        </div>
                      </header>

                      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
                        {error && (
                          <div className="bg-gradient-to-r from-red-50 to-red-100 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-lg shadow-md flex items-start gap-4 animate-in fade-in slide-in-from-top">
                            <div className="w-1 h-1 bg-red-500 rounded-full mt-2"></div>
                            <p className="font-medium text-sm">{error}</p>
                          </div>
                        )}

                        {/* BANNER CAROUSEL SECTION */}
                        <div className="relative h-80 rounded-3xl overflow-hidden shadow-2xl group">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 opacity-90"></div>
                          
                          {/* Animated background pattern */}
                          <div className="absolute inset-0 opacity-10">
                            <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse"></div>
                            <div className="absolute bottom-0 right-0 w-96 h-96 bg-white rounded-full blur-3xl translate-x-1/2 translate-y-1/2 animate-pulse"></div>
                          </div>

                          {/* Banner content */}
                          <div className="relative h-full flex items-center justify-between px-12 z-10">
                            <div className="max-w-xl">
                              <div className="inline-block mb-4 px-4 py-2 bg-white/20 backdrop-blur-md rounded-full border border-white/30">
                                <span className="text-white text-sm font-bold">🎉 LIMITED TIME OFFER</span>
                              </div>
                              <h2 className="text-5xl font-extrabold text-white mb-4 leading-tight">
                                Summer Sale 2024
                              </h2>
                              <p className="text-white/90 text-lg mb-6 max-w-md">
                                Get up to <span className="text-4xl font-bold">50% OFF</span> on all electronics and gadgets. Free shipping on orders above ₹999!
                              </p>
                              <button
                                onClick={() => setSearchQuery('')}
                                className="px-8 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 active:scale-95"
                              >
                                Shop Now →
                              </button>
                            </div>

                            {/* Banner image/icon */}
                            <div className="hidden lg:flex items-center justify-center">
                              <div className="relative w-64 h-64">
                                <div className="absolute inset-0 bg-white/10 rounded-3xl blur-2xl animate-pulse"></div>
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <ShoppingBag className="w-40 h-40 text-white/30 animate-bounce" />
                                </div>
                                <div className="absolute -top-8 -right-8 bg-yellow-400 text-gray-900 px-6 py-2 rounded-full font-bold text-lg transform rotate-12 shadow-lg">
                                  -50%
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Banner gradient overlay */}
                          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-white via-transparent to-transparent"></div>
                        </div>

                        {/* OFFER CARDS SECTION */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Offer Card 1 */}
                          <div className="relative h-48 rounded-2xl overflow-hidden shadow-lg group cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                            <div className="absolute inset-0 bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600"></div>
                            <div className="absolute inset-0 opacity-20">
                              <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl translate-x-1/4 -translate-y-1/4"></div>
                            </div>
                            
                            <div className="relative h-full flex flex-col justify-between p-6 z-10">
                              <div>
                                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-bold mb-2">
                                  🎁 EXCLUSIVE
                                </span>
                                <h3 className="text-2xl font-bold text-white">Electronics</h3>
                                <p className="text-white/80 text-sm mt-1">Up to 40% off</p>
                              </div>
                              <button className="self-start px-4 py-2 bg-white text-green-600 rounded-lg font-bold text-sm hover:shadow-lg transition-all">
                                Explore
                              </button>
                            </div>
                          </div>

                          {/* Offer Card 2 */}
                          <div className="relative h-48 rounded-2xl overflow-hidden shadow-lg group cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                            <div className="absolute inset-0 bg-gradient-to-br from-pink-500 via-rose-500 to-red-600"></div>
                            <div className="absolute inset-0 opacity-20">
                              <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl translate-x-1/4 -translate-y-1/4"></div>
                            </div>
                            
                            <div className="relative h-full flex flex-col justify-between p-6 z-10">
                              <div>
                                <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-bold mb-2">
                                  ⭐ TRENDING
                                </span>
                                <h3 className="text-2xl font-bold text-white">Audio & Wearables</h3>
                                <p className="text-white/80 text-sm mt-1">Flat ₹1,500 off</p>
                              </div>
                              <button className="self-start px-4 py-2 bg-white text-pink-600 rounded-lg font-bold text-sm hover:shadow-lg transition-all">
                                Explore
                              </button>
                            </div>
                          </div>

                                      {/* Offer Card 3 */}
                                        <div className="relative h-48 rounded-2xl overflow-hidden shadow-lg group cursor-pointer hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                                        <div className="absolute inset-0 bg-gradient-to-br from-orange-400 via-amber-500 to-yellow-600"></div>
                                        <div className="absolute inset-0 opacity-20">
                                          <div className="absolute top-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl translate-x-1/4 -translate-y-1/4"></div>
                                        </div>
                                        
                                        <div className="relative h-full flex flex-col justify-between p-6 z-10">
                                          <div>
                                          <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-white text-xs font-bold mb-2">
                                            🚀 NEW LAUNCH
                                          </span>
                                          <h3 className="text-2xl font-bold text-white">Computers & Tablets</h3>
                                          <p className="text-white/80 text-sm mt-1">Starting ₹24,999</p>
                                          </div>
                                          <button className="self-start px-4 py-2 bg-white text-orange-600 rounded-lg font-bold text-sm hover:shadow-lg transition-all">
                                          Explore
                                          </button>
                                        </div>
                                        </div>
                                      </div>

                                      {/* SCROLL DOWN INDICATOR - Fixed on right side */}
                                      <div className="fixed right-6 top-1/2 -translate-y-1/2 z-30">
                                        <div className="flex flex-col items-center gap-3">
                                        <p className="text-sm font-semibold text-gray-600 writing-mode-vertical">Scroll</p>
                                        <div className="flex flex-col items-center gap-1">
                                          <svg className="w-6 h-6 text-blue-600 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                          </svg>
                                          <svg className="w-6 h-6 text-blue-400 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ animationDelay: '0.2s' }}>
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                                          </svg>
                                        </div>
                                        </div>
                                      </div>

                                      {/* Controls Section */}
                        <div className="space-y-6">
                          {/* Search Bar for Mobile */}
                          <div className="sm:hidden">
                            <div className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-full px-4 py-3 border border-gray-200 shadow-sm">
                              <Search className="w-5 h-5 text-gray-400" />
                              <input
                                aria-label="Search products"
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search..."
                                className="bg-transparent outline-none text-sm w-full"
                              />
                            </div>
                          </div>

                         { /* Sort and Filter Controls */}
                                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                        <div className="flex gap-3 items-center flex-wrap">
                                          <span className="text-sm font-semibold text-gray-600">Sort by:</span>
                                          <select 
                                          onChange={(e)=> handleSort(e.target.value)} 
                                          className="text-sm border-2 border-gray-200 rounded-xl px-4 py-2.5 bg-white hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all cursor-pointer font-medium"
                                          >
                                          <option value="">Most Relevant</option>
                                          <option value="price-asc">Price: Low to High</option>
                                          <option value="price-desc">Price: High to Low</option>
                                          <option value="rating-desc">⭐ Top Rated</option>
                                          </select>
                                        </div>

                                        <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 px-5 py-2.5 rounded-xl border border-blue-200">
                                          <Package className="w-5 h-5 text-blue-600" />
                                          <span className="text-sm font-semibold text-gray-900">{filteredProducts.length} Products Found</span>
                                        </div>
                                        </div>

                                        {/* Category Pills */}
                                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                                        <p className="text-sm font-semibold text-gray-600 mb-4">Browse by Category</p>
                                        <div className="flex gap-3 flex-wrap">
                                          <button 
                                          onClick={()=>applyCategory('')} 
                                          className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow-md ${
                                            searchQuery === '' 
                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105' 
                                            : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300'
                                          }`}
                                          >
                                          All Products
                                          </button>
                                          {Array.from(new Set((products || []).map(p => p.categoryName || p.category || 'Uncategorized'))).slice(0, 20).map((catName, i) => (
                                          <button 
                                            key={i} 
                                            onClick={()=> {
                                            setSearchQuery(catName === 'All Products' ? '' : catName);
                                            }} 
                                            className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 shadow-sm hover:shadow-md ${
                                            searchQuery === catName 
                                              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg scale-105' 
                                              : 'bg-white text-gray-700 border-2 border-gray-200 hover:border-blue-300'
                                            }`}
                                          >
                                            {catName}
                                          </button>
                                          ))}
                                        </div>
                                        </div>
                                      </div>

                                      {/* Products Grid */}
                        <div>
                          {filteredProducts.length === 0 ? (
                            <div className="bg-white rounded-3xl shadow-lg p-16 text-center border border-gray-100">
                              <div className="mb-6">
                                <Search className="w-20 h-20 mx-auto text-gray-300 mb-4" />
                              </div>
                              <h3 className="text-2xl font-bold text-gray-900 mb-3">No Products Found</h3>
                              <p className="text-gray-600 mb-8 text-lg">Try different keywords or explore other categories.</p>
                              <button 
                                onClick={() => { setSearchQuery(''); loadProducts(); }} 
                                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg hover:scale-105 transition-all font-semibold"
                              >
                                Clear Search & Browse All
                              </button>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                              {filteredProducts.map(product => (
                                <div 
                                  key={product.id} 
                                  className="bg-white rounded-2xl shadow-md hover:shadow-2xl overflow-hidden transform hover:-translate-y-2 transition-all duration-300 border border-gray-100 group flex flex-col"
                                >
                                  {/* Product Image */}
                                  <div className="relative h-64 overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200">
                                      <img
                                        src={
                                          product.imageUrl
                                            ? `/images/${product.imageUrl}` // React serves from public folder
                                            : 'https://via.placeholder.com/600x400/e5e7eb/9ca3af?text=Product+Image'
                                        }
                                        alt={product.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        onError={(e) => {
                                          e.currentTarget.src =
                                            'https://via.placeholder.com/600x400/e5e7eb/9ca3af?text=Product+Image';
                                        }}
                                      />

                                     <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                    {/* Brand Badge */}
                                    <div className="absolute left-4 top-4 bg-white/95 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-bold text-gray-900 shadow-lg">
                                      {product.brand || product.category || 'Product'}
                                    </div>

                                    {/* Price Badge */}
                                    <div className="absolute right-4 top-4 bg-gradient-to-br from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg group-hover:scale-110 transition-transform">
                                      ₹{product.price.toLocaleString()}
                                    </div>

                                    {/* Stock Badge */}
                                    {product.stockQuantity !== undefined && (
                                      <div
                                        className={`absolute left-4 bottom-4 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg transition-all ${
                                          product.stockQuantity > 20
                                            ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                                            : product.stockQuantity > 5
                                            ? 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white'
                                            : 'bg-gradient-to-r from-red-500 to-pink-600 text-white'
                                        }`}
                                      >
                                        {product.stockQuantity > 0 ? `${product.stockQuantity} in stock` : 'Out of Stock'}
                                      </div>
                                    )}
                                  </div>

                                  {/* Product Info */}
                                  <div className="p-5 flex flex-col flex-grow">
                                    <div className="mb-3">
                                      <h3 className="font-bold text-gray-900 text-lg line-clamp-2 group-hover:text-blue-600 transition-colors">
                                        {product.name}
                                      </h3>
                                      <p className="text-sm text-gray-600 mt-1.5 line-clamp-2 leading-relaxed">
                                        {product.description || 'Premium quality product'}
                                      </p>
                                    </div>

                                    {/* Rating */}
                                    {product.rating && (
                                      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
                                        <div className="flex items-center gap-1">
                                          {[...Array(5)].map((_, i) => (
                                            <span key={i} className="text-lg">
                                              {i < Math.floor(product.rating) ? '⭐' : '☆'}
                                            </span>
                                          ))}
                                        </div>
                                        <span className="text-xs font-semibold text-gray-600">
                                          {product.rating.toFixed(1)} ({product.reviewCount || 0})
                                        </span>
                                      </div>
                                    )}

                                    {/* Specs */}
                                    {product.specs && (
                                      <div className="mb-4 p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl text-xs text-gray-700 border border-blue-100">
                                        <p className="font-semibold text-gray-900 mb-1">Key Features</p>
                                        {product.specs}
                                      </div>
                                    )}

                                                    { /* Action Buttons */}
                                                      <div className="flex items-center gap-2 mt-auto pt-3">
                                                        <button
                                                        onClick={() => addToCart(product)}
                                                        disabled={product.stockQuantity === 0}
                                                        className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl hover:shadow-lg active:scale-95 transition-all text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group/btn"
                                                        >
                                                        <ShoppingCart className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                                        Add to Cart
                                                        </button>
                                                        <button 
                                                        onClick={() => quickView(product)} 
                                                        className="px-4 py-3 bg-white border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl transition-all text-sm font-bold text-gray-700 hover:text-blue-600"
                                                        >
                                                        👁️
                                                        </button>
                                                      </div>
                                                      </div>
                                                    </div>
                                                    ))}
                                                  </div>
                                                  )}
                                                </div>
                                                </div>

                                                {/* Chat Widget - Enhanced */}
                                                {chatOpen && (
                                                <div className="fixed bottom-6 right-6 w-96 bg-white rounded-2xl shadow-2xl flex flex-col border border-gray-100 z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-300">
                                                  {/* Chat Header */}
                                                  <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 text-white p-4 flex justify-between items-center shadow-md">
                                                  <div className="flex items-center gap-3">
                                                    <div className="relative">
                                                    <div className="w-10 h-10 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center">
                                                      <span className="text-lg">🤖</span>
                                                    </div>
                                                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
                                                    </div>
                                                    <div>
                                                    <h3 className="font-bold text-base leading-tight">ShopAI Assistant</h3>
                                                    <p className="text-xs text-blue-100 flex items-center gap-1">
                                                      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                                      Online & Ready
                                                    </p>
                                                    </div>
                                                  </div>
                                                  <button 
                                                    aria-label="Close chat" 
                                                    onClick={() => setChatOpen(false)} 
                                                    className="hover:bg-white/20 p-2 rounded-lg transition-all hover:scale-110 active:scale-95"
                                                  >
                                                    <X className="w-6 h-6" />
                                                  </button>
                                                  </div>

                                                  {/* Chat Messages Area */}
                                                  <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-white via-blue-50/30 to-white h-96">
                                                  {chatMessages.length === 0 && (
                                                    <div className="text-center text-gray-500 mt-16 flex flex-col items-center justify-center h-full">
                                                    <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-4 animate-bounce">
                                                      <MessageCircle className="w-8 h-8 text-blue-600" />
                                                    </div>
                                                    <p className="font-bold text-lg text-gray-700">Hi there! 👋</p>
                                                    <p className="text-sm text-gray-600 mt-2 max-w-xs">
                                                      I'm your AI shopping assistant. Ask me anything about our products!
                                                    </p>
                                                    <div className="mt-4 flex flex-wrap gap-2 justify-center">
                                                      <button 
                                                      onClick={() => sendMessageToAgent('Show me smartphones')}
                                                      className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-all border border-blue-200"
                                                      >
                                                      📱 Smartphones
                                                      </button>
                                                      <button 
                                                      onClick={() => sendMessageToAgent('Best budget products')}
                                                      className="text-xs bg-green-50 text-green-700 px-3 py-1.5 rounded-full hover:bg-green-100 transition-all border border-green-200"
                                                      >
                                                      💰 Budget
                                                      </button>
                                                      <button 
                                                      onClick={() => sendMessageToAgent('Top rated items')}
                                                      className="text-xs bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full hover:bg-orange-100 transition-all border border-orange-200"
                                                      >
                                                      ⭐ Top Rated
                                                      </button>
                                                    </div>
                                                    </div>
                                                  )}

                                                  {chatMessages.map((msg, idx) => (
                                                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                                                    <div className={`max-w-xs px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm border ${
                                                      msg.role === 'user' 
                                                      ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-br-none border-blue-600' 
                                                      : 'bg-gray-50 text-gray-900 rounded-bl-none border-gray-200 shadow-sm'
                                                    }`}>
                                                      {msg.content}
                                                    </div>
                                                    </div>
                                                  ))}

                                                  {isTyping && (
                                                    <div className="flex items-center gap-3 text-gray-600 animate-in fade-in duration-300">
                                                    <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                                      <div className="flex gap-1">
                                                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0s'}}></div>
                                                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                                                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                                                      </div>
                                                    </div>
                                                    <span className="text-xs text-gray-500 italic">Assistant is typing...</span>
                                                    </div>
                                                  )}

                                                  <div ref={chatEndRef} />
                                                  </div>

                                                  {/* Chat Input Area */}
                                                  <div className="border-t border-gray-100 p-4 bg-gradient-to-r from-white to-blue-50/50 flex gap-2">
                                                  <input
                                                    type="text"
                                                    value={currentMessage}
                                                    onChange={(e) => setCurrentMessage(e.target.value)}
                                                    onKeyDown={(e) => {
                                                    if (e.key === 'Enter' && currentMessage.trim() && !isTyping) {
                                                      sendMessageToAgent(currentMessage.trim());
                                                    }
                                                    }}
                                                    placeholder="Ask about products, discounts..."
                                                    disabled={isTyping}
                                                    className="flex-1 border-2 border-gray-200 rounded-full px-4 py-2.5 focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none transition-all bg-white text-gray-900 placeholder-gray-500 disabled:opacity-50"
                                                  />
                                                  <button 
                                                    onClick={() => {
                                                    if (currentMessage.trim() && !isTyping) {
                                                      sendMessageToAgent(currentMessage.trim());
                                                    }
                                                    }}
                                                    disabled={!currentMessage.trim() || isTyping}
                                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-3 rounded-full hover:shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center group"
                                                  >
                                                    <Send className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                                                  </button>
                                                  </div>

                                                  {/* Chat Footer Info */}
                                                  <div className="bg-blue-50/50 px-4 py-2 text-center text-xs text-gray-600 border-t border-gray-100">
                                                  <p>💡 Tip: Ask about specific products or categories</p>
                                                  </div>
                                                </div>
                                                )}

                                                {/* Floating Chat Button - Enhanced */}
                                                {!chatOpen && (
                                                <button
                                                  onClick={() => setChatOpen(true)}
                                                  className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all flex items-center justify-center z-40 animate-bounce group border-4 border-white active:scale-95"
                                                >
                                                  <div className="absolute inset-0 bg-blue-400 rounded-full opacity-75 animate-pulse"></div>
                                                  <MessageCircle className="w-7 h-7 relative z-10 group-hover:rotate-12 transition-transform" />
                                                  {chatMessages.length > 0 && (
                                                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-white">
                                                    {Math.min(chatMessages.length, 9)}
                                                  </span>
                                                  )}
                                                </button>
                                                )}
                      {!chatOpen && (
                        <button
                          onClick={() => setChatOpen(true)}
                          className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 transition-all flex items-center justify-center z-40 animate-pulse"
                        >
                          <MessageCircle className="w-8 h-8" />
                        </button>
                      )}
                    </div>
                    );
                }

                            
                // Cart Page
                if (user && currentPage === 'cart') {
                  const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
                  
                  return (
                    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
                      <header className="bg-white shadow-md sticky top-0 z-40 border-b border-gray-100">
                        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                          <button 
                            onClick={() => setCurrentPage('products')} 
                            className="flex items-center gap-2 text-gray-700 hover:text-blue-600 font-semibold transition-colors group"
                          >
                            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" />
                            </svg>
                            <span>Continue Shopping</span>
                          </button>
                          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Shopping Cart</h1>
                          <button 
                            onClick={handleLogout} 
                            className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-all font-semibold"
                          >
                            <LogOut className="w-5 h-5" />
                            <span className="hidden sm:inline">Logout</span>
                          </button>
                        </div>
                      </header>

                      <div className="max-w-7xl mx-auto px-6 py-8">
                        {cart.length === 0 ? (
                          <div className="bg-white rounded-3xl shadow-lg p-16 text-center border border-gray-100">
                            <ShoppingCart className="w-24 h-24 mx-auto text-gray-300 mb-6" />
                            <h2 className="text-3xl font-bold text-gray-900 mb-3">Your cart is empty</h2>
                            <p className="text-gray-600 mb-8 text-lg">Add some amazing products to get started!</p>
                            <button 
                              onClick={() => setCurrentPage('products')} 
                              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl hover:shadow-lg hover:scale-105 transition-all font-semibold text-lg"
                            >
                              🛍️ Start Shopping
                            </button>
                          </div>
                        ) : (
                          <div className="grid lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-4">
                              <div className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100">
                                {cart.map((item, idx) => (
                                  <div 
                                    key={item.productId} 
                                    className={`p-6 flex gap-6 items-start hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 ${idx !== cart.length - 1 ? 'border-b border-gray-100' : ''}`}
                                  >
                                    <div className="w-28 h-28 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl overflow-hidden flex-shrink-0 shadow-sm">
                                      <img 
                                        src={item.imageUrl} 
                                        alt={item.productName} 
                                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                                      />
                                    </div>

                                    <div className="flex-1">
                                      <div className="flex justify-between items-start mb-2">
                                        <h3 className="font-bold text-lg text-gray-900">{item.productName}</h3>
                                        <span className="text-sm font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                                          ₹{(item.price * item.quantity).toLocaleString()}
                                        </span>
                                      </div>
                                      <p className="text-gray-600 text-sm mb-4">₹{item.price.toLocaleString()} each</p>

                                      <div className="flex items-center gap-3 bg-gradient-to-r from-gray-50 to-gray-100 w-fit rounded-xl p-2">
                                        <button 
                                          onClick={() => updateCartQuantity(item.productId, item.quantity - 1)} 
                                          className="p-2 hover:bg-white rounded-lg transition-all"
                                        >
                                          <Minus className="w-5 h-5 text-gray-700 hover:text-blue-600" />
                                        </button>
                                        <span className="font-bold text-lg min-w-[2rem] text-center">{item.quantity}</span>
                                        <button 
                                          onClick={() => updateCartQuantity(item.productId, item.quantity + 1)} 
                                          className="p-2 hover:bg-white rounded-lg transition-all"
                                        >
                                          <Plus className="w-5 h-5 text-gray-700 hover:text-blue-600" />
                                        </button>
                                      </div>
                                    </div>

                                    <button 
                                      onClick={() => removeFromCart(item.productId)} 
                                      className="p-3 hover:bg-red-50 rounded-xl transition-all group"
                                    >
                                      <Trash2 className="w-6 h-6 text-gray-400 group-hover:text-red-600 transition-colors" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Order Summary */}
                            <div className="bg-white rounded-2xl shadow-lg p-8 h-fit border border-gray-100 sticky top-24">
                              <h3 className="text-xl font-bold mb-6">Order Summary</h3>
                              
                              <div className="space-y-4 border-b border-gray-200 pb-6 mb-6">
                                <div className="flex justify-between text-gray-600">
                                  <span className="font-medium">Subtotal</span>
                                  <span className="font-semibold">₹{total.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                  <span className="font-medium">Shipping</span>
                                  <span className="font-semibold text-green-600">Free</span>
                                </div>
                                <div className="flex justify-between text-gray-600">
                                  <span className="font-medium">Estimated Tax</span>
                                  <span className="font-semibold">₹0</span>
                                </div>
                              </div>

                              <div className="flex justify-between items-center mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-200">
                                <span className="text-lg font-bold text-gray-900">Total</span>
                                <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">₹{total.toLocaleString()}</span>
                              </div>

                              <button 
                                onClick={() => setCurrentPage('checkout')} 
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 rounded-xl hover:shadow-lg hover:scale-105 font-bold text-lg transition-all active:scale-95"
                              >
                                Proceed to Checkout →
                              </button>

                              <button 
                                onClick={() => setCurrentPage('products')} 
                                className="w-full mt-3 border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50 py-3 rounded-xl font-semibold transition-all"
                              >
                                Continue Shopping
                              </button>

                              <div className="mt-6 space-y-2 text-center text-xs text-gray-600">
                                <p className="flex items-center justify-center gap-2">✓ Free returns within 7 days</p>
                                <p className="flex items-center justify-center gap-2">✓ Secure checkout</p>
                                <p className="flex items-center justify-center gap-2">✓ 24/7 Customer support</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }

                            
                // Checkout Page
                if (user && currentPage === 'checkout') {
                  return (
                    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
                      <header className="bg-white shadow-md sticky top-0 z-40 border-b border-gray-100">
                        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4">
                          <button 
                            onClick={() => setCurrentPage('cart')} 
                            className="text-gray-700 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-all group"
                          >
                            <svg className="w-6 h-6 group-hover:-translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" />
                            </svg>
                          </button>
                          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Secure Checkout</h1>
                        </div>
                      </header>

                      <div className="max-w-7xl mx-auto px-6 py-8">
                        {error && (
                          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl shadow-md mb-6 flex items-start gap-4">
                            <div className="w-2 h-2 bg-red-600 rounded-full mt-2"></div>
                            <p className="font-medium">{error}</p>
                          </div>
                        )}

                        <div className="grid lg:grid-cols-3 gap-8">
                          <div className="lg:col-span-2 space-y-6">
                            {/* Shipping Address Section */}
                            <div className="bg-white rounded-2xl shadow-md p-8 border border-gray-100">
                              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <MapPin className="w-6 h-6 text-blue-600" />
                                Select Shipping Address
                              </h2>
                              {profileData.addresses && profileData.addresses.length > 0 ? (
                                <div className="space-y-3">
                                  {profileData.addresses.map((addr) => (
                                    <label 
                                      key={addr.id} 
                                      className="flex items-start p-5 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all group"
                                    >
                                      <input 
                                        type="radio" 
                                        name="address" 
                                        value={addr.id}
                                        defaultChecked={addr.IsDefault}
                                        className="mt-1 mr-4 w-5 h-5 cursor-pointer accent-blue-600" 
                                      />
                                      <div className="flex-1">
                                        <p className="font-bold text-lg text-gray-900 group-hover:text-blue-600 transition-colors">{addr.label || 'Address'}</p>
                                        <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                                          {[addr.AddressLine1, addr.AddressLine2, addr.City, addr.State, addr.PostalCode, addr.Country]
                                            .filter(Boolean)
                                            .join(', ')}
                                        </p>
                                        {addr.IsDefault && (
                                          <span className="inline-block text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full mt-2">
                                            Default Address
                                          </span>
                                        )}
                                      </div>
                                    </label>
                                  ))}
                                </div>
                              ) : (
                                <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-6 text-orange-800">
                                  <p className="font-semibold">No saved addresses found</p>
                                  <p className="text-sm mt-1">Add an address in your profile to proceed with checkout.</p>
                                </div>
                              )}
                            </div>

                            {/* Payment Method Section - Razorpay Integration */}
                            <div className="bg-white rounded-2xl shadow-md p-8 border border-gray-100">
                              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <CreditCard className="w-6 h-6 text-blue-600" />
                                Payment Method
                              </h2>
                              
                              <div className="space-y-3">
                                {/* COD Option */}
                                <label className="flex items-center p-5 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all group">
                                  <input 
                                    type="radio" 
                                    name="paymentMethod" 
                                    value="COD" 
                                    defaultChecked 
                                    className="mr-4 w-5 h-5 cursor-pointer accent-blue-600"
                                  />
                                  <div className="flex-1">
                                    <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                      Cash on Delivery (COD)
                                    </p>
                                    <p className="text-sm text-gray-600 mt-1">
                                      Pay when your order arrives at your doorstep
                                    </p>
                                  </div>
                                  <span className="text-2xl">💵</span>
                                </label>

                                {/* Online Payment Option - Razorpay */}
                                <label className="flex items-center p-5 border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 transition-all group">
                                  <input 
                                    type="radio" 
                                    name="paymentMethod" 
                                    value="Online" 
                                    className="mr-4 w-5 h-5 cursor-pointer accent-blue-600"
                                  />
                                  <div className="flex-1">
                                    <p className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                      Online Payment (Razorpay)
                                    </p>
                                    <p className="text-sm text-gray-600 mt-1">
                                      Credit/Debit Card, UPI, Wallet & more
                                    </p>
                                  </div>
                                  <span className="text-2xl">💳</span>
                                </label>
                              </div>

                              <p className="text-xs text-gray-500 text-center mt-4">
                                Secure payment powered by Razorpay
                              </p>
                            </div>

                            {/* Order Items Section */}
                            <div className="bg-white rounded-2xl shadow-md p-8 border border-gray-100">
                              <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
                                <ShoppingBag className="w-6 h-6 text-blue-600" />
                                Order Items ({cart.length})
                              </h2>
                              <div className="space-y-4">
                                {cart.map((item, idx) => (
                                  <div key={item.productId} className={`flex justify-between items-center py-4 ${idx !== cart.length - 1 ? 'border-b border-gray-200' : ''}`}>
                                    <div>
                                      <p className="font-bold text-gray-900">{item.productName || item.name}</p>
                                      <p className="text-sm text-gray-600 mt-1">₹{item.price.toLocaleString()} × {item.quantity} qty</p>
                                    </div>
                                    <span className="font-bold text-lg text-blue-600">₹{(item.price * item.quantity).toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Order Summary Sidebar */}
                          <div className="bg-white rounded-2xl shadow-lg p-8 h-fit border border-gray-100 sticky top-24">
                            <h3 className="text-2xl font-bold mb-8">Order Summary</h3>
                            
                            <div className="space-y-4 border-b border-gray-200 pb-6 mb-6">
                              <div className="flex justify-between">
                                <span className="text-gray-600 font-medium">Subtotal</span>
                                <span className="font-bold text-gray-900">₹{cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 font-medium">Shipping</span>
                                <span className="font-bold text-green-600">Free</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600 font-medium">Tax</span>
                                <span className="font-bold text-gray-900">₹0</span>
                              </div>
                            </div>

                            <div className="flex justify-between items-center mb-8 bg-gradient-to-r from-blue-100 to-indigo-100 p-5 rounded-xl border border-blue-300">
                              <span className="font-bold text-gray-900">Total Amount</span>
                              <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                ₹{cart.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()}
                              </span>
                            </div>

                            <button
                                  disabled={loading || cart.length === 0}
                                  onClick={async () => {
                                    setError('');

                                    if (!user) return setError('Please sign in to place an order.');
                                    if (!cart || cart.length === 0) return setError('Your cart is empty.');
                                    if (!profileData.addresses?.length) {
                                      return setError('Add a shipping address in your profile.');
                                    }

                                    setLoading(true);

                                    try {
                                      const addressSelect = document.querySelector(
                                        'input[name="address"]:checked'
                                      );
                                      const paymentSelect = document.querySelector(
                                        'input[name="paymentMethod"]:checked'
                                      );

                                      const selectedAddressId = addressSelect?.value;
                                      const paymentMethod = paymentSelect?.value || 'COD';

                                      if (!selectedAddressId) {
                                        setError('Please select a shipping address.');
                                        return;
                                      }

                                      const totalAmount = cart.reduce(
                                        (sum, item) => sum + item.price * item.quantity,
                                        0
                                      );

                                      // 1️⃣ Create / Confirm Order
                                      const orderResponse = await ordersAPI.confirm(
                                        Number(selectedAddressId)
                                      );

                                      const orderId =
                                        orderResponse?.data?.id ||
                                        orderResponse?.data?.orderId ||
                                        orderResponse?.id;

                                      if (!orderId) throw new Error('Order creation failed');

                                      // 2️⃣ ONLINE PAYMENT (Razorpay)
                                      if (paymentMethod === 'Online') {
                                        // ⚠️ Cart cleanup happens AFTER payment success (inside Razorpay handler)
                                        await openRazorpay({
                                          orderId,
                                          amount: totalAmount,
                                          user
                                        });
                                        return;
                                      }

                                      // 3️⃣ COD FLOW
                                      await cartAPI.clear?.();
                                      setCart([]);
                                      localStorage.removeItem('cart');
                                      sessionStorage.removeItem('cart');

                                      await loadOrders?.();
                                      setCurrentPage('profile');

                                      alert(`✅ Order Placed Successfully!\nOrder ID: #${orderId}`);
                                    } catch (err) {
                                      console.error(err);
                                      setError(
                                        err.response?.data?.message ||
                                          err.message ||
                                          'Failed to place order. Please try again.'
                                      );
                                    } finally {
                                      setLoading(false);
                                    }
                                  }}
                                  className="
                                    w-full
                                    bg-gradient-to-r from-blue-600 to-indigo-600
                                    hover:from-blue-700 hover:to-indigo-700
                                    text-white
                                    py-4
                                    rounded-xl
                                    font-bold
                                    text-lg
                                    shadow-lg
                                    hover:shadow-xl
                                    transition-all
                                    disabled:opacity-50
                                    disabled:cursor-not-allowed
                                    active:scale-95
                                    flex
                                    items-center
                                    justify-center
                                    gap-2
                                  "
                                >
                                  {loading ? (
                                    <>
                                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                      Processing...
                                    </>
                                  ) : (
                                    <>
                                      Place Order Securely
                                      <svg
                                        className="w-5 h-5"
                                        fill="currentColor"
                                        viewBox="0 0 20 20"
                                      >
                                        <path
                                          fillRule="evenodd"
                                          d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                                          clipRule="evenodd"
                                        />
                                      </svg>
                                    </>
                                  )}
                                </button>

                            <button
                              onClick={() => setCurrentPage('cart')}
                              className="w-full mt-3 border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50 py-3 rounded-xl font-bold transition-all"
                            >
                              ← Back to Cart
                            </button>

                            <div className="mt-8 space-y-3 text-sm text-center text-gray-600">
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-xl">🔒</span>
                                <span className="font-medium">SSL Encrypted Checkout</span>
                              </div>
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-xl">✓</span>
                                <span className="font-medium">Free returns within 7 days</span>
                              </div>
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-xl">💬</span>
                                <span className="font-medium">24/7 Customer Support</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Orders Page (to view order history with details)
                if (user && currentPage === 'orders') {
                  return (
                    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
                      <header className="bg-white shadow-md sticky top-0 z-40 border-b border-gray-100">
                        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg">
                              <ShoppingBag className="w-7 h-7 text-white" />
                            </div>
                            <div>
                              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">My Orders</h1>
                              <p className="text-xs text-gray-500">Track and manage your purchases</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setCurrentPage('products')}
                              className="hidden sm:flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-all font-medium"
                            >
                              🛍️ Continue Shopping
                            </button>
                            <button
                              onClick={() => setCurrentPage('profile')}
                              className="p-3 hover:bg-blue-50 rounded-xl transition-all"
                            >
                              <UserCircle className="w-6 h-6 text-gray-700" />
                            </button>
                            <button
                              onClick={handleLogout}
                              className="p-3 hover:bg-red-50 rounded-xl transition-all text-red-600"
                            >
                              <LogOut className="w-6 h-6" />
                            </button>
                          </div>
                        </div>
                      </header>

                      <div className="max-w-7xl mx-auto px-6 py-8">
                        {error && (
                          <div className="bg-red-50 border-2 border-red-200 text-red-700 px-6 py-4 rounded-xl shadow-md mb-6">
                            {error}
                          </div>
                        )}

                        {orders.length === 0 ? (
                          <div className="bg-white rounded-3xl shadow-lg p-16 text-center border border-gray-100">
                            <Package className="w-24 h-24 mx-auto text-gray-300 mb-6" />
                            <h2 className="text-3xl font-bold text-gray-900 mb-3">No Orders Yet</h2>
                            <p className="text-gray-600 mb-8 text-lg">Start your shopping journey today!</p>
                            <button
                              onClick={() => setCurrentPage('products')}
                              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl hover:shadow-lg hover:scale-105 transition-all font-semibold text-lg"
                            >
                              🛍️ Shop Now
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            <div className="bg-white rounded-2xl shadow-md p-6 border border-gray-100">
                              <p className="text-gray-600">Total Orders: <span className="font-bold text-blue-600 text-lg">{orders.length}</span></p>
                            </div>

                            {orders.map(order => (
                              <div key={order.id} className="bg-white rounded-2xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
                                {/* Order Header */}
                                <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-blue-50 px-8 py-6 border-b border-gray-200 flex justify-between items-center">
                                  <div>
                                    <h3 className="text-2xl font-bold text-gray-900">Order #{order.id}</h3>
                                    <p className="text-sm text-gray-600 mt-2 flex items-center gap-2">
                                      <Calendar className="w-4 h-4" />
                                      {order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">₹{(order.totalAmount || 0).toLocaleString()}</p>
                                    <span className={`inline-block mt-3 px-5 py-2 rounded-full text-sm font-bold shadow-sm ${
                                      order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                                      order.status === 'Shipped' ? 'bg-blue-100 text-blue-800' :
                                      order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                                      order.status === 'Cancelled' ? 'bg-red-100 text-red-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      {order.status === 'Pending' && '⏳ '}
                                      {order.status === 'Shipped' && '🚚 '}
                                      {order.status === 'Delivered' && '✅ '}
                                      {order.status === 'Cancelled' && '❌ '}
                                      {order.status || 'Processing'}
                                    </span>
                                  </div>
                                </div>

                                {/* Order Items */}
                                <div className="px-8 py-6 border-b border-gray-200">
                                  <p className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">📦 Items Ordered ({order.items?.length || 0})</p>
                                  <div className="space-y-3">
                                    {order.items && order.items.length > 0 ? (
                                      order.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:from-blue-50 hover:to-indigo-50 transition-colors">
                                          <div>
                                            <p className="font-semibold text-gray-900">{item.productName || item.name}</p>
                                            <p className="text-sm text-gray-600 mt-1">₹{item.price?.toLocaleString() || 'N/A'} × {item.quantity} units</p>
                                          </div>
                                          <span className="font-bold text-lg text-blue-600">₹{((item.price || 0) * (item.quantity || 1)).toLocaleString()}</span>
                                        </div>
                                      ))
                                    ) : (
                                      <p className="text-gray-500 text-sm">No items information available</p>
                                    )}
                                  </div>
                                </div>

                                {/* Shipping Address */}
                                {order.shippingAddress && (
                                  <div className="px-8 py-6 border-b border-gray-200">
                                    <p className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide flex items-center gap-2">
                                      <MapPin className="w-4 h-4" />
                                      Shipping Address
                                    </p>
                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
                                      <p className="font-semibold text-gray-900">{order.shippingAddress.addressLine1}</p>
                                      {order.shippingAddress.addressLine2 && <p className="text-gray-700">{order.shippingAddress.addressLine2}</p>}
                                      <p className="text-gray-700">{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.postalCode}</p>
                                      <p className="text-gray-700">{order.shippingAddress.country}</p>
                                    </div>
                                  </div>
                                )}

                                {/* Order Actions */}
                                <div className="px-8 py-6 flex gap-3 flex-wrap">
                                  <button
                                    onClick={() => alert(JSON.stringify(order, null, 2))}
                                    className="px-5 py-2.5 border-2 border-gray-300 rounded-lg text-gray-700 hover:border-blue-400 hover:bg-blue-50 text-sm font-bold transition-all"
                                  >
                                    📋 View Details
                                  </button>
                                  {order.status !== 'Cancelled' && (
                                    <button
                                      onClick={async () => {
                                        if (!window.confirm('Are you sure you want to cancel this order?')) return;
                                        try {
                                          setLoading(true);
                                          if (typeof ordersAPI.cancel === 'function') {
                                            await ordersAPI.cancel(order.id);
                                          } else if (typeof ordersAPI.updateStatus === 'function') {
                                            await ordersAPI.updateStatus(order.id, { status: 'Cancelled' });
                                          }
                                          await loadOrders();
                                          alert('✅ Order cancelled successfully');
                                        } catch (err) {
                                          setError(err.response?.data?.message || 'Failed to cancel order');
                                        } finally {
                                          setLoading(false);
                                        }
                                      }}
                                      className="px-5 py-2.5 border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 text-sm font-bold transition-all"
                                    >
                                      ❌ Cancel Order
                                    </button>
                                  )}
                                  <button
                                    onClick={() => setCurrentPage('products')}
                                    className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg text-sm font-bold transition-all ml-auto"
                                  >
                                    🛍️ Order Similar Items
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
            
// Profile Page
// ================= PROFILE PAGE =================
if (user && currentPage === 'profile') {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">

      {/* HEADER */}
      <header className="bg-white shadow-md sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg">
              <ShoppingBag className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">ShopAI</h1>
              <p className="text-xs text-gray-500">AI-Powered Shopping Assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setCurrentPage('products')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-all font-medium"
            >
              🛍️ Shop
            </button>

            <button
              onClick={() => setCurrentPage('orders')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-all font-medium"
            >
              📦 Orders
            </button>

            <button
              onClick={() => setCurrentPage('cart')}
              className="relative p-3 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 rounded-xl transition-all group"
            >
              <ShoppingCart className="w-6 h-6 text-gray-700 group-hover:text-blue-600 transition-colors" />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-gradient-to-br from-red-500 to-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                  {cart.length}
                </span>
              )}
            </button>

            <button className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl hover:shadow-md transition-all group border border-blue-200">
              <UserCircle className="w-6 h-6 text-blue-600 group-hover:text-indigo-700 transition-colors" />
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all font-semibold hover:shadow-sm"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* PAGE HEADER */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-2">Welcome, {user?.name || 'User'}! 👋</h2>
              <p className="text-gray-600">Manage your profile, addresses, and orders in one place</p>
            </div>
            <button
              onClick={editMode ? handleSaveProfile : () => setEditMode(true)}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center gap-2 ${
                editMode
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
              }`}
            >
              {editMode ? (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Save Changes
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  Edit Profile
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* MAIN CONTENT */}
          <div className="lg:col-span-2 space-y-6">
            {/* PERSONAL INFO CARD */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  Personal Information
                </h3>
              </div>

              <div className="p-8">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Full Name</label>
                    <input
                      value={profileData.fullName || ''}
                      onChange={e =>
                        setProfileData({ ...profileData, fullName: e.target.value })
                      }
                      disabled={!editMode}
                      className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 focus:outline-none ${
                        editMode
                          ? 'border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white'
                          : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                      }`}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Email Address</label>
                    <input
                      value={profileData.email || ''}
                      disabled
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 cursor-not-allowed text-gray-600"
                    />
                  </div>

                  {/* Mobile */}
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Mobile Number</label>
                    <input
                      type="tel"
                      value={(profileData.mobile || '').toString()}
                      onChange={e =>
                        setProfileData({ ...profileData, mobile: e.target.value })
                      }
                      disabled={!editMode}
                      className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 focus:outline-none ${
                        editMode
                          ? 'border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white'
                          : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* ADDRESSES CARD */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-8 py-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  Saved Addresses
                </h3>
              </div>

              <div className="p-8">
                <div className="flex gap-3 mb-6">
                  {/* Add Address Button */}
                  <button
                    onClick={async () => {
                      try {
                        const line1 = window.prompt('📍 Address Line 1');
                        if (!line1) return;

                        const payload = {
                          AddressLine1: line1,
                          AddressLine2: window.prompt('📍 Address Line 2 (optional)') || '',
                          City: window.prompt('🏙️ City') || '',
                          State: window.prompt('📌 State (optional)') || '',
                          PostalCode: window.prompt('📮 Postal Code (optional)') || '',
                          Country: window.prompt('🌍 Country', 'India') || 'India',
                          IsDefault: window.confirm('⭐ Set as default address?')
                        };

                        await addressAPI.add(payload);

                        if (typeof addressAPI.syncLocalAddresses === 'function') {
                          await addressAPI.syncLocalAddresses();
                        }

                        await fetchAddresses();
                        alert('✅ Address added successfully');
                      } catch (err) {
                        console.error('Add address error:', err);
                        alert(err?.response?.data?.message || err.message || 'Failed to add address');
                      }
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg active:scale-95 transition-all font-bold flex items-center gap-2 group"
                  >
                    <Plus className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    Add New Address
                  </button>

                  {/* Delete All Button */}
                  {profileData.addresses && profileData.addresses.length > 0 && (
                    <button
                      onClick={async () => {
                        if (!window.confirm('🗑️ Delete all your addresses? This cannot be undone!')) return;

                        try {
                          for (const addr of profileData.addresses) {
                            await addressAPI.remove(addr.id);
                          }
                          await fetchAddresses();
                          alert('✅ All addresses deleted');
                        } catch (err) {
                          console.error('Delete error:', err);
                          alert('❌ Failed to delete some addresses');
                        }
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:shadow-lg active:scale-95 transition-all font-bold flex items-center gap-2 group"
                    >
                      <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      Delete All
                    </button>
                  )}
                </div>

                {/* Address List */}
                {!profileData.addresses || profileData.addresses.length === 0 ? (
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 text-center border-2 border-dashed border-gray-300">
                    <MapPin className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-600 font-medium">No addresses saved yet</p>
                    <p className="text-sm text-gray-500 mt-1">Add your first address to make checkout faster</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profileData.addresses.map((addr, idx) => (
                      <div
                        key={addr.id}
                        className="border-2 border-gray-200 rounded-xl p-5 bg-gradient-to-br from-white to-gray-50 hover:from-blue-50 hover:to-indigo-50 hover:border-blue-300 transition-all duration-300 group shadow-sm hover:shadow-md"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-bold text-lg text-gray-900">
                                {addr.label || (addr.IsDefault ? 'Home' : `Address ${idx + 1}`)}
                              </p>
                              {addr.IsDefault && (
                                <span className="text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1 rounded-full">
                                  ⭐ Default
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              if (!window.confirm('❌ Delete this address?')) return;
                              try {
                                await addressAPI.remove(addr.id);
                                await fetchAddresses();
                                alert('✅ Address deleted');
                              } catch (err) {
                                console.error('Delete error:', err);
                                alert('❌ Failed to delete address');
                              }
                            }}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed mb-3 group-hover:text-gray-900 transition-colors">
                          {[
                            addr.AddressLine1,
                            addr.AddressLine2,
                            addr.City,
                            addr.State,
                            addr.PostalCode,
                            addr.Country
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                        <button
                          onClick={() => {
                            setEditingId(addr.id);
                            setForm(addr);
                          }}
                          className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1 rounded-lg hover:bg-blue-100 transition-all"
                        >
                          ✏️ Edit
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="lg:col-span-1">
            {/* ACCOUNT STATS */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden mb-6">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Account Stats</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <div>
                    <p className="text-sm text-gray-600">Total Orders</p>
                    <p className="text-2xl font-bold text-blue-600">{orders.length}</p>
                  </div>
                  <Package className="w-8 h-8 text-blue-400 opacity-30" />
                </div>

                <div className="flex items-center justify-between p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <div>
                    <p className="text-sm text-gray-600">Addresses Saved</p>
                    <p className="text-2xl font-bold text-green-600">{profileData.addresses?.length || 0}</p>
                  </div>
                  <MapPin className="w-8 h-8 text-green-400 opacity-30" />
                </div>

                <div className="flex items-center justify-between p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-200">
                  <div>
                    <p className="text-sm text-gray-600">Cart Items</p>
                    <p className="text-2xl font-bold text-orange-600">{cart.length}</p>
                  </div>
                  <ShoppingCart className="w-8 h-8 text-orange-400 opacity-30" />
                </div>
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-6 space-y-3">
                <button
                  onClick={() => setCurrentPage('products')}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:shadow-lg active:scale-95 transition-all font-bold flex items-center justify-center gap-2 group"
                >
                  <ShoppingBag className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  Continue Shopping
                </button>

                <button
                  onClick={() => setCurrentPage('orders')}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:shadow-lg active:scale-95 transition-all font-bold flex items-center justify-center gap-2 group"
                >
                  <Package className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  View All Orders
                </button>

                <button
                  onClick={() => setCurrentPage('cart')}
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg active:scale-95 transition-all font-bold flex items-center justify-center gap-2 group"
                >
                  <ShoppingCart className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  View My Cart
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RECENT ORDERS SECTION */}
        {orders.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-8 py-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                Recent Orders
              </h3>
            </div>

            <div className="overflow-x-auto">
              <div className="p-8 space-y-3">
                {orders.slice(0, 5).map((order, idx) => (
                  <div
                    key={order.id}
                    className="border-2 border-gray-200 rounded-xl p-5 flex justify-between items-center hover:border-blue-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 group"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center text-sm font-bold text-blue-700">
                          #{order.id % 100}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">Order #{order.id}</p>
                          <p className="text-sm text-gray-500">
                            {order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="text-right mr-4">
                      <p className="font-bold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        ₹{(order.totalAmount || 0).toLocaleString()}
                      </p>
                      <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full mt-1 ${
                        order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'Shipped' ? 'bg-purple-100 text-purple-800' :
                        order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {order.status === 'Pending' && '⏳ '}
                        {order.status === 'Processing' && '⚙️ '}
                        {order.status === 'Shipped' && '🚚 '}
                        {order.status === 'Delivered' && '✅ '}
                        {order.status || 'Processing'}
                      </span>
                    </div>

                    <button
                      onClick={() => setCurrentPage('orders')}
                      className="px-4 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all font-semibold group-hover:scale-105"
                    >
                      View →
                    </button>
                  </div>
                ))}
              </div>

              {orders.length > 5 && (
                <div className="px-8 py-4 border-t border-gray-200 text-center">
                  <button
                    onClick={() => setCurrentPage('orders')}
                    className="text-blue-600 hover:text-blue-700 font-bold text-sm"
                  >
                    View All {orders.length} Orders →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
// Admin Dashboard
if (user && user.role === 'Admin' && currentPage === 'admin') {
  // Fetch Stock Analysis
  const fetchStockAnalysis = async () => {
    try {
      setLoading(true);
      const [analysisRes, lowStockRes] = await Promise.all([
        adminAPI.getStockAnalysis(),
        adminAPI.getLowStockProducts()
      ]);
      
      setStockAnalysis(analysisRes?.data || []);
      setLowStockProducts(lowStockRes?.data || []);
      setError('');
    } catch (err) {
      console.error('Failed to fetch stock analysis:', err);
      setError(err.response?.data?.message || 'Failed to load stock analysis');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Sales Report
  const fetchSalesReport = async () => {
    try {
      setLoading(true);
      const [reportRes, categoryRes, productRes, revenueRes, topRes, statsRes, metricsRes] = await Promise.all([
        adminAPI.getSalesReport(dateRange.startDate, dateRange.endDate),
        adminAPI.getSalesbyCategory(dateRange.startDate, dateRange.endDate),
        adminAPI.getSalesbyProduct(dateRange.startDate, dateRange.endDate),
        adminAPI.getRevenue(dateRange.startDate, dateRange.endDate),
        adminAPI.getTopProducts(10),
        adminAPI.getOrderStats(),
        adminAPI.getDailyMetrics(dateRange.startDate, dateRange.endDate)
      ]);
      
      setSalesReport(reportRes?.data);
      setSalesByCategory(categoryRes?.data || []);
      setSalesByProduct(productRes?.data || []);
      setRevenue(revenueRes?.data);
      setTopProducts(topRes?.data || []);
      setOrderStats(statsRes?.data);
      setDailyMetrics(metricsRes?.data || []);
      setError('');
    } catch (err) {
      console.error('Failed to fetch sales report:', err);
      setError(err.response?.data?.message || 'Failed to load sales report');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* HEADER */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="bg-white/10 p-2 rounded-lg">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">Admin Console</h1>
              <p className="text-sm opacity-90">Manage products, customers, orders & analytics</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs opacity-90">{user.role}</p>
            </div>

            <button
              onClick={() => {
                setCurrentPage('products');
              }}
              className="hidden sm:inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-2 rounded-lg text-sm"
            >
              <Package className="w-4 h-4" /> View Store
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white text-red-600 hover:bg-white/90 px-3 py-2 rounded-lg text-sm font-medium"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* TABS */}
      <div className="bg-white border-b sticky top-20 z-30 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-6 flex gap-6">
          {['overview', 'customers', 'orders', 'products', 'stock-analysis', 'sales-report'].map((t) => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`py-4 px-3 text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === t
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t === 'stock-analysis' ? '📦 Stock Analysis' : 
               t === 'sales-report' ? '📊 Sales Report' :
               t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <section className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold">Dashboard Overview</h2>
                <p className="text-sm text-gray-600">Live snapshot of your store</p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    loadProducts();
                    fetchAdminData && fetchAdminData();
                  }}
                  className="px-4 py-2 bg-white border rounded-lg text-sm hover:shadow"
                >
                  Refresh
                </button>

                <button
                  onClick={async () => {
                    try {
                      const users = Array.isArray(adminCustomers) ? adminCustomers : [];
                      const csv = [
                        ['Name', 'Email', 'Mobile', 'Role', 'Status'],
                        ...users.map(u => {
                          const profile = u.profile || u;
                          const name = profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
                          return [
                            name || '',
                            profile.email || '',
                            profile.mobile || profile.phone || '',
                            u.role === 1 || u.role === 'Admin' ? 'Admin' : 'Customer',
                            u.isActive === false ? 'Inactive' : 'Active'
                          ];
                        })
                      ].map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');

                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `customers_${Date.now()}.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    } catch (e) {
                      console.error(e);
                      setError('Export failed');
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
                >
                  Export Customers
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {(adminStats && adminStats.length ? adminStats : stats).map((s, i) => (
                <div key={i} className="bg-white rounded-xl shadow p-5 flex items-start gap-4">
                  <div className="bg-indigo-50 p-3 rounded-lg">
                    <div className="text-indigo-600">{s.icon}</div>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{s.label}</p>
                    <div className="flex items-baseline gap-3">
                      <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                      <div className="text-sm text-green-600">{s.change}</div>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Updated just now</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* CUSTOMERS */}
        {activeTab === 'customers' && (
          <section className="mt-6 bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Registered Customers</h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Search customers..."
                  onChange={(e) => {
                    const q = e.target.value.toLowerCase().trim();
                    if (!q) {
                      setAdminCustomers(adminCustomers);
                      return;
                    }
                    setAdminCustomers(prev => (Array.isArray(prev) ? prev.filter(u => {
                      const profile = u.profile || u;
                      const name = (profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`).toLowerCase();
                      const email = (profile.email || '').toLowerCase();
                      return name.includes(q) || email.includes(q) || String(profile.mobile || '').includes(q);
                    }) : prev));
                  }}
                  className="px-3 py-2 border rounded-lg text-sm w-64"
                />
                <button
                  onClick={() => setActiveTab('overview')}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm"
                >
                  Back
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500 border-b">
                  <tr>
                    <th className="py-3">Customer</th>
                    <th className="py-3">Email</th>
                    <th className="py-3">Mobile</th>
                    <th className="py-3">Role</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(!adminCustomers || adminCustomers.length === 0) ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-gray-400">No customers found</td>
                    </tr>
                  ) : (
                    adminCustomers.map((u, idx) => {
                      const profile = u.profile || u;
                      const id = u.id || u._id || idx;
                      const name = profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'N/A';
                      const email = profile.email || 'N/A';
                      const mobile = profile.mobile || profile.phone || '—';
                      const roleLabel = u.role === 1 || u.role === 'Admin' ? 'Admin' : 'Customer';
                      const status = u.isActive === false ? 'Inactive' : 'Active';
                      return (
                        <tr key={id} className="border-b hover:bg-gray-50">
                          <td className="py-3 flex items-center gap-3">
                            <div className="w-9 h-9 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-semibold">
                              {String(name).charAt(0) || 'U'}
                            </div>
                            <div>
                              <div className="font-medium">{name}</div>
                              <div className="text-xs text-gray-400">Joined: {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '—'}</div>
                            </div>
                          </td>
                          <td className="py-3 text-gray-600">{email}</td>
                          <td className="py-3 text-gray-600">{mobile}</td>
                          <td className="py-3">
                            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold">{roleLabel}</span>
                          </td>
                          <td className="py-3">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-yellow-50 text-yellow-700'}`}>
                              {status}
                            </span>
                          </td>
                          <td className="py-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  alert(JSON.stringify(profile, null, 2));
                                }}
                                className="px-3 py-1 bg-gray-100 rounded text-sm"
                              >
                                View
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    const newState = !u.isActive;
                                    if (typeof adminAPI.toggleUser === 'function') {
                                      await adminAPI.toggleUser(u.id || u._id, { isActive: newState });
                                    } else {
                                      setAdminCustomers(prev => (prev || []).map(x => x.id === u.id ? { ...x, isActive: newState } : x));
                                    }
                                    setError('');
                                  } catch (err) {
                                    console.error(err);
                                    setError('Failed to update status');
                                  }
                                }}
                                className="px-3 py-1 bg-red-50 text-red-600 rounded text-sm"
                              >
                                {u.isActive === false ? 'Enable' : 'Disable'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* PRODUCTS */}
        {activeTab === 'products' && (
          <section className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Products</h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="px-3 py-2 border rounded-lg text-sm w-64"
                />
                <button
                  onClick={async () => {
                    if (!searchQuery.trim()) return;
                    setLoading(true);
                    try {
                      const r = await productsAPI.search(searchQuery.trim());
                      const productData = Array.isArray(r.data) ? r.data : r.data?.data || r.data?.products || [];
                      setProducts(productData);
                      setError('');
                    } catch (err) {
                      console.error('Search failed', err);
                      setError(err.response?.data?.message || err.message || 'Search failed');
                    } finally {
                      setLoading(false);
                    }
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg"
                  >
                    {loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Searching...
                    </div>
                    ) : (
                    'Search Products'
                    )}
                  </button>

                  <button
                    onClick={async () => {
                    try {
                      setLoading(true);
                      
                      // Modal-style form for better UX
                      const formData = {};
                      const fields = [
                      { key: 'name', label: 'Product Name', type: 'text', required: true },
                      { key: 'brand', label: 'Brand', type: 'text', required: false },
                      { key: 'price', label: 'Price (₹)', type: 'number', required: true },
                      { key: 'stock', label: 'Stock Quantity', type: 'number', required: true },
                      { key: 'description', label: 'Description', type: 'textarea', required: false },
                      { key: 'specs', label: 'Specifications', type: 'textarea', required: false },
                      { key: 'image', label: 'Image URL', type: 'url', required: false }
                      ];

                      // Collect all inputs first
                      for (const field of fields) {
                      let value;
                      if (field.type === 'textarea') {
                        value = window.prompt(`${field.label}:`, '');
                      } else if (field.type === 'number') {
                        value = window.prompt(`${field.label}:`, '0');
                      } else {
                        value = window.prompt(`${field.label}:`, '');
                      }

                      if (field.required && !value?.trim()) {
                        setError(`${field.label} is required`);
                        setLoading(false);
                        return;
                      }

                      formData[field.key] = value || '';
                      }

                      // Category selection
                      const categoryOptions = (categories || []).map(c => `${c.id}: ${c.name}`).join('\n') || '1: General';
                      const categoryId = Number(
                      window.prompt(
                        `Select category ID:\n\n${categoryOptions}`,
                        categories?.[0]?.id || '1'
                      ) || 1
                      );

                      if (!categoryId) {
                      setError('Please select a valid category');
                      setLoading(false);
                      return;
                      }

                      const payload = {
                      name: formData.name,
                      description: formData.description,
                      price: Number(formData.price) || 0,
                      categoryId: categoryId,
                      imageUrl: formData.image || 'https://via.placeholder.com/300x300/3b82f6/ffffff?text=Product',
                      stockQuantity: Number(formData.stock) || 0,
                      brand: formData.brand || 'Unknown',
                      specifications: formData.specs
                      };

                      // Validate payload
                      if (payload.price <= 0 || payload.stockQuantity < 0) {
                      setError('Please enter valid price and stock quantity');
                      setLoading(false);
                      return;
                      }

                      if (typeof adminAPI.createProduct === 'function') {
                      await adminAPI.createProduct(payload);
                      } else {
                      setProducts(prev => [
                        {
                        id: Date.now(),
                        name: payload.name,
                        price: payload.price,
                        brand: payload.brand,
                        image: payload.imageUrl,
                        description: payload.description,
                        specs: payload.specifications,
                        stockQuantity: payload.stockQuantity
                        },
                        ...(prev || [])
                      ]);
                      }

                      await loadProducts();
                      setError('');
                      alert(`✅ Product "${payload.name}" created successfully!`);
                    } catch (err) {
                      console.error(err);
                      setError(err?.response?.data?.message || err.message || 'Failed to create product');
                    } finally {
                      setLoading(false);
                    }
                    }}
                    disabled={loading}
                    className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-lg text-sm font-semibold transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    {loading ? 'Creating...' : 'Add New Product'}
                  </button>
                  </div>
                </div>

                {/* PRODUCTS GRID */}
                {(products || []).length === 0 ? (
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-lg p-12 text-center border border-gray-200">
                  <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-700">No products available</h3>
                  <p className="text-sm text-gray-500 mt-2">Create your first product to get started</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {(products || []).map((p) => (
                    <div
                    key={p.id}
                    className="bg-white rounded-xl shadow-md hover:shadow-2xl overflow-hidden transition-all duration-300 transform hover:-translate-y-1 group border border-gray-100"
                    >
                    {/* PRODUCT IMAGE */}
                    <div className="relative overflow-hidden bg-gray-200 h-48">
                      <img
                      src={p.image || p.imageUrl || 'https://via.placeholder.com/600x400/e5e7eb/6b7280?text=No+Image'}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                      {/* PRICE BADGE */}
                      <div className="absolute right-3 top-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-full font-bold shadow-lg flex items-center gap-1">
                      <span className="text-xs">₹</span>
                      <span>{p.price.toLocaleString()}</span>
                      </div>

                      {/* STOCK BADGE */}
                      {p.stockQuantity !== undefined && (
                      <div
                        className={`absolute left-3 top-3 px-3 py-1 rounded-full text-xs font-semibold shadow-md ${
                        p.stockQuantity > 20
                          ? 'bg-green-500 text-white'
                          : p.stockQuantity > 5
                          ? 'bg-yellow-500 text-white'
                          : 'bg-red-500 text-white'
                        }`}
                      >
                        {p.stockQuantity} in stock
                      </div>
                      )}

                      {/* BRAND LABEL */}
                      <div className="absolute left-3 bottom-3 bg-white/95 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-medium text-gray-700 shadow">
                      {p.brand || p.category || 'Product'}
                      </div>
                    </div>

                    {/* PRODUCT INFO */}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <h4 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2">{p.name}</h4>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.description || 'No description available'}</p>
                      </div>
                      </div>

                      {/* RATING */}
                      {p.rating && (
                      <div className="flex items-center gap-1 mb-3">
                        <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <span key={i} className={`text-xs ${i < Math.floor(p.rating) ? '⭐' : '☆'}`}>
                          {i < Math.floor(p.rating) ? '★' : '☆'}
                          </span>
                        ))}
                        </div>
                        <span className="text-xs text-gray-600">({p.reviewCount || 0})</span>
                      </div>
                      )}

                      {/* SPECS */}
                      {p.specs && (
                      <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-600 line-clamp-2">
                        {p.specs}
                      </div>
                      )}

                      {/* ACTION BUTTONS */}
                      <div className="flex items-center gap-2 mt-4">
                      <button
                        onClick={async () => {
                              try {
                                setLoading(true);
                                const name = window.prompt('Product name:', p.name) || p.name;
                                const brand = window.prompt('Brand:', p.brand || '') || p.brand;
                                const price = Number(window.prompt('Price (number):', String(p.price || 0)) || p.price || 0);
                                const image = window.prompt('Image URL:', p.image || p.imageUrl || '') || p.image || p.imageUrl;
                                const description = window.prompt('Short description:', p.description || '') || p.description;
                                const specs = window.prompt('Specs:', p.specs || p.specifications || '') || p.specs || p.specifications;
                                const stock = Number(window.prompt('Stock quantity (number):', String(p.stockQuantity || 0)) || p.stockQuantity || 0);
                                const categoryOptions = (categories || []).map(c => `${c.id}: ${c.name}`).join('\n') || '1: General';
                                const categoryId = Number(window.prompt(`Select category by ID:\n${categoryOptions}`, categories?.[0]?.id || 1));
                                if (!categoryId) return alert('Category required');

                                const payload = {
                                  name, description, price, categoryId, imageUrl: image, stockQuantity: stock, brand, specifications: specs
                                };

                                if (typeof adminAPI.updateProduct === 'function') {
                                  await adminAPI.updateProduct(p.id, payload);
                                } else {
                                  setProducts(prev => (prev || []).map(x => x.id === p.id ? { ...x, ...payload } : x));
                                }

                                await loadProducts();
                                setError('');
                                alert('Product updated');
                              } catch (err) {
                                console.error(err);
                                setError('Update failed');
                              } finally {
                                setLoading(false);
                              }
                            }}
                            className="px-3 py-1 bg-yellow-50 text-yellow-700 rounded text-sm"
                          >
                            Edit
                          </button>

                          <button
                            onClick={async () => {
                              const ok = window.confirm(`Delete "${p.name}"?`);
                              if (!ok) return;
                              try {
                                setLoading(true);
                                if (typeof adminAPI.deleteProduct === 'function') {
                                  await adminAPI.deleteProduct(p.id);
                                } else {
                                  setProducts(prev => (prev || []).filter(x => x.id !== p.id));
                                }
                                await loadProducts();
                                setError('');
                                alert('Deleted');
                              } catch (err) {
                                console.error(err);
                                setError('Delete failed');
                              } finally {
                                setLoading(false);
                              }
                            }}
                            className="px-3 py-1 bg-red-50 text-red-700 rounded text-sm"
                          >
                            Delete
                          </button>
                        </div>

                        <button
                          onClick={() => addToCart(p)}
                          className="px-3 py-1 bg-indigo-600 text-white rounded text-sm"
                        >
                          Add to Cart
                        </button>
                      </div>
                    </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ORDERS */}
        {activeTab === 'orders' && (
          <section className="mt-6 bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Recent Orders</h3>
              <div className="text-sm text-gray-500">Showing latest {adminOrders.length} orders</div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500 border-b">
                  <tr>
                    <th className="py-3">Order</th>
                    <th className="py-3">Date</th>
                    <th className="py-3">Customer</th>
                    <th className="py-3">Amount</th>
                    <th className="py-3">Status</th>
                    <th className="py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {(!adminOrders || adminOrders.length === 0) ? (
                    <tr>
                      <td colSpan="6" className="py-8 text-center text-gray-400">No orders yet</td>
                    </tr>
                  ) : (
                    adminOrders.map((order) => (
                      <tr key={order.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 font-medium">#{order.id}</td>
                        <td className="py-3 text-gray-600">{order.createdAt ? new Date(order.createdAt).toLocaleString() : '—'}</td>
                        <td className="py-3 text-gray-600">{order.customerName || order.customer?.name || order.user?.email || '—'}</td>
                        <td className="py-3 font-semibold">₹{(order.totalAmount || 0).toLocaleString()}</td>
                        <td className="py-3">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            order.status === 'Pending' ? 'bg-yellow-50 text-yellow-700' :
                            order.status === 'Cancelled' ? 'bg-red-50 text-red-700' :
                            'bg-green-50 text-green-700'
                          }`}>
                            {order.status || 'N/A'}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <button onClick={() => alert(JSON.stringify(order, null, 2))} className="px-3 py-1 bg-gray-100 rounded text-sm">View</button>
                            <button onClick={async () => {
                              try {
                                if (typeof ordersAPI.updateStatus === 'function') {
                                  await ordersAPI.updateStatus(order.id, { status: 'Shipped' });
                                  await loadOrders();
                                } else {
                                  setAdminOrders(prev => (prev || []).map(o => o.id === order.id ? { ...o, status: 'Shipped' } : o));
                                }
                              } catch (e) {
                                console.error(e);
                                setError('Failed to update order');
                              }
                            }} 
                              disabled={loading}
                              className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded text-sm hover:bg-indigo-100 disabled:opacity-50"
                            >
                              Mark Shipped
                            </button>
                            </div>
                          </td>
                          </tr>
                        ))
                        )}
                      </tbody>
                      </table>
                    </div>
                    </section>
                  )}

                  {/* STOCK ANALYSIS */}
                  {activeTab === 'stock-analysis' && (
                    <section className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                      <h2 className="text-2xl font-bold">Stock Analysis</h2>
                      <p className="text-sm text-gray-600">Inventory levels and product status</p>
                      </div>
                      <button
                      onClick={async () => {
                        try {
                        setLoading(true);
                        setError('');
                        
                        // Fetch all products first to build stock analysis
                        const productsRes = await productsAPI.getAll();
                        const allProducts = Array.isArray(productsRes.data) ? productsRes.data : productsRes.data?.data || [];
                        
                        // Build stock analysis from products
                        const analysis = allProducts.map(p => ({
                          id: p.id,
                          productId: p.id,
                          productName: p.name,
                          name: p.name,
                          category: p.category,
                          quantity: p.stockQuantity || p.stock || 0,
                          price: p.price || 0,
                          brand: p.brand,
                          minimumStock: p.minimumStock || 10,
                          reorderLevel: p.reorderLevel || 10,
                          imageUrl: p.image || p.imageUrl
                        }));
                        
                        setStockAnalysis(analysis);
                        
                        // Identify low stock products (less than minimum stock)
                        const lowStock = analysis.filter(item => 
                          item.quantity <= (item.minimumStock || 10)
                        );
                        setLowStockProducts(lowStock);
                        
                        // Group by category
                        const byCategory = {};
                        analysis.forEach(item => {
                          const cat = item.category || 'Uncategorized';
                          if (!byCategory[cat]) {
                          byCategory[cat] = { category: cat, items: [], totalQuantity: 0, totalValue: 0 };
                          }
                          byCategory[cat].items.push(item);
                          byCategory[cat].totalQuantity += item.quantity;
                          byCategory[cat].totalValue += item.quantity * item.price;
                        });
                        
                        setStockByCategory(Object.values(byCategory));
                        
                        } catch (err) {
                        console.error('Failed to load stock analysis:', err);
                        setError(
                          err.response?.data?.message || 
                          err.message || 
                          'Failed to load stock analysis. Please check your connection and try again.'
                        );
                        setStockAnalysis([]);
                        setLowStockProducts([]);
                        setStockByCategory([]);
                        } finally {
                        setLoading(false);
                        }
                      }}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
                      disabled={loading}
                      >
                      {loading ? 'Loading...' : 'Refresh Stock Data'}
                      </button>
                    </div>

                    {/* Stock Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-white rounded-xl shadow p-5 border border-gray-100 hover:shadow-lg transition-all">
                      <p className="text-sm text-gray-500 mb-2">Total Products</p>
                      <p className="text-3xl font-bold text-gray-900">{stockAnalysis?.length || 0}</p>
                      <p className="text-xs text-gray-400 mt-2">In inventory</p>
                      </div>
                      
                      <div className="bg-white rounded-xl shadow p-5 border border-gray-100 hover:shadow-lg transition-all">
                      <p className="text-sm text-gray-500 mb-2">Low Stock Items</p>
                      <p className="text-3xl font-bold text-orange-600">{lowStockProducts?.length || 0}</p>
                      <p className="text-xs text-gray-400 mt-2">Below minimum threshold</p>
                      </div>
                      
                      <div className="bg-white rounded-xl shadow p-5 border border-gray-100 hover:shadow-lg transition-all">
                      <p className="text-sm text-gray-500 mb-2">Out of Stock</p>
                      <p className="text-3xl font-bold text-red-600">
                        {(stockAnalysis?.filter(s => (s.quantity || 0) === 0) || []).length}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">Need immediate reorder</p>
                      </div>
                      
                      <div className="bg-white rounded-xl shadow p-5 border border-gray-100 hover:shadow-lg transition-all">
                      <p className="text-sm text-gray-500 mb-2">Total Inventory Value</p>
                      <p className="text-3xl font-bold text-blue-600">
                        ₹{((stockAnalysis || []).reduce((sum, s) => sum + ((s.price || 0) * (s.quantity || 0)), 0)).toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400 mt-2">Estimated value</p>
                      </div>
                    </div>

                    {/* Low Stock Products Alert */}
                    <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
                      <h3 className="text-lg font-semibold mb-4 text-orange-600 flex items-center gap-2">
                      <span>⚠️</span>
                      Low Stock Products ({lowStockProducts?.length || 0})
                      </h3>
                      {!lowStockProducts || lowStockProducts.length === 0 ? (
                      <div className="text-center py-8 bg-green-50 rounded-lg border border-green-200">
                        <p className="text-green-700 font-semibold">✅ All products are in good stock</p>
                        <p className="text-sm text-green-600 mt-1">No urgent reorders needed</p>
                      </div>
                      ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                        <thead className="text-left text-gray-500 border-b bg-gray-50">
                          <tr>
                          <th className="py-3 px-4">Product</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Current Stock</th>
                          <th className="py-3 px-4">Min Threshold</th>
                          <th className="py-3 px-4">Status</th>
                          <th className="py-3 px-4">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lowStockProducts.map((product, idx) => (
                          <tr key={idx} className="border-b hover:bg-orange-50 transition-colors">
                            <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              {product.imageUrl && (
                              <img 
                                src={product.imageUrl} 
                                alt={product.productName}
                                className="w-8 h-8 rounded object-cover"
                              />
                              )}
                              <div>
                              <p className="font-medium text-gray-900">{product.productName || product.name || 'N/A'}</p>
                              <p className="text-xs text-gray-500">{product.brand || 'No brand'}</p>
                              </div>
                            </div>
                            </td>
                            <td className="py-3 px-4 text-gray-600">{product.category || 'Uncategorized'}</td>
                            <td className="py-3 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              product.quantity > 10 ? 'bg-yellow-50 text-yellow-700' : 'bg-red-50 text-red-700'
                            }`}>
                              {product.quantity || 0} units
                            </span>
                            </td>
                            <td className="py-3 px-4 text-gray-600 font-medium">{product.minimumStock || 10} units</td>
                            <td className="py-3 px-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              product.quantity === 0 ? 'bg-red-100 text-red-700 border border-red-300' :
                              product.quantity < (product.minimumStock || 10) ? 'bg-orange-100 text-orange-700 border border-orange-300' :
                              'bg-green-100 text-green-700 border border-green-300'
                            }`}>
                              {product.quantity === 0 ? '🔴 Out of Stock' : '🟠 Low Stock'}
                            </span>
                            </td>
                            <td className="py-3 px-4">
                            <button
                              onClick={async () => {
                              const newQty = window.prompt(
                                `Update stock for "${product.productName || product.name}"\nCurrent: ${product.quantity || 0} units`,
                                String(product.quantity || 0)
                              );
                              
                              if (newQty === null) return;
                              
                              const qty = Number(newQty);
                              if (isNaN(qty) || qty < 0) {
                                alert('Please enter a valid quantity');
                                return;
                              }
                              
                              try {
                                setLoading(true);
                                
                                // Try using adminAPI.updateStock first
                                if (typeof adminAPI.updateStock === 'function') {
                                await adminAPI.updateStock(product.productId || product.id, qty);
                                } 
                                // Fallback to productsAPI.updateStock
                                else if (typeof productsAPI.updateStock === 'function') {
                                await productsAPI.updateStock(product.productId || product.id, { stockQuantity: qty });
                                }
                                // Last resort: update product with new stock
                                else if (typeof productsAPI.update === 'function') {
                                await productsAPI.update(product.productId || product.id, { stockQuantity: qty });
                                }
                                
                                // Refresh stock analysis
                                const productsRes = await productsAPI.getAll();
                                const allProducts = Array.isArray(productsRes.data) ? productsRes.data : productsRes.data?.data || [];
                                
                                const analysis = allProducts.map(p => ({
                                id: p.id,
                                productId: p.id,
                                productName: p.name,
                                quantity: p.stockQuantity || 0,
                                price: p.price || 0,
                                category: p.category,
                                brand: p.brand,
                                minimumStock: p.minimumStock || 10,
                                imageUrl: p.image || p.imageUrl
                                }));
                                
                                setStockAnalysis(analysis);
                                setLowStockProducts(analysis.filter(item => item.quantity <= (item.minimumStock || 10)));
                                
                                alert(`✅ Stock updated to ${qty} units`);
                                setError('');
                              } catch (err) {
                                console.error('Stock update error:', err);
                                setError(err.response?.data?.message || err.message || 'Failed to update stock');
                              } finally {
                                setLoading(false);
                              }
                              }}
                              disabled={loading}
                              className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded text-sm hover:bg-indigo-100 disabled:opacity-50 font-medium transition-colors"
                            >
                              📦 Restock
                            </button>
                            </td>
                          </tr>
                          ))}
                        </tbody>
                        </table>
                      </div>
                      )}
                    </div>

                    {/* Stock by Category */}
                    {stockByCategory && stockByCategory.length > 0 && (
                      <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
                      <h3 className="text-lg font-semibold mb-4">📊 Stock by Category</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {stockByCategory.map((cat, idx) => (
                        <div key={idx} className="p-4 border border-gray-200 rounded-lg hover:shadow-md transition-all">
                          <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-gray-900">{cat.category || 'Uncategorized'}</h4>
                          <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {cat.items?.length || 0} items
                          </span>
                          </div>
                          <div className="flex justify-between items-center mb-3">
                          <div>
                            <p className="text-sm text-gray-600">{cat.totalQuantity || 0} units in stock</p>
                            <p className="text-lg font-bold text-blue-600">₹{(cat.totalValue || 0).toLocaleString()}</p>
                          </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full transition-all"
                            style={{
                            width: `${Math.min(100, ((cat.totalQuantity || 0) / 100) * 100)}%`
                            }}
                          />
                          </div>
                        </div>
                        ))}
                      </div>
                      </div>
                    )}

                    {/* Complete Inventory Table */}
                    <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
                      <h3 className="text-lg font-semibold mb-4">📦 Complete Inventory</h3>
                      {!stockAnalysis || stockAnalysis.length === 0 ? (
                      <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                        <Package className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                        <p className="text-gray-600 font-semibold">No stock data available</p>
                        <p className="text-sm text-gray-500 mt-1">Click "Refresh Stock Data" to load inventory</p>
                      </div>
                      ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                        <thead className="text-left text-gray-500 border-b bg-gray-50">
                          <tr>
                          <th className="py-3 px-4">Product</th>
                          <th className="py-3 px-4">Category</th>
                          <th className="py-3 px-4">Stock</th>
                          <th className="py-3 px-4">Unit Price</th>
                          <th className="py-3 px-4">Inventory Value</th>
                          <th className="py-3 px-4">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stockAnalysis.map((stock, idx) => {
                          const isOutOfStock = (stock.quantity || 0) === 0;
                          const isLowStock = (stock.quantity || 0) < (stock.minimumStock || 10) && !isOutOfStock;
                          const isGoodStock = (stock.quantity || 0) >= (stock.minimumStock || 10);
                          
                          return (
                            <tr key={idx} className={`border-b hover:bg-gray-50 transition-colors ${
                            isOutOfStock ? 'bg-red-50' : isLowStock ? 'bg-orange-50' : ''
                            }`}>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-3">
                              {stock.imageUrl && (
                                <img 
                                src={stock.imageUrl} 
                                alt={stock.productName}
                                className="w-8 h-8 rounded object-cover"
                                />
                              )}
                              <div>
                                <p className="font-medium text-gray-900">{stock.productName || stock.name || 'N/A'}</p>
                                <p className="text-xs text-gray-500">{stock.brand || 'No brand'}</p>
                              </div>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-gray-600">{stock.category || 'Uncategorized'}</td>
                            <td className="py-3 px-4">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                              isOutOfStock ? 'bg-red-100 text-red-700' :
                              isLowStock ? 'bg-orange-100 text-orange-700' :
                              'bg-green-100 text-green-700'
                              }`}>
                              {stock.quantity || 0} units
                              </span>
                            </td>
                            <td className="py-3 px-4 font-medium text-gray-900">₹{(stock.price || 0).toLocaleString()}</td>
                            <td className="py-3 px-4 font-bold text-blue-600">
                              ₹{((stock.price || 0) * (stock.quantity || 0)).toLocaleString()}
                            </td>
                            <td className="py-3 px-4">
                              {isOutOfStock && (
                              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold border border-red-300">
                                🔴 Out of Stock
                              </span>
                              )}
                              {isLowStock && (
                              <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-semibold border border-orange-300">
                                🟠 Reorder Soon
                              </span>
                              )}
                              {isGoodStock && (
                              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold border border-green-300">
                                🟢 Sufficient
                              </span>
                              )}
                            </td>
                            </tr>
                          );
                          })}
                        </tbody>
                        </table>
                      </div>
                      )}
                    </div>
                    </section>
                  )}  
        {/*sales report*/}                                                                            
        {activeTab === 'sales-report' && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Sales Report & Analytics</h2>
                <p className="text-sm text-gray-600">Revenue trends and performance metrics</p>
              </div>

              <div className="flex items-center gap-3">
                <div>
                  <label className="text-xs text-gray-600">From</label>
                  <input
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">To</label>
                  <input
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <button
                  onClick={fetchSalesReport}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700"
                >
                  {loading ? 'Loading...' : 'Generate Report'}
                </button>
              </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow p-5 border border-green-200">
                <p className="text-sm text-gray-600 mb-2">Total Revenue</p>
                <p className="text-3xl font-bold text-green-700">₹{(revenue?.totalRevenue || 0).toLocaleString()}</p>
                <p className="text-xs text-green-600 mt-2">{revenue?.percentageChange > 0 ? '↑' : '↓'} {Math.abs(revenue?.percentageChange || 0)}% from last period</p>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow p-5 border border-blue-200">
                <p className="text-sm text-gray-600 mb-2">Total Orders</p>
                <p className="text-3xl font-bold text-blue-700">{adminOrders?.length || 0}</p>
                <p className="text-xs text-blue-600 mt-2">Completed orders in period</p>
              </div>

              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl shadow p-5 border border-purple-200">
                <p className="text-sm text-gray-600 mb-2">Average Order Value</p>
                <p className="text-3xl font-bold text-purple-700">₹{(revenue?.averageOrderValue || 0).toLocaleString()}</p>
                <p className="text-xs text-purple-600 mt-2">Per transaction average</p>
              </div>

              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl shadow p-5 border border-orange-200">
                <p className="text-sm text-gray-600 mb-2">Total Items Sold</p>
                <p className="text-3xl font-bold text-orange-700">{salesReport?.totalItemsSold || 0}</p>
                <p className="text-xs text-orange-600 mt-2">Units delivered</p>
              </div>
            </div>

            {/* Sales Trend & Order Stats */}
            {orderStats && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">📊 Order Distribution</h3>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">Pending</span>
                        <span className="font-semibold">{orderStats.pendingCount || 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-yellow-500 h-2 rounded-full"
                          style={{ width: `${((orderStats.pendingCount || 0) / (adminOrders?.length || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">Processing</span>
                        <span className="font-semibold">{orderStats.processingCount || 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{ width: `${((orderStats.processingCount || 0) / (adminOrders?.length || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">Delivered</span>
                        <span className="font-semibold">{orderStats.deliveredCount || 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${((orderStats.deliveredCount || 0) / (adminOrders?.length || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">Cancelled</span>
                        <span className="font-semibold">{orderStats.cancelledCount || 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-red-500 h-2 rounded-full"
                          style={{ width: `${((orderStats.cancelledCount || 0) / (adminOrders?.length || 1)) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">💰 Payment Methods</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">Cash on Delivery</span>
                      <span className="font-semibold text-lg">{orderStats.codCount || 0}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                      <span className="text-gray-700">Online Payment</span>
                      <span className="font-semibold text-lg text-blue-700">{orderStats.onlinePaymentCount || 0}</span>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                      <span className="text-gray-700">Wallet</span>
                      <span className="font-semibold text-lg text-green-700">{orderStats.walletCount || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Top Products */}
            {topProducts && topProducts.length > 0 && (
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold mb-4">🏆 Top Selling Products</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-left text-gray-500 border-b">
                      <tr>
                        <th className="py-3">Rank</th>
                        <th className="py-3">Product</th>
                        <th className="py-3">Units Sold</th>
                        <th className="py-3">Revenue</th>
                        <th className="py-3">Avg Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topProducts.map((product, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="py-3">
                            <span className={`px-3 py-1 rounded-full font-semibold ${
                              idx === 0 ? 'bg-yellow-50 text-yellow-700' :
                              idx === 1 ? 'bg-gray-100 text-gray-700' :
                              'bg-orange-50 text-orange-700'
                            }`}>
                              #{idx + 1}
                            </span>
                          </td>
                          <td className="py-3 font-medium">{product.productName || product.name || 'N/A'}</td>
                          <td className="py-3">{product.unitsSold || 0}</td>
                          <td className="py-3 font-semibold">₹{(product.revenue || 0).toLocaleString()}</td>
                          <td className="py-3">
                            <div className="flex items-center gap-1">
                              <span>⭐</span>
                              <span>{product.averageRating || 'N/A'}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Sales by Category */}
            {salesByCategory && salesByCategory.length > 0 && (
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold mb-4">📈 Sales by Category</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {salesByCategory.map((cat, idx) => (
                    <div key={idx} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold">{cat.categoryName || cat.category || 'N/A'}</h4>
                        <span className="text-lg font-bold text-blue-600">₹{(cat.revenue || 0).toLocaleString()}</span>
                      </div>
                      <div className="text-sm text-gray-600 mb-2">
                        {cat.totalSales || 0} orders • {cat.unitsSold || 0} units
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-500 h-2 rounded-full"
                          style={{
                            width: `${((cat.revenue || 0) / (Math.max(...(salesByCategory || []).map(c => c.revenue || 0)) || 1)) * 100}%`
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Daily Metrics Chart */}
            {dailyMetrics && dailyMetrics.length > 0 && (
              <div className="bg-white rounded-xl shadow p-6">
                <h3 className="text-lg font-semibold mb-4">📅 Daily Performance</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {dailyMetrics.map((metric, idx) => (
                    <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-sm font-semibold text-gray-700 mb-2">
                        {new Date(metric.date).toLocaleDateString()}
                      </p>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Orders:</span>
                          <span className="font-medium">{metric.orders || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Revenue:</span>
                          <span className="font-medium text-green-600">₹{(metric.revenue || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Items:</span>
                          <span className="font-medium">{metric.itemsSold || 0}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  );
}

// Fallback: Home / default landing to avoid white screen
if (currentPage === 'home') {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <header className="max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag className="w-10 h-10 text-blue-600" />
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">ShopAI</h1>
            <p className="text-xs text-gray-500 -mt-0.5">AI-powered shopping made simple</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentPage('login')}
            className="px-4 py-2 rounded-md bg-white border text-sm font-medium hover:shadow"
          >
            Sign In
          </button>
          <button
            onClick={() => setCurrentPage('register')}
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700"
          >
            Create Account
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12 grid lg:grid-cols-2 gap-10 items-center">
        {/* HERO */}
        <section className="space-y-6">
          <h2 className="text-4xl lg:text-5xl font-extrabold text-gray-900 leading-tight">
            Discover products you'll love — curated by AI
          </h2>
          <p className="text-gray-600 max-w-xl">
            Smart recommendations, secure checkout and express delivery — all in one place.
            Shop top gadgets, wearables and accessories handpicked to match your taste.
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setCurrentPage('products')}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold shadow hover:bg-blue-700"
            >
              Shop Now
            </button>
            <button
              onClick={() => setCurrentPage('products')}
              className="px-6 py-3 bg-white border rounded-lg text-gray-800 hover:shadow"
            >
              Browse Categories
            </button>
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3">
            <div className="flex items-start gap-3 bg-white p-3 rounded-lg shadow-sm">
              <TrendingUp className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <p className="text-sm font-semibold">Smart Picks</p>
                <p className="text-xs text-gray-500">AI recommendations</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white p-3 rounded-lg shadow-sm">
              <Package className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <p className="text-sm font-semibold">Fast Delivery</p>
                <p className="text-xs text-gray-500">Reliable & on time</p>
              </div>
            </div>
            <div className="flex items-start gap-3 bg-white p-3 rounded-lg shadow-sm">
              <CreditCard className="w-6 h-6 text-blue-600 mt-1" />
              <div>
                <p className="text-sm font-semibold">Secure Payments</p>
                <p className="text-xs text-gray-500">Encrypted checkout</p>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURED PRODUCTS PREVIEW */}
        <aside className="bg-gradient-to-tr from-white to-blue-50 rounded-2xl p-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">Featured for you</h3>
            <button
              onClick={() => setCurrentPage('products')}
              className="text-sm text-blue-600 hover:underline"
            >
              View all
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {((products && products.length) ? products : getSampleProducts())
              .slice(0, 3)
              .map((p) => (
                <div key={p.id} className="flex items-center gap-4 bg-white rounded-lg p-3 shadow-sm">
                  <img src={p.image} alt={p.name} className="w-20 h-20 rounded-md object-cover" />
                  <div className="flex-1">
                    <p className="text-sm text-gray-500">{p.brand}</p>
                    <h4 className="text-sm font-semibold text-gray-900 line-clamp-2">{p.name}</h4>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-blue-600 font-bold">₹{p.price}</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => addToCart(p)}
                          className="px-3 py-1 bg-green-600 text-white rounded-md text-xs hover:bg-green-700"
                        >
                          Add
                        </button>
                        <button
                          onClick={() => {
                            setCurrentPage('products');
                          }}
                          className="px-2 py-1 border rounded-md text-xs text-gray-600"
                        >
                          Details
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          <div className="mt-6 text-center text-xs text-gray-500">
            <p>Free returns • 24/7 support • Trusted sellers</p>
          </div>
        </aside>
      </main>

      <section className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <h4 className="text-lg font-bold mb-4">Why ShopAI?</h4>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex gap-4 items-start">
              <Users className="w-7 h-7 text-blue-600 mt-1" />
              <div>
                <p className="font-semibold">Personalized experience</p>
                <p className="text-sm text-gray-500">Recommendations tailored to you.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <MapPin className="w-7 h-7 text-blue-600 mt-1" />
              <div>
                <p className="font-semibold">Wide delivery network</p>
                <p className="text-sm text-gray-500">Fast shipping across regions.</p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <BarChart3 className="w-7 h-7 text-blue-600 mt-1" />
              <div>
                <p className="font-semibold">Trusted insights</p>
                <p className="text-sm text-gray-500">Top picks based on real data.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="max-w-7xl mx-auto px-6 py-6 text-sm text-gray-500 flex justify-between">
        <div>© {new Date().getFullYear()} ShopAI — All rights reserved</div>
        <div className="flex gap-4">
          <button onClick={() => setCurrentPage('products')} className="hover:underline">Products</button>
          <button onClick={() => setCurrentPage('login')} className="hover:underline">Support</button>
        </div>
      </footer>
    </div>
  );
}

  // If nothing matches, return null to avoid throwing and causing a white screen
  return null;
}

export default CompleteIntegratedApp;