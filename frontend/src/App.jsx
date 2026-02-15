import React, { useState, useEffect } from 'react';
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

  // Initialize app on mount
  useEffect(() => {
    initializeApp();
  }, []);

  // Reload data when user changes
  useEffect(() => {
    if (auth.user) {
      loadUserData();
    }
  }, [auth.user]);

  const initializeApp = async () => {
    try {
      console.log('🚀 Initializing ShopAI...');

      // Check for existing session
      const token = sessionStorage.getItem('token');
      const userData = sessionStorage.getItem('user');

      if (token && userData) {
        try {
          const parsedUser = JSON.parse(userData);
          console.log('✅ Found existing session for:', parsedUser.email);
          
          auth.setUser(parsedUser);
          
          // Set appropriate page based on role
          if (parsedUser.role === 'Admin') {
            setCurrentPage('admin');
          } else {
            setCurrentPage('products');
          }
        } catch (err) {
          console.error('❌ Error parsing user data:', err);
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          setCurrentPage('home');
        }
      } else {
        console.log('ℹ️ No existing session found');
        setCurrentPage('home');
      }

      console.log('✅ App initialized');
    } catch (err) {
      console.error('❌ App initialization error:', err);
      setCurrentPage('home');
    }
  };

  const loadUserData = async () => {
    if (!auth.user) return;

    try {
      console.log('📂 Loading user data...');

      await Promise.all([
        productsHook.loadProducts().catch(err => {
          console.warn('⚠️ Failed to load products:', err);
          return [];
        }),
        cartHook.loadCart().catch(err => {
          console.warn('⚠️ Failed to load cart:', err);
          return [];
        }),
        auth.loadProfile().catch(err => {
          console.warn('⚠️ Failed to load profile:', err);
        }),
        auth.loadOrders().catch(err => {
          console.warn('⚠️ Failed to load orders:', err);
          return [];
        })
      ]);

      console.log('✅ User data loaded');
    } catch (err) {
      console.error('❌ Error loading user data:', err);
    }
  };

  // Common props for all pages
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
    loadOrders: auth.loadOrders,
    loadProfile: auth.loadProfile
  };

  // Route to appropriate page
  if (!auth.user) {
    // Guest routes
    if (currentPage === 'login') {
      return <LoginPage {...pageProps} />;
    }
    if (currentPage === 'register') {
      return <RegisterPage {...pageProps} />;
    }
    // Default to home for guests
    return <HomePage {...pageProps} />;
  }

  // Authenticated routes
  if (auth.user.role === 'Admin' && currentPage === 'admin') {
    return <AdminDashboard {...pageProps} />;
  }

  switch (currentPage) {
    case 'products':
      return <ProductsPage {...pageProps} />;
    case 'cart':
      return <CartPage {...pageProps} />;
    case 'checkout':
      return <CheckoutPage {...pageProps} />;
    case 'orders':
      return <OrdersPage {...pageProps} />;
    case 'profile':
      return <ProfilePage {...pageProps} />;
    default:
      // Default authenticated page
      return <ProductsPage {...pageProps} />;
  }
};

export default App;