// API Base URLs
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5033/api';

// Status Mappings
export const ORDER_STATUS = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled'
};

export const USER_ROLES = {
  CUSTOMER: 'Customer',
  ADMIN: 'Admin'
};

// Payment Methods
export const PAYMENT_METHODS = {
  COD: 'COD',
  ONLINE: 'Online',
  WALLET: 'Wallet'
};

// Product Categories
export const PRODUCT_CATEGORIES = [
  'Electronics',
  'Audio',
  'Wearables',
  'Computers',
  'Photography',
  'Uncategorized'
];

// Validation Rules
export const VALIDATION = {
  PASSWORD_MIN_LENGTH: 6,
  MOBILE_LENGTH: 10,
  OTP_LENGTH: 6,
  OTP_EXPIRY_SECONDS: 300
};

// UI Constants
export const ITEMS_PER_PAGE = 12;
export const MAX_CART_QUANTITY = 10;
export const MIN_STOCK_THRESHOLD = 10;