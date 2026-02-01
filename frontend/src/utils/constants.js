// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5033/api';

// Order Status Constants
export const ORDER_STATUS = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled'
};

// Order Status Display
export const ORDER_STATUS_DISPLAY = {
  [ORDER_STATUS.PENDING]: {
    label: 'Pending',
    color: 'yellow',
    icon: '⏳'
  },
  [ORDER_STATUS.PROCESSING]: {
    label: 'Processing',
    color: 'blue',
    icon: '⚙️'
  },
  [ORDER_STATUS.SHIPPED]: {
    label: 'Shipped',
    color: 'purple',
    icon: '🚚'
  },
  [ORDER_STATUS.DELIVERED]: {
    label: 'Delivered',
    color: 'green',
    icon: '✅'
  },
  [ORDER_STATUS.CANCELLED]: {
    label: 'Cancelled',
    color: 'red',
    icon: '❌'
  }
};

// User Roles
export const USER_ROLES = {
  CUSTOMER: 'Customer',
  ADMIN: 'Admin'
};

// Payment Methods
export const PAYMENT_METHODS = {
  COD: 'COD',
  ONLINE: 'Online',
  RAZORPAY: 'Razorpay',
  WALLET: 'Wallet'
};

// Payment Method Display
export const PAYMENT_METHOD_DISPLAY = {
  [PAYMENT_METHODS.COD]: {
    label: 'Cash on Delivery',
    icon: '💵'
  },
  [PAYMENT_METHODS.ONLINE]: {
    label: 'Online Payment',
    icon: '💳'
  },
  [PAYMENT_METHODS.RAZORPAY]: {
    label: 'Razorpay',
    icon: '💳'
  },
  [PAYMENT_METHODS.WALLET]: {
    label: 'Wallet',
    icon: '👛'
  }
};

// Product Categories
export const PRODUCT_CATEGORIES = [
  'Electronics',
  'Audio',
  'Wearables',
  'Computers',
  'Photography',
  'Gaming',
  'Home Appliances',
  'Mobile Accessories',
  'Smart Home',
  'Fitness',
  'Uncategorized'
];

// Gender Options
export const GENDER_OPTIONS = [
  { value: '', label: 'Prefer not to say' },
  { value: 'Male', label: 'Male' },
  { value: 'Female', label: 'Female' },
  { value: 'Other', label: 'Other' },
  { value: 'PreferNotToSay', label: 'Prefer not to say' }
];

// Validation Rules
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 100,
  MOBILE_LENGTH: 10,
  OTP_LENGTH: 6,
  OTP_EXPIRY_SECONDS: 300, // 5 minutes
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  MOBILE_REGEX: /^\d{10}$/,
  POSTAL_CODE_REGEX: /^\d{6}$/
};

// UI Constants
export const UI_CONSTANTS = {
  ITEMS_PER_PAGE: 12,
  MAX_CART_QUANTITY: 10,
  MIN_STOCK_THRESHOLD: 10,
  LOW_STOCK_THRESHOLD: 10,
  SEARCH_DEBOUNCE_MS: 300,
  TOAST_DURATION_MS: 3000
};

// Stock Status
export const STOCK_STATUS = {
  IN_STOCK: 'in_stock',
  LOW_STOCK: 'low_stock',
  OUT_OF_STOCK: 'out_of_stock'
};

// Stock Status Display
export const STOCK_STATUS_DISPLAY = {
  [STOCK_STATUS.IN_STOCK]: {
    label: 'In Stock',
    color: 'green',
    icon: '✓'
  },
  [STOCK_STATUS.LOW_STOCK]: {
    label: 'Low Stock',
    color: 'orange',
    icon: '⚠️'
  },
  [STOCK_STATUS.OUT_OF_STOCK]: {
    label: 'Out of Stock',
    color: 'red',
    icon: '❌'
  }
};

// Helper function to get stock status
export const getStockStatus = (quantity) => {
  if (quantity === 0) return STOCK_STATUS.OUT_OF_STOCK;
  if (quantity < UI_CONSTANTS.LOW_STOCK_THRESHOLD) return STOCK_STATUS.LOW_STOCK;
  return STOCK_STATUS.IN_STOCK;
};

// Date Format Options
export const DATE_FORMAT_OPTIONS = {
  SHORT: { year: 'numeric', month: 'short', day: 'numeric' },
  LONG: { year: 'numeric', month: 'long', day: 'numeric' },
  TIME: { hour: '2-digit', minute: '2-digit' },
  DATETIME: { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  }
};

// Currency Settings
export const CURRENCY = {
  CODE: 'INR',
  SYMBOL: '₹',
  LOCALE: 'en-IN'
};

// Helper function to format currency
export const formatCurrency = (amount) => {
  return `${CURRENCY.SYMBOL}${Number(amount || 0).toLocaleString(CURRENCY.LOCALE)}`;
};

// Helper function to format date
export const formatDate = (date, format = 'SHORT') => {
  if (!date) return 'N/A';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString(CURRENCY.LOCALE, DATE_FORMAT_OPTIONS[format]);
};

// Error Messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  SESSION_EXPIRED: 'Your session has expired. Please login again.',
  GENERIC_ERROR: 'Something went wrong. Please try again.'
};

// Success Messages
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: 'Login successful!',
  REGISTER_SUCCESS: 'Registration successful! Welcome aboard!',
  LOGOUT_SUCCESS: 'Logged out successfully.',
  ORDER_PLACED: 'Order placed successfully!',
  PROFILE_UPDATED: 'Profile updated successfully!',
  ADDRESS_ADDED: 'Address added successfully!',
  ADDRESS_UPDATED: 'Address updated successfully!',
  ADDRESS_DELETED: 'Address deleted successfully!',
  PRODUCT_ADDED: 'Product added successfully!',
  PRODUCT_UPDATED: 'Product updated successfully!',
  PRODUCT_DELETED: 'Product deleted successfully!',
  CART_UPDATED: 'Cart updated!',
  ITEM_ADDED_TO_CART: 'Item added to cart!',
  ITEM_REMOVED_FROM_CART: 'Item removed from cart!'
};

// Local Storage Keys
export const STORAGE_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  CART: 'cart',
  THEME: 'theme',
  LANGUAGE: 'language'
};

// Session Storage Keys
export const SESSION_KEYS = {
  TOKEN: 'token',
  USER: 'user',
  LAST_PAGE: 'lastPage'
};

// Razorpay Configuration
export const RAZORPAY_CONFIG = {
  KEY_ID: process.env.REACT_APP_RAZORPAY_KEY_ID || 'rzp_test_xxxxxx',
  CURRENCY: CURRENCY.CODE,
  NAME: 'ShopAI',
  DESCRIPTION: 'E-Commerce Payment',
  IMAGE: '/logo.png',
  THEME_COLOR: '#3B82F6' // Blue-600
};

// Admin Dashboard Tabs
export const ADMIN_TABS = {
  OVERVIEW: 'overview',
  CUSTOMERS: 'customers',
  ORDERS: 'orders',
  PRODUCTS: 'products',
  STOCK_ANALYSIS: 'stock-analysis',
  SALES_REPORT: 'sales-report'
};

// Export all constants as default
export default {
  API_BASE_URL,
  ORDER_STATUS,
  ORDER_STATUS_DISPLAY,
  USER_ROLES,
  PAYMENT_METHODS,
  PAYMENT_METHOD_DISPLAY,
  PRODUCT_CATEGORIES,
  GENDER_OPTIONS,
  VALIDATION,
  UI_CONSTANTS,
  STOCK_STATUS,
  STOCK_STATUS_DISPLAY,
  DATE_FORMAT_OPTIONS,
  CURRENCY,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  STORAGE_KEYS,
  SESSION_KEYS,
  RAZORPAY_CONFIG,
  ADMIN_TABS,
  // Helper functions
  getStockStatus,
  formatCurrency,
  formatDate
};