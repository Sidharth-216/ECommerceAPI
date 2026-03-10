import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShoppingBag, Search, ShoppingCart, MessageCircle,
  UserCircle, LogOut, Package, X, Send,
  ChevronLeft, ChevronRight, Sparkles, Bot, Loader2,
  TrendingUp, Star, Zap
} from 'lucide-react';
import { productsAPI } from '../api.js';

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────
const AI_AGENT_URL = process.env.REACT_APP_AI_AGENT_URL || 'http://localhost:7860';

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────
const getCategoryName = (product) => {
  if (!product) return 'Uncategorized';
  const cat = product.categoryName || product.category;
  if (!cat) return 'Uncategorized';
  if (typeof cat === 'string') return cat;
  if (typeof cat === 'object' && cat.name) return cat.name;
  return String(cat);
};

const getPrice = (product) => {
  if (!product?.price) return 0;
  if (typeof product.price === 'number') return product.price;
  if (typeof product.price === 'object' && product.price.$numberDecimal)
    return parseFloat(product.price.$numberDecimal);
  return parseFloat(product.price) || 0;
};

const getRating = (product) => {
  if (!product?.rating) return null;
  if (typeof product.rating === 'number') return product.rating;
  if (typeof product.rating === 'object' && product.rating.$numberDecimal)
    return parseFloat(product.rating.$numberDecimal);
  return parseFloat(product.rating) || null;
};

const getProductId = (product) => {
  return product?.id || product?._id?.$oid || product?._id || product?.Id || null;
};

// ─────────────────────────────────────────────────────────────────
// AI CHAT API CALL  →  POST /chat on the FastAPI agent
// The agent reads the JWT from the request body and calls /api/ai/*
// ─────────────────────────────────────────────────────────────────
const callAIAgent = async (message, history, userId) => {
  const token =
    sessionStorage.getItem('token') || localStorage.getItem('token') || '';

  const response = await fetch(`${AI_AGENT_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      userId,
      history: history.map(m => ({ role: m.role, content: m.content })),
      jwt_token: token,   // the Python agent forwards this to .NET
    }),
  });

  if (!response.ok) throw new Error(`Agent error: ${response.status}`);
  return response.json();  // { response, action, data, products }
};

// ─────────────────────────────────────────────────────────────────
// QUICK SUGGESTION CHIPS shown at chat start
// ─────────────────────────────────────────────────────────────────
const QUICK_CHIPS = [
  { label: '📱 Best smartphones', msg: 'Show me the best smartphones' },
  { label: '🎧 Headphones under ₹5000', msg: 'Find headphones under ₹5000' },
  { label: '🛒 My cart', msg: 'Show my cart' },
  { label: '📦 My orders', msg: 'Show my order history' },
  { label: '🔥 Trending now', msg: 'What are trending products?' },
  { label: '💻 Gaming laptops', msg: 'Recommend gaming laptops' },
];

// ─────────────────────────────────────────────────────────────────
// PRODUCT MINI-CARD  (shown inside chat when agent returns products)
// ─────────────────────────────────────────────────────────────────
const ChatProductCard = ({ product, onAddToCart }) => {
  const price = typeof product.price === 'number'
    ? product.price
    : parseFloat(product.price || 0);
  const rating = product.rating || 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 flex gap-3 shadow-sm hover:shadow-md transition-all min-w-[240px] max-w-[260px]">
      <img
        src={product.imageUrl || 'https://via.placeholder.com/60x60/f1f5f9/94a3b8?text=P'}
        alt={product.name}
        className="w-14 h-14 object-contain rounded-lg bg-slate-50 shrink-0"
        onError={e => { e.currentTarget.src = 'https://via.placeholder.com/60x60/f1f5f9/94a3b8?text=P'; }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-slate-900 line-clamp-2 leading-tight">{product.name}</p>
        {rating > 0 && (
          <div className="flex items-center gap-0.5 mt-0.5">
            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
            <span className="text-xs text-slate-500">{rating.toFixed(1)}</span>
          </div>
        )}
        <p className="text-sm font-bold text-teal-700 mt-1">₹{price.toLocaleString()}</p>
        <button
          onClick={() => onAddToCart(product)}
          disabled={product.stockQuantity === 0 || product.isAvailable === false}
          className="mt-1.5 w-full text-xs bg-teal-600 hover:bg-teal-700 text-white py-1 rounded-lg disabled:opacity-40 transition-colors font-medium"
        >
          {product.stockQuantity === 0 || product.isAvailable === false ? 'Out of stock' : '+ Add to cart'}
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────
const ProductsPage = ({
  user,
  products,
  cart,
  searchQuery,
  setSearchQuery,
  setCurrentPage,
  handleLogout,
  addToCart,
  error,
  setError,
}) => {
  // Chat state
  const [chatOpen, setChatOpen]           = useState(false);
  const [chatMessages, setChatMessages]   = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping]           = useState(false);
  const chatEndRef                        = useRef(null);

  // Search state
  const [semanticSuggestions, setSemanticSuggestions] = useState([]);
  const [semanticResults, setSemanticResults]         = useState([]);
  const [searchLoading, setSearchLoading]             = useState(false);
  const [showSuggestions, setShowSuggestions]         = useState(false);
  const [isSemanticMode, setIsSemanticMode]           = useState(false);
  const debounceTimer  = useRef(null);

  // Banner
  const [currentBanner, setCurrentBanner] = useState(0);

  // ── Auto-scroll chat ──
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  // ── Banner auto-rotate ──
  useEffect(() => {
    const t = setInterval(() => setCurrentBanner(p => (p + 1) % 3), 5000);
    return () => clearInterval(t);
  }, []);

  // ── Semantic suggestions (debounced) ──
  useEffect(() => {
    const query = searchQuery.trim();
    if (!query || query.length < 2) {
      setSemanticSuggestions([]);
      setShowSuggestions(false);
      if (!query) { setIsSemanticMode(false); setSemanticResults([]); }
      return;
    }
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res  = await productsAPI.search(query, 6);
        const list = res?.data?.results || [];
        setSemanticSuggestions(list);
        setShowSuggestions(list.length > 0);
      } catch {
        setSemanticSuggestions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [searchQuery]);

  // ── Full search ──
  const handleFullSearch = useCallback(async (override) => {
    const q = (override || searchQuery).trim();
    if (!q) return;
    setShowSuggestions(false);
    setSearchLoading(true);
    setIsSemanticMode(true);
    try {
      const res = await productsAPI.search(q, 20);
      setSemanticResults(res?.data?.results || []);
    } catch {
      setSemanticResults([]);
      setError('Search failed. Showing all products.');
      setIsSemanticMode(false);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery]);

  const applyCategory = async (cat) => {
    if (!cat) { setSearchQuery(''); setIsSemanticMode(false); setSemanticResults([]); return; }
    setSearchQuery(cat);
    await handleFullSearch(cat);
  };

  const displayedProducts = isSemanticMode ? semanticResults : (products || []);

  const uniqueCategories = Array.from(
    new Set((products || []).map(p => getCategoryName(p)).filter(Boolean))
  ).slice(0, 20);

  // ── AI Chat send ──
  const sendMessage = async (msg) => {
    const text = (msg || currentMessage).trim();
    if (!text || isTyping) return;

    const userMsg = { role: 'user', content: text };
    setChatMessages(prev => [...prev, userMsg]);
    setCurrentMessage('');
    setIsTyping(true);

    try {
      const userId = user?.id || user?.mongoUserId || user?.Id || '';
      const result = await callAIAgent(text, chatMessages, userId);

      const assistantMsg = {
        role: 'assistant',
        content: result.response || 'I had trouble understanding that. Please try again.',
        products: result.products || null,
        action: result.action || null,
      };
      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      console.error('AI agent error:', err);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: "Sorry, I'm having trouble connecting to the AI service right now. Please try again in a moment.",
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // ── Add to cart from chat product card ──
  const handleChatAddToCart = (product) => {
    addToCart(product, setError);
    setChatMessages(prev => [...prev, {
      role: 'assistant',
      content: `✅ **${product.name}** added to your cart!`,
    }]);
  };

  // ─────────────────────────────────────────────────────────────────
  // BANNERS
  // ─────────────────────────────────────────────────────────────────
  const banners = [
    { title: 'Summer Sale 2026', subtitle: 'Up to 50% OFF on Electronics', desc: 'Free shipping on orders above ₹999', bg: 'from-teal-500 via-cyan-500 to-blue-500' },
    { title: 'New Arrivals', subtitle: 'Latest Smartphones & Gadgets', desc: 'Shop the newest tech at best prices', bg: 'from-purple-600 via-pink-500 to-rose-500' },
    { title: 'Special Offer', subtitle: 'Buy 2 Get 1 Free', desc: 'On selected audio & wearables', bg: 'from-orange-500 via-amber-500 to-yellow-500' },
  ];

  // ─────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50">

      {/* ══════════════ HEADER ══════════════ */}
      <header className="sticky top-0 z-40 shadow-lg">

        {/* Top bar */}
        <div className="bg-slate-900">
          <div className="max-w-[1500px] mx-auto px-4 py-2 flex items-center justify-between gap-4">

            {/* Logo */}
            <div className="flex items-center gap-2 shrink-0 cursor-pointer">
              <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white leading-none">ShopAI</h1>
                <p className="text-[9px] text-teal-400 leading-none">.marketplace</p>
              </div>
            </div>

            {/* Search */}
            <div className="hidden md:flex flex-1 max-w-3xl relative">
              <select
                className="bg-white text-slate-800 px-3 py-2.5 rounded-l-lg border-r border-slate-200 text-sm focus:outline-none font-medium shrink-0"
                onChange={e => applyCategory(e.target.value)}
              >
                <option value="">All</option>
                {uniqueCategories.map((cat, i) => <option key={i} value={cat}>{cat}</option>)}
              </select>

              <div className="relative flex-1">
                <input
                  aria-label="Search products"
                  value={searchQuery}
                  onChange={e => {
                    setSearchQuery(e.target.value);
                    if (!e.target.value.trim()) { setIsSemanticMode(false); setSemanticResults([]); }
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleFullSearch();
                    if (e.key === 'Escape') setShowSuggestions(false);
                  }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onFocus={() => semanticSuggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="Search products... (AI-powered)"
                  className="w-full px-4 py-2.5 text-slate-900 focus:outline-none bg-white"
                />
                {searchLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2 className="w-4 h-4 text-teal-500 animate-spin" />
                  </div>
                )}

                {/* Suggestions dropdown */}
                {showSuggestions && semanticSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 shadow-xl z-50 max-h-96 overflow-y-auto mt-1 rounded-lg">
                    <div className="px-4 py-2 bg-teal-50 border-b border-slate-100 flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                      <span className="text-xs font-semibold text-teal-700">AI Suggestions</span>
                    </div>
                    {semanticSuggestions.map((item, idx) => {
                      const price = getPrice(item);
                      const score = item.score ? `${Math.round(item.score * 100)}% match` : '';
                      return (
                        <div
                          key={item.id || idx}
                          onMouseDown={() => { setSearchQuery(item.name); setShowSuggestions(false); handleFullSearch(item.name); }}
                          className="px-4 py-3 cursor-pointer hover:bg-teal-50 flex justify-between items-center border-b border-slate-100 last:border-0"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                            <p className="text-xs text-slate-500">{item.brand || getCategoryName(item)}</p>
                          </div>
                          <div className="flex flex-col items-end ml-3 shrink-0">
                            <span className="text-sm font-bold text-teal-600">₹{price.toLocaleString()}</span>
                            {score && <span className="text-xs text-slate-400">{score}</span>}
                          </div>
                        </div>
                      );
                    })}
                    <div
                      onMouseDown={() => { setShowSuggestions(false); handleFullSearch(); }}
                      className="px-4 py-2.5 text-center text-sm text-teal-600 font-semibold hover:bg-teal-50 cursor-pointer border-t border-slate-100"
                    >
                      See all results for "{searchQuery}" →
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => handleFullSearch()}
                className="bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-500 hover:to-cyan-600 px-5 py-2.5 rounded-r-lg transition-all"
              >
                <Search className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Right icons */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCurrentPage('profile')}
                className="hover:bg-white/10 px-3 py-2 rounded-lg transition-all group hidden sm:block"
              >
                <div className="text-xs text-slate-400 group-hover:text-white">Hello,</div>
                <div className="font-bold text-sm text-white flex items-center gap-1.5">
                  <UserCircle className="w-4 h-4" />
                  {user?.name || user?.fullName || 'User'}
                </div>
              </button>

              <button
                onClick={() => setCurrentPage('cart')}
                className="flex items-center gap-2 hover:bg-white/10 px-3 py-2 rounded-lg transition-all group relative"
              >
                <div className="relative">
                  <ShoppingCart className="w-6 h-6 text-white group-hover:scale-110 transition-transform" />
                  {cart.length > 0 && (
                    <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                      {cart.length}
                    </span>
                  )}
                </div>
                <div className="hidden lg:flex flex-col items-start">
                  <span className="text-xs text-slate-400">My Cart</span>
                  <span className="font-bold text-sm text-white">{cart.length} items</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Nav bar */}
        <div className="bg-gradient-to-r from-teal-700 to-cyan-700">
          <div className="max-w-[1500px] mx-auto px-4 py-2 flex items-center gap-4 text-sm overflow-x-auto">
            <button
              onClick={() => applyCategory('')}
              className="flex items-center gap-1.5 hover:bg-white/10 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all text-white"
            >
              <Package className="w-3.5 h-3.5" /> All
            </button>
            {uniqueCategories.slice(0, 8).map((cat, i) => (
              <button
                key={i}
                onClick={() => applyCategory(cat)}
                className={`text-white hover:bg-white/10 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${searchQuery === cat ? 'bg-white/20' : ''}`}
              >
                {cat}
              </button>
            ))}
            <button
              onClick={() => setChatOpen(true)}
              className="flex items-center gap-1.5 text-white hover:bg-white/10 px-3 py-1.5 rounded-lg ml-auto whitespace-nowrap transition-all"
            >
              <Bot className="w-3.5 h-3.5" /> AI Help
            </button>
            <button
              onClick={handleLogout}
              className="text-white hover:bg-white/10 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all"
            >
              <LogOut className="w-3.5 h-3.5 inline mr-1" />Logout
            </button>
          </div>
        </div>
      </header>

      {/* Mobile search */}
      <div className="md:hidden bg-white p-3 border-b shadow-sm">
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2.5">
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            aria-label="Search products"
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              if (!e.target.value.trim()) { setIsSemanticMode(false); setSemanticResults([]); }
            }}
            onKeyDown={e => { if (e.key === 'Enter') handleFullSearch(); }}
            placeholder="Search products (AI-powered)..."
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
          {searchLoading && <Loader2 className="w-4 h-4 text-teal-500 animate-spin shrink-0" />}
        </div>
      </div>

      {/* ══════════════ MAIN CONTENT ══════════════ */}
      <div className="max-w-[1500px] mx-auto px-3">

        {error && (
          <div className="mt-4 bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 mb-4 rounded-r-lg">
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* Banner */}
        <div className="relative h-[300px] overflow-hidden mt-4 mb-6 bg-white rounded-xl shadow-lg">
          <div
            className="absolute inset-0 flex transition-transform duration-500"
            style={{ transform: `translateX(-${currentBanner * 100}%)` }}
          >
            {banners.map((b, idx) => (
              <div key={idx} className="min-w-full h-full relative">
                <div className={`absolute inset-0 bg-gradient-to-r ${b.bg}`}>
                  <div className="max-w-2xl h-full flex flex-col justify-center px-10 text-white">
                    <h2 className="text-4xl font-extrabold mb-3">{b.title}</h2>
                    <p className="text-xl font-semibold mb-1">{b.subtitle}</p>
                    <p className="text-base mb-5 text-white/90">{b.desc}</p>
                    <button
                      onClick={() => { setSearchQuery(''); setIsSemanticMode(false); setSemanticResults([]); }}
                      className="w-fit px-7 py-2.5 bg-white text-slate-900 font-bold rounded-lg hover:shadow-xl transition-all hover:scale-105 text-sm"
                    >
                      Shop Now →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setCurrentBanner(p => (p - 1 + banners.length) % banners.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg"
          >
            <ChevronLeft className="w-4 h-4 text-slate-900" />
          </button>
          <button
            onClick={() => setCurrentBanner(p => (p + 1) % banners.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full shadow-lg"
          >
            <ChevronRight className="w-4 h-4 text-slate-900" />
          </button>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentBanner(idx)}
                className={`h-1.5 rounded-full transition-all ${currentBanner === idx ? 'bg-white w-6' : 'bg-white/50 w-1.5'}`}
              />
            ))}
          </div>
        </div>

        {/* Category cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            { title: 'Trending Electronics', subs: ['Smartphones', 'Laptops', 'Tablets', 'Accessories'], cat: 'Electronics', icon: <Zap className="w-4 h-4" /> },
            { title: 'Audio & Wearables', subs: ['Headphones', 'Smart Watches', 'Earbuds', 'Speakers'], cat: 'Audio', icon: <Star className="w-4 h-4" /> },
            { title: 'Home Appliances', subs: ['Air Purifiers', 'Vacuums', 'Microwaves', 'Washers'], cat: 'Appliances', icon: <Package className="w-4 h-4" /> },
            { title: 'Deals Under ₹999', subs: ['Cables', 'Cases', 'Chargers', 'More'], cat: '', icon: <TrendingUp className="w-4 h-4" /> },
          ].map((c, i) => (
            <div key={i} className="bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-all">
              <h3 className="text-sm font-bold mb-2 text-slate-900 flex items-center gap-1.5">
                <span className="text-teal-600">{c.icon}</span>{c.title}
              </h3>
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {c.subs.map(sub => (
                  <div key={sub}>
                    <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 rounded-md mb-1" />
                    <p className="text-xs text-slate-600">{sub}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => applyCategory(c.cat)} className="text-xs text-teal-600 hover:text-teal-700 font-semibold">
                Explore all →
              </button>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div className="bg-white p-3 mb-4 rounded-lg shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Sort:</span>
            <select className="text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option>Featured</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
              <option>Top Rated</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            {isSemanticMode && (
              <>
                <span className="text-xs bg-teal-100 text-teal-700 px-2.5 py-1 rounded-full font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> AI results for "{searchQuery}"
                </span>
                <button
                  onClick={() => { setSearchQuery(''); setIsSemanticMode(false); setSemanticResults([]); }}
                  className="text-xs text-slate-500 hover:text-slate-700 underline"
                >
                  Clear
                </button>
              </>
            )}
            <span className="text-xs text-slate-500">
              <strong className="text-slate-900">{displayedProducts.length}</strong> products
            </span>
          </div>
        </div>

        {/* Products grid */}
        <div className="pb-8">
          {searchLoading && isSemanticMode ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="bg-white p-4 rounded-lg border border-slate-200 animate-pulse">
                  <div className="aspect-square bg-slate-200 rounded-lg mb-3" />
                  <div className="h-3.5 bg-slate-200 rounded mb-2" />
                  <div className="h-3 bg-slate-200 rounded w-2/3 mb-3" />
                  <div className="h-8 bg-slate-200 rounded" />
                </div>
              ))}
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl shadow-sm">
              <Search className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h3 className="text-lg font-bold text-slate-900 mb-1">No products found</h3>
              <p className="text-slate-500 text-sm mb-5">
                {isSemanticMode ? `No matches for "${searchQuery}". Try different keywords.` : 'Try different keywords.'}
              </p>
              <button
                onClick={() => { setSearchQuery(''); setIsSemanticMode(false); setSemanticResults([]); }}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-lg transition-all text-sm"
              >
                View All Products
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {displayedProducts.map((product, index) => {
                const price    = getPrice(product);
                const rating   = getRating(product);
                const category = getCategoryName(product);
                const pid      = getProductId(product) || index;

                return (
                  <div
                    key={pid}
                    className="bg-white p-3 hover:shadow-lg transition-all rounded-lg border border-slate-200 flex flex-col group"
                  >
                    <div className="relative mb-3 bg-slate-50 rounded-lg overflow-hidden aspect-square">
                      <img
                        src={product.imageUrl || 'https://via.placeholder.com/300x300/f1f5f9/94a3b8?text=Product'}
                        alt={product.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        onError={e => { e.currentTarget.src = 'https://via.placeholder.com/300x300/f1f5f9/94a3b8?text=Product'; }}
                      />
                      {isSemanticMode && product.score && (
                        <div className="absolute top-2 right-2 bg-teal-600 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                          {Math.round(product.score * 100)}%
                        </div>
                      )}
                      {product.stockQuantity !== undefined && product.stockQuantity > 0 && product.stockQuantity <= 5 && (
                        <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">
                          Only {product.stockQuantity} left
                        </div>
                      )}
                    </div>

                    <div className="flex-1 flex flex-col">
                      <h3 className="text-xs font-medium text-slate-900 mb-1 line-clamp-2 group-hover:text-teal-600 transition-colors">
                        {product.name}
                      </h3>

                      {rating && (
                        <div className="flex items-center gap-0.5 mb-1.5">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${i < Math.floor(rating) ? 'text-amber-400 fill-amber-400' : 'text-slate-200 fill-slate-200'}`}
                            />
                          ))}
                          <span className="text-xs text-slate-500 ml-0.5">({product.reviewCount || 0})</span>
                        </div>
                      )}

                      <div className="mb-2">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-xs font-semibold text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded">-20%</span>
                          <span className="text-base font-bold text-slate-900">₹{price.toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-slate-400">
                          M.R.P: <span className="line-through">₹{(price * 1.2).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 mb-3">{product.brand || category}</p>

                      <div className="mt-auto space-y-1.5">
                        <button
                          onClick={() => addToCart(product, setError)}
                          disabled={product.stockQuantity === 0}
                          className="w-full px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        >
                          {product.stockQuantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══════════════ AI CHAT WIDGET ══════════════ */}
      {chatOpen && (
        <div className="fixed bottom-6 right-6 w-[400px] bg-white rounded-2xl shadow-2xl flex flex-col border border-slate-200 z-50 max-h-[650px]">

          {/* Header */}
          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-4 flex justify-between items-center rounded-t-2xl shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm">ShopAI Assistant</h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  <p className="text-xs text-teal-100">Online · AI-powered</p>
                </div>
              </div>
            </div>
            <button
              aria-label="Close chat"
              onClick={() => setChatOpen(false)}
              className="hover:bg-white/20 p-1.5 rounded-lg transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 min-h-[320px] max-h-[430px]">

            {/* Empty state */}
            {chatMessages.length === 0 && (
              <div className="text-center pt-4">
                <div className="w-14 h-14 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <Bot className="w-7 h-7 text-teal-600" />
                </div>
                <p className="font-semibold text-slate-800 text-sm mb-1">Hi {user?.fullName?.split(' ')[0] || 'there'}! 👋</p>
                <p className="text-xs text-slate-500 mb-4">I can search products, manage your cart,<br />compare items, and place orders.</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {QUICK_CHIPS.map((chip, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(chip.msg)}
                      className="text-xs bg-white border border-slate-200 hover:border-teal-400 hover:bg-teal-50 text-slate-700 px-2.5 py-1.5 rounded-full transition-all"
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message list */}
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}>
                {msg.role === 'assistant' && (
                  <div className="w-7 h-7 bg-teal-100 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-teal-600" />
                  </div>
                )}
                <div className="max-w-[80%] space-y-2">
                  <div className={`px-3 py-2 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap
                    ${msg.role === 'user'
                      ? 'bg-teal-600 text-white rounded-tr-sm'
                      : 'bg-white text-slate-900 border border-slate-200 rounded-tl-sm shadow-sm'
                    }`}
                  >
                    {msg.content}
                  </div>

                  {/* Product cards from agent */}
                  {msg.role === 'assistant' && msg.products && msg.products.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                      {msg.products.slice(0, 3).map((p, pi) => (
                        <ChatProductCard
                          key={pi}
                          product={p}
                          onAddToCart={handleChatAddToCart}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Typing indicator */}
            {isTyping && (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-teal-100 rounded-full flex items-center justify-center shrink-0">
                  <Bot className="w-3.5 h-3.5 text-teal-600" />
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-3 py-2 shadow-sm">
                  <div className="flex gap-1 items-center">
                    <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-slate-200 p-3 bg-white rounded-b-2xl flex gap-2 shrink-0">
            <input
              type="text"
              value={currentMessage}
              onChange={e => setCurrentMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask me anything..."
              disabled={isTyping}
              className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50 bg-slate-50"
            />
            <button
              onClick={() => sendMessage()}
              disabled={!currentMessage.trim() || isTyping}
              className="bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition-all"
            >
              {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Floating chat button */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white rounded-2xl shadow-xl flex items-center justify-center z-40 transition-all hover:scale-110"
        >
          <Bot className="w-6 h-6" />
          {chatMessages.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {Math.min(chatMessages.filter(m => m.role === 'user').length, 9)}
            </span>
          )}
        </button>
      )}
    </div>
  );
};

export default ProductsPage;