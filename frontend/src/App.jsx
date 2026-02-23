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
  const [appReady, setAppReady] = useState(false);

  // Custom hooks
  const auth = useAuth();
  const cartHook = useCart(auth.user);
  const productsHook = useProducts();

  // Initialize app on mount
  useEffect(() => {
    initializeApp();
  }, []);

  // Save currentPage to localStorage whenever it changes (only after app is ready)
  useEffect(() => {
    if (appReady) {
      localStorage.setItem('currentPage', currentPage);
    }
  }, [currentPage, appReady]);

  // Reload data when user changes
  useEffect(() => {
    if (auth.user) {
      loadUserData();
    }
  }, [auth.user]);

  const clearSession = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('cart');
    localStorage.removeItem('currentPage');
    setCurrentPage('home');
  };

  const validateToken = async (token) => {
    try {
      const response = await fetch('/api/mongo/auth/validate', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      return response.ok;
    } catch (err) {
      console.warn('⚠️ Token validation failed (server may be down):', err.message);
      return false;
    }
  };

  const initializeApp = async () => {
    try {
      console.log('🚀 Initializing ShopAI...');

      const token = localStorage.getItem('token');
      const userData = localStorage.getItem('user');
      const savedPage = localStorage.getItem('currentPage');

      if (token && userData) {
        console.log('🔍 Validating token with server...');
        const isValid = await validateToken(token);

        if (!isValid) {
          console.warn('⚠️ Token invalid or server restarted — clearing session');
          clearSession();
          return;
        }

        try {
          const parsedUser = JSON.parse(userData);
          console.log('✅ Found valid session for:', parsedUser.email);

          auth.setUser(parsedUser);

          if (parsedUser.role === 'Admin') {
            const adminPages = ['admin', 'products'];
            setCurrentPage(savedPage && adminPages.includes(savedPage) ? savedPage : 'admin');
          } else {
            const customerPages = ['products', 'cart', 'checkout', 'orders', 'profile'];
            setCurrentPage(savedPage && customerPages.includes(savedPage) ? savedPage : 'products');
          }

        } catch (err) {
          console.error('❌ Error parsing user data:', err);
          clearSession();
        }
      } else {
        console.log('ℹ️ No existing session found');
        localStorage.removeItem('currentPage');
        setCurrentPage('home');
      }

      console.log('✅ App initialized');
    } catch (err) {
      console.error('❌ App initialization error:', err);
      clearSession();
    } finally {
      setAppReady(true);
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

  // Show spinner until session check is complete
  if (!appReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 font-semibold text-lg">Loading ShopAI...</p>
        </div>
      </div>
    );
  }

  // Route to appropriate page
  if (!auth.user) {
    if (currentPage === 'login') {
      return <LoginPage {...pageProps} />;
    }
    if (currentPage === 'register') {
      return <RegisterPage {...pageProps} />;
    }
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
      return <ProductsPage {...pageProps} />;
  }
};

export default App;