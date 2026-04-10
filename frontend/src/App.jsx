import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './hooks/useAuth';
import { useCart } from './hooks/useCart';
import { useProducts } from './hooks/useProducts';

import HomePage       from './pages/HomePage';
import LoginPage      from './pages/LoginPage';
import RegisterPage   from './pages/RegisterPage';
import ProductsPage   from './pages/ProductsPage';
import CartPage       from './pages/CartPage';
import CheckoutPage   from './pages/CheckoutPage';
import OrdersPage     from './pages/OrdersPage';
import ProfilePage    from './pages/ProfilePage';
import AdminDashboard from './pages/admin/AdminDashboard';

const App = () => {
  const [currentPage,  setCurrentPage]  = useState('home');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [error,        setError]        = useState('');
  const [loading,      setLoading]      = useState(false);

  const auth         = useAuth();
  const cartHook     = useCart(auth.user);
  const productsHook = useProducts();

  // ── After rehydration finishes, restore the correct page ───────────────
  // We wait for isInitializing=false so we KNOW whether the session is valid
  // or was cleared (server restart / different user). Only then do we read
  // currentPage from storage — this prevents restoring a page that belongs
  // to a cleared session.
  useEffect(() => {
    if (auth.isInitializing) return;

    const saved =
      sessionStorage.getItem('currentPage') ||
      localStorage.getItem('currentPage')   ||
      'home';

    if (!auth.user) {
      const publicPages = ['home', 'login', 'register'];
      setCurrentPage(publicPages.includes(saved) ? saved : 'home');
      return;
    }

    if (auth.user.role === 'Admin') {
      const adminPages = ['admin', 'products'];
      setCurrentPage(adminPages.includes(saved) ? saved : 'admin');
    } else {
      // Customer — block admin page
      setCurrentPage(saved === 'admin' ? 'products' : saved);
    }
  }, [auth.isInitializing, auth.user]); // runs exactly once when auth check completes

  // ── Persist currentPage ─────────────────────────────────────────────────
  useEffect(() => {
    if (auth.isInitializing) return;
    sessionStorage.setItem('currentPage', currentPage);
    localStorage.setItem('currentPage',   currentPage);
  }, [currentPage, auth.isInitializing]);

  // ── Load data when user becomes available ───────────────────────────────
  const loadUserData = useCallback(async () => {
    if (!auth.user) return;
    try {
      await Promise.all([
        productsHook.loadProducts().catch(e => console.warn('⚠️ products:', e)),
        cartHook.loadCart().catch(e =>         console.warn('⚠️ cart:', e)),
        auth.loadProfile().catch(e =>          console.warn('⚠️ profile:', e)),
        auth.loadOrders().catch(e =>           console.warn('⚠️ orders:', e))
      ]);
    } catch (e) { console.error('❌ loadUserData:', e); }
  }, [auth, productsHook, cartHook]);

  useEffect(() => {
    if (auth.user) loadUserData();
  }, [auth.user, loadUserData]);

  const pageProps = {
    currentPage, setCurrentPage,
    searchQuery, setSearchQuery,
    error, setError,
    loading, setLoading,
    user:               auth.user,
    setUser:            auth.setUser,
    cart:               cartHook.cart,
    setCart:            cartHook.setCart,
    products:           productsHook.products,
    setProducts:        productsHook.setProducts,
    orders:             auth.orders,
    setOrders:          auth.setOrders,
    handleLogout:       auth.handleLogout,
    addToCart:          cartHook.addToCart,
    updateCartQuantity: cartHook.updateCartQuantity,
    removeFromCart:     cartHook.removeFromCart,
    clearCart:          cartHook.clearCart,
    profileData:        auth.profileData,
    setProfileData:     auth.setProfileData,
    loadProducts:       productsHook.loadProducts,
    loadOrders:         auth.loadOrders,
    loadProfile:        auth.loadProfile
  };

  // Spinner while session check runs
  if (auth.isInitializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 font-semibold text-lg">Loading ShopAI...</p>
        </div>
      </div>
    );
  }

  if (!auth.user) {
    if (currentPage === 'login')    return <LoginPage    {...pageProps} />;
    if (currentPage === 'register') return <RegisterPage {...pageProps} />;
    return <HomePage {...pageProps} />;
  }

  if (auth.user.role === 'Admin' && currentPage === 'admin') {
    return <AdminDashboard {...pageProps} />;
  }

  switch (currentPage) {
    case 'products': return <ProductsPage  {...pageProps} />;
    case 'cart':     return <CartPage      {...pageProps} />;
    case 'checkout': return <CheckoutPage  {...pageProps} />;
    case 'orders':   return <OrdersPage    {...pageProps} />;
    case 'profile':  return <ProfilePage   {...pageProps} />;
    default:         return <ProductsPage  {...pageProps} />;
  }
};

export default App;