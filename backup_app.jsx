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
 