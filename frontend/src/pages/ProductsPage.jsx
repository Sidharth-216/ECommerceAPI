import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShoppingBag, Search, ShoppingCart, MessageCircle, UserCircle, LogOut, Package, Plus, Minus, X, Send, ChevronLeft, ChevronRight } from 'lucide-react';
import { productsAPI } from '../services/api'; // adjust path if needed

// ─────────────────────────────────────────────────────────────────
// HELPER: safely extract category name from product
// Your MongoDB category field is: { _id: 0, name: "Televisions" }
// ─────────────────────────────────────────────────────────────────
const getCategoryName = (product) => {
  if (!product) return 'Uncategorized';
  const cat = product.categoryName || product.category;
  if (!cat) return 'Uncategorized';
  if (typeof cat === 'string') return cat;
  if (typeof cat === 'object' && cat.name) return cat.name;
  return String(cat);
};

// ─────────────────────────────────────────────────────────────────
// HELPER: safely extract price (handles $numberDecimal format)
// ─────────────────────────────────────────────────────────────────
const getPrice = (product) => {
  if (!product?.price) return 0;
  if (typeof product.price === 'number') return product.price;
  if (typeof product.price === 'object' && product.price.$numberDecimal) {
    return parseFloat(product.price.$numberDecimal);
  }
  return parseFloat(product.price) || 0;
};

// ─────────────────────────────────────────────────────────────────
// HELPER: safely extract rating
// ─────────────────────────────────────────────────────────────────
const getRating = (product) => {
  if (!product?.rating) return null;
  if (typeof product.rating === 'number') return product.rating;
  if (typeof product.rating === 'object' && product.rating.$numberDecimal) {
    return parseFloat(product.rating.$numberDecimal);
  }
  return parseFloat(product.rating) || null;
};


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
  setError
}) => {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(0);
  const chatEndRef = useRef(null);

  // ── Semantic search state ──
  const [semanticSuggestions, setSemanticSuggestions] = useState([]); // dropdown items
  const [semanticResults, setSemanticResults] = useState([]);          // full results grid
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSemanticMode, setIsSemanticMode] = useState(false);        // true when showing AI results
  const debounceTimer = useRef(null);
  const abortController = useRef(null); // cancel stale requests

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Auto-rotate banner
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBanner(prev => (prev + 1) % 3);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // ─────────────────────────────────────────────────────────────────
  // SEMANTIC SEARCH — Suggestions (fires while typing, debounced)
  // Waits 300ms after user stops typing, then fetches top 6 suggestions
  // ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    const query = searchQuery.trim();

    if (!query || query.length < 2) {
      setSemanticSuggestions([]);
      setShowSuggestions(false);
      // If user cleared the search, go back to showing all products
      if (!query) {
        setIsSemanticMode(false);
        setSemanticResults([]);
      }
      return;
    }

    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      // Cancel previous in-flight request
      if (abortController.current) {
        abortController.current.abort();
      }

      setSearchLoading(true);
      try {
        const response = await productsAPI.search(query, 6); // top 6 for dropdown
        const results = response?.data || [];
        setSemanticSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.warn('Semantic suggestion failed, falling back silently:', err.message);
          setSemanticSuggestions([]);
        }
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceTimer.current);
  }, [searchQuery]);

  // ─────────────────────────────────────────────────────────────────
  // SEMANTIC SEARCH — Full Results (fires on Enter or Search button)
  // ─────────────────────────────────────────────────────────────────
  const handleFullSearch = useCallback(async (queryOverride) => {
    const query = (queryOverride || searchQuery).trim();
    if (!query) return;

    setShowSuggestions(false);
    setSearchLoading(true);
    setIsSemanticMode(true);

    try {
      const response = await productsAPI.search(query, 20); // top 20 for grid
      const results = response?.data || [];
      setSemanticResults(results);
    } catch (err) {
      console.error('Semantic full search error:', err);
      setSemanticResults([]);
      setError('Search failed. Showing all products instead.');
      setIsSemanticMode(false);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery]);

  // ─────────────────────────────────────────────────────────────────
  // Products to display in grid:
  // - If user has done a full search → show semanticResults
  // - If no search → show all products (client-side, no filter needed)
  // ─────────────────────────────────────────────────────────────────
  const displayedProducts = isSemanticMode
    ? semanticResults
    : (products || []);

  // Extract unique categories from ALL products (for nav bar + dropdown)
  const uniqueCategories = Array.from(
    new Set(
      (products || []).map(p => getCategoryName(p)).filter(Boolean)
    )
  ).slice(0, 20);

  const applyCategory = async (cat) => {
    if (!cat) {
      setSearchQuery('');
      setIsSemanticMode(false);
      setSemanticResults([]);
      return;
    }
    setSearchQuery(cat);
    await handleFullSearch(cat);
  };

  const quickView = (p) => {
    const price = getPrice(p);
    const category = getCategoryName(p);
    alert(`${p.name}\n\n${p.brand || ''}\n${category}\n\n₹${price.toLocaleString()}\n\n${p.description || ''}`);
  };

  // ─────────────────────────────────────────────────────────────────
  // AI Chat (unchanged from your original — kept as-is)
  // ─────────────────────────────────────────────────────────────────
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
        const phones = (products || []).filter(p => getCategoryName(p).toLowerCase().includes('phone') || getCategoryName(p).toLowerCase().includes('electronic'));
        if (lowerMsg.includes('under') || lowerMsg.includes('below')) {
          agentResponse = "I found some great smartphones under ₹10,000! Here's the best option:\n\n📱 Premium Smartphone X1 by TechBrand\nPrice: ₹9,999\nRating: 4.5/5 (1,250 reviews)\nFeatures: 6GB RAM, 128GB Storage, 48MP Camera\n\nWould you like me to add this to your cart?";
        } else {
          agentResponse = `I found ${phones.length} smartphones for you! The Premium Smartphone X1 is our top pick with excellent camera and battery life. Would you like more details?`;
        }
      } else if (lowerMsg.includes('add') && lowerMsg.includes('cart')) {
        if ((products || []).length > 0) {
          addToCart(products[0], setError);
          agentResponse = `Great choice! I've added ${products[0].name} to your cart. Your cart now has ${cart.length + 1} items. Would you like to continue shopping or proceed to checkout?`;
        }
      } else if (lowerMsg.includes('cart') || lowerMsg.includes('show')) {
        if (cart.length === 0) {
          agentResponse = "Your cart is currently empty. Would you like me to help you find some products?";
        } else {
          const total = cart.reduce((sum, item) => sum + (getPrice(item) * item.quantity), 0);
          agentResponse = `You have ${cart.length} items in your cart:\n\n${cart.map(item => `• ${item.productName || item.name} - ₹${getPrice(item)} x ${item.quantity}`).join('\n')}\n\nTotal: ₹${total.toLocaleString()}\n\nReady to checkout?`;
        }
      } else if (lowerMsg.includes('recommend') || lowerMsg.includes('suggest')) {
        agentResponse = "Based on popular choices, I recommend:\n\n1. Premium Smartphone X1 - Best value for money\n2. Wireless Earbuds Pro - Great audio quality\n3. Smart Watch Ultra - Perfect for fitness tracking\n\nWhich category interests you most?";
      } else if (lowerMsg.includes('checkout') || lowerMsg.includes('buy')) {
        agentResponse = "Perfect! To proceed with checkout, I'll need to confirm your shipping address. You have saved addresses. Would you like to use them, or add a new one?";
      } else {
        agentResponse = "I can help you with:\n• Finding products by category or budget\n• Adding items to your cart\n• Checking order status\n• Product recommendations\n\nWhat would you like to do?";
      }

      setChatMessages(prev => [...prev, { role: 'assistant', content: agentResponse }]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000);
  };

  const banners = [
    {
      title: "Summer Sale 2026",
      subtitle: "Up to 50% OFF on Electronics",
      description: "Free shipping on orders above ₹999",
      bg: "from-teal-500 via-cyan-500 to-blue-500"
    },
    {
      title: "New Arrivals",
      subtitle: "Latest Smartphones & Gadgets",
      description: "Shop the newest tech at best prices",
      bg: "from-purple-600 via-pink-500 to-rose-500"
    },
    {
      title: "Special Offer",
      subtitle: "Buy 2 Get 1 Free",
      description: "On selected audio & wearables",
      bg: "from-orange-500 via-amber-500 to-yellow-500"
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── HEADER ── */}
      <header className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white sticky top-0 z-40 shadow-lg">

        {/* Top Bar */}
        <div className="bg-slate-900">
          <div className="max-w-[1500px] mx-auto px-4 py-2 flex items-center justify-between">

            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">ShopAI</h1>
                <p className="text-[10px] text-teal-300">.marketplace</p>
              </div>
            </div>

            {/* ── SEARCH BAR (Semantic) ── */}
            <div className="hidden md:flex flex-1 max-w-3xl mx-4 relative">
              <select
                className="bg-white text-slate-800 px-3 py-2.5 rounded-l-lg border-r border-slate-200 text-sm focus:outline-none font-medium"
                onChange={(e) => applyCategory(e.target.value)}
              >
                <option value="">All</option>
                {uniqueCategories.map((cat, i) => (
                  <option key={i} value={cat}>{cat}</option>
                ))}
              </select>

              <div className="relative flex-1">
                <input
                  aria-label="Search products"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    // If user clears the box, exit semantic mode
                    if (!e.target.value.trim()) {
                      setIsSemanticMode(false);
                      setSemanticResults([]);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleFullSearch();
                    }
                    if (e.key === 'Escape') {
                      setShowSuggestions(false);
                    }
                  }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onFocus={() => semanticSuggestions.length > 0 && setShowSuggestions(true)}
                  placeholder="Search for products... (AI-powered)"
                  className="w-full px-4 py-2.5 text-slate-900 focus:outline-none"
                />

                {/* Loading indicator inside input */}
                {searchLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                )}

                {/* ── Suggestions Dropdown ── */}
                {showSuggestions && semanticSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-slate-200 shadow-xl z-50 max-h-96 overflow-y-auto mt-1 rounded-lg">

                    {/* Label */}
                    <div className="px-4 py-2 bg-teal-50 border-b border-slate-100 flex items-center gap-2">
                      <span className="text-xs font-semibold text-teal-700">🤖 AI Suggestions</span>
                    </div>

                    {semanticSuggestions.map((item, idx) => {
                      const price = getPrice(item);
                      const category = getCategoryName(item);
                      const score = item.score ? `${Math.round(item.score * 100)}% match` : '';

                      return (
                        <div
                          key={item.id || item._id || idx}
                          onMouseDown={() => {
                            setSearchQuery(item.name);
                            setShowSuggestions(false);
                            handleFullSearch(item.name);
                          }}
                          className="px-4 py-3 cursor-pointer hover:bg-teal-50 flex justify-between items-center border-b border-slate-100 last:border-0"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-900 truncate">{item.name}</p>
                            <p className="text-xs text-slate-500">{item.brand || category}</p>
                          </div>
                          <div className="flex flex-col items-end ml-3 shrink-0">
                            <span className="text-sm font-bold text-teal-600">₹{price.toLocaleString()}</span>
                            {score && (
                              <span className="text-xs text-slate-400">{score}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    {/* "See all results" footer */}
                    <div
                      onMouseDown={() => {
                        setShowSuggestions(false);
                        handleFullSearch();
                      }}
                      className="px-4 py-2.5 text-center text-sm text-teal-600 font-semibold hover:bg-teal-50 cursor-pointer border-t border-slate-100"
                    >
                      See all results for "{searchQuery}" →
                    </div>
                  </div>
                )}
              </div>

              {/* Search Button */}
              <button
                onClick={() => handleFullSearch()}
                className="bg-gradient-to-r from-cyan-400 to-cyan-500 hover:from-cyan-500 hover:to-cyan-600 px-6 py-2.5 rounded-r-lg transition-all"
              >
                <Search className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Right Side Icons */}
            <div className="flex items-center gap-6">
              <button onClick={() => setCurrentPage('profile')} className="hover:bg-white/10 px-4 py-2.5 rounded-lg transition-all group">
                <div className="text-xs text-teal-100 group-hover:text-white">Hello, {user?.name || 'User'}</div>
                <div className="font-bold text-sm flex items-center gap-2 group-hover:text-teal-200">
                  <UserCircle className="w-5 h-5" />
                  Account
                </div>
              </button>

              <button onClick={() => setCurrentPage('cart')} className="flex items-center gap-3 hover:bg-white/10 px-5 py-2.5 rounded-lg transition-all group relative">
                <div className="relative">
                  <ShoppingCart className="w-7 h-7 group-hover:scale-110 transition-transform" />
                  {cart.length > 0 && (
                    <span className="absolute -top-3 -right-3 bg-gradient-to-r from-orange-400 to-orange-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg">
                      {cart.length}
                    </span>
                  )}
                </div>
                <div className="hidden lg:flex flex-col items-start">
                  <span className="text-xs text-teal-100 group-hover:text-white">My Cart</span>
                  <span className="font-bold text-sm group-hover:text-teal-200">{cart.length} items</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Bar */}
        <div className="bg-gradient-to-r from-teal-700 to-cyan-700">
          <div className="max-w-[1500px] mx-auto px-4 py-2.5 flex items-center gap-6 text-sm overflow-x-auto">
            <button
              onClick={() => applyCategory('')}
              className="flex items-center gap-2 hover:bg-white/10 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all"
            >
              <Package className="w-4 h-4" />
              All
            </button>
            {uniqueCategories.slice(0, 8).map((cat, i) => (
              <button
                key={i}
                onClick={() => applyCategory(cat)}
                className={`hover:bg-white/10 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all ${searchQuery === cat ? 'bg-white/20' : ''}`}
              >
                {cat}
              </button>
            ))}
            <button onClick={() => setChatOpen(!chatOpen)} className="flex items-center gap-2 hover:bg-white/10 px-3 py-1.5 rounded-lg ml-auto whitespace-nowrap transition-all">
              <MessageCircle className="w-4 h-4" />
              AI Help
            </button>
            <button onClick={handleLogout} className="hover:bg-white/10 px-3 py-1.5 rounded-lg whitespace-nowrap transition-all">
              <LogOut className="w-4 h-4 inline mr-1" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Search */}
      <div className="md:hidden bg-white p-3 border-b shadow-sm">
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg px-3 py-2.5">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            aria-label="Search products"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (!e.target.value.trim()) {
                setIsSemanticMode(false);
                setSemanticResults([]);
              }
            }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleFullSearch(); }}
            placeholder="Search products (AI-powered)..."
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
          {searchLoading && (
            <div className="w-4 h-4 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          )}
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto px-3">
        {error && (
          <div className="mt-4 bg-red-50 border-l-4 border-red-500 text-red-800 px-4 py-3 mb-4 rounded-r-lg">
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}

        {/* ── Hero Banner Carousel (unchanged) ── */}
        <div className="relative h-[350px] overflow-hidden mt-4 mb-6 bg-white rounded-xl shadow-lg">
          <div className="absolute inset-0 flex transition-transform duration-500" style={{ transform: `translateX(-${currentBanner * 100}%)` }}>
            {banners.map((banner, idx) => (
              <div key={idx} className="min-w-full h-full relative">
                <div className={`absolute inset-0 bg-gradient-to-r ${banner.bg}`}>
                  <div className="max-w-2xl h-full flex flex-col justify-center px-12 text-white">
                    <h2 className="text-5xl font-extrabold mb-4">{banner.title}</h2>
                    <p className="text-2xl font-semibold mb-2">{banner.subtitle}</p>
                    <p className="text-lg mb-6 text-white/90">{banner.description}</p>
                    <button
                      onClick={() => { setSearchQuery(''); setIsSemanticMode(false); setSemanticResults([]); }}
                      className="w-fit px-8 py-3 bg-white text-slate-900 font-bold rounded-lg hover:shadow-xl transition-all hover:scale-105"
                    >
                      Shop Now →
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setCurrentBanner(prev => (prev - 1 + banners.length) % banners.length)}
            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2.5 rounded-full shadow-lg transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-slate-900" />
          </button>
          <button
            onClick={() => setCurrentBanner(prev => (prev + 1) % banners.length)}
            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2.5 rounded-full shadow-lg transition-all"
          >
            <ChevronRight className="w-5 h-5 text-slate-900" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentBanner(idx)}
                className={`h-2 rounded-full transition-all ${currentBanner === idx ? 'bg-white w-8' : 'bg-white/50 w-2'}`}
              />
            ))}
          </div>
        </div>

        {/* ── Category Cards (unchanged) ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-5 rounded-lg shadow-md hover:shadow-xl transition-all">
            <h3 className="text-lg font-bold mb-3 text-slate-900">Trending Electronics</h3>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {['Smartphones', 'Laptops', 'Tablets', 'Accessories'].map(sub => (
                <div key={sub}>
                  <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg mb-2"></div>
                  <p className="text-xs text-slate-600">{sub}</p>
                </div>
              ))}
            </div>
            <button onClick={() => applyCategory('Electronics')} className="text-sm text-teal-600 hover:text-teal-700 font-medium">Explore all →</button>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-md hover:shadow-xl transition-all">
            <h3 className="text-lg font-bold mb-3 text-slate-900">Audio & Wearables</h3>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {['Headphones', 'Smart Watches', 'Earbuds', 'Speakers'].map(sub => (
                <div key={sub}>
                  <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg mb-2"></div>
                  <p className="text-xs text-slate-600">{sub}</p>
                </div>
              ))}
            </div>
            <button onClick={() => applyCategory('Audio')} className="text-sm text-teal-600 hover:text-teal-700 font-medium">See more →</button>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-md hover:shadow-xl transition-all">
            <h3 className="text-lg font-bold mb-3 text-slate-900">Home Appliances</h3>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {['Air Purifiers', 'Vacuum Cleaners', 'Microwaves', 'Washers'].map(sub => (
                <div key={sub}>
                  <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg mb-2"></div>
                  <p className="text-xs text-slate-600">{sub}</p>
                </div>
              ))}
            </div>
            <button onClick={() => applyCategory('Appliances')} className="text-sm text-teal-600 hover:text-teal-700 font-medium">View all →</button>
          </div>
          <div className="bg-white p-5 rounded-lg shadow-md hover:shadow-xl transition-all">
            <h3 className="text-lg font-bold mb-3 text-slate-900">Deals Under ₹999</h3>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {['Cables', 'Cases', 'Chargers', 'More'].map(sub => (
                <div key={sub}>
                  <div className="aspect-square bg-gradient-to-br from-slate-100 to-slate-200 rounded-lg mb-2"></div>
                  <p className="text-xs text-slate-600">{sub}</p>
                </div>
              ))}
            </div>
            <a href="#" className="text-sm text-teal-600 hover:text-teal-700 font-medium">Browse →</a>
          </div>
        </div>

        {/* ── Filter & Sort + Result Count ── */}
        <div className="bg-white p-4 mb-4 rounded-lg shadow-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-700">Sort:</span>
            <select className="text-sm border border-slate-300 rounded-lg px-4 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500">
              <option value="">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating-desc">Top Rated</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            {isSemanticMode && (
              <span className="text-xs bg-teal-100 text-teal-700 px-3 py-1 rounded-full font-semibold">
                🤖 AI Search Results for "{searchQuery}"
              </span>
            )}
            {isSemanticMode && (
              <button
                onClick={() => { setSearchQuery(''); setIsSemanticMode(false); setSemanticResults([]); }}
                className="text-xs text-slate-500 hover:text-slate-700 underline"
              >
                Clear search
              </button>
            )}
            <div className="text-sm text-slate-600">
              <span className="font-bold text-slate-900">{displayedProducts.length}</span> products
            </div>
          </div>
        </div>

        {/* ── Products Grid ── */}
        <div className="pb-8">
          {searchLoading && isSemanticMode ? (
            // Skeleton loading while AI search is running
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="bg-white p-4 rounded-lg border border-slate-200 animate-pulse">
                  <div className="aspect-square bg-slate-200 rounded-lg mb-3"></div>
                  <div className="h-4 bg-slate-200 rounded mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-2/3 mb-3"></div>
                  <div className="h-6 bg-slate-200 rounded mb-2"></div>
                  <div className="h-10 bg-slate-200 rounded"></div>
                </div>
              ))}
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-xl shadow-md">
              <Search className="w-16 h-16 mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-900 mb-2">No products found</h3>
              <p className="text-slate-600 mb-6">
                {isSemanticMode
                  ? `No matches for "${searchQuery}". Try different keywords.`
                  : 'Try different keywords or browse all products'}
              </p>
              <button
                onClick={() => { setSearchQuery(''); setIsSemanticMode(false); setSemanticResults([]); }}
                className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white font-semibold rounded-lg transition-all"
              >
                View All Products
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {displayedProducts.map((product, index) => {
                const price = getPrice(product);
                const rating = getRating(product);
                const category = getCategoryName(product);
                const productId = product.id || product._id?.$oid || product._id || index;

                return (
                  <div
                    key={productId}
                    className="bg-white p-4 hover:shadow-xl transition-all rounded-lg border border-slate-200 flex flex-col group"
                  >
                    {/* Product Image */}
                    <div className="relative mb-3 bg-slate-50 rounded-lg overflow-hidden aspect-square">
                      <img
                        src={product.imageUrl || 'https://via.placeholder.com/300x300/f1f5f9/94a3b8?text=Product'}
                        alt={product.name}
                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.src = 'https://via.placeholder.com/300x300/f1f5f9/94a3b8?text=Product';
                        }}
                      />
                      {/* Semantic match score badge */}
                      {isSemanticMode && product.score && (
                        <div className="absolute top-2 right-2 bg-teal-600 text-white text-xs font-bold px-2 py-1 rounded-md">
                          {Math.round(product.score * 100)}% match
                        </div>
                      )}
                      {product.stockQuantity !== undefined && product.stockQuantity <= 5 && product.stockQuantity > 0 && (
                        <div className="absolute top-2 left-2 bg-orange-500 text-white text-xs font-bold px-2 py-1 rounded-md">
                          Only {product.stockQuantity} left
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex-1 flex flex-col">
                      <h3 className="text-sm font-medium text-slate-900 mb-1 line-clamp-2 group-hover:text-teal-600 cursor-pointer transition-colors">
                        {product.name}
                      </h3>

                      {/* Rating */}
                      {rating && (
                        <div className="flex items-center gap-1 mb-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className="text-amber-400 text-xs">
                                {i < Math.floor(rating) ? '★' : '☆'}
                              </span>
                            ))}
                          </div>
                          <span className="text-xs text-slate-600">({product.reviewCount || 0})</span>
                        </div>
                      )}

                      {/* Price */}
                      <div className="mb-3">
                        <div className="flex items-baseline gap-2">
                          <span className="text-xs font-semibold text-orange-500 bg-orange-50 px-2 py-0.5 rounded">-20%</span>
                          <span className="text-xl font-bold text-slate-900">₹{price.toLocaleString()}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          M.R.P: <span className="line-through">₹{(price * 1.2).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>
                      </div>

                      {/* Brand / Category */}
                      <p className="text-xs text-slate-600 mb-3">{product.brand || category}</p>

                      {/* Action Buttons */}
                      <div className="mt-auto space-y-2">
                        <button
                          onClick={() => addToCart(product, setError)}
                          disabled={product.stockQuantity === 0}
                          className="w-full px-4 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white text-sm font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {product.stockQuantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                        </button>
                        <button
                          onClick={() => quickView(product)}
                          className="w-full px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-900 text-sm font-medium rounded-lg transition-all"
                        >
                          Quick View
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

      {/* ── AI Chat Widget (unchanged logic, same UI) ── */}
      {chatOpen && (
        <div className="fixed bottom-6 right-6 w-96 bg-white rounded-xl shadow-2xl flex flex-col border border-slate-200 z-50 max-h-[600px]">
          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white p-4 flex justify-between items-center rounded-t-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <span className="text-lg">🤖</span>
              </div>
              <div>
                <h3 className="font-bold">ShopAI Assistant</h3>
                <p className="text-xs text-teal-100">Online</p>
              </div>
            </div>
            <button aria-label="Close chat" onClick={() => setChatOpen(false)} className="hover:bg-white/20 p-2 rounded-lg transition-all">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 min-h-[300px] max-h-[400px]">
            {chatMessages.length === 0 && (
              <div className="text-center text-slate-500 mt-8">
                <p className="font-semibold mb-2">Hi! How can I help?</p>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  <button onClick={() => sendMessageToAgent('Show me smartphones')} className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-all">📱 Smartphones</button>
                  <button onClick={() => sendMessageToAgent('Best budget products')} className="text-xs bg-white border border-slate-200 px-3 py-1.5 rounded-full hover:bg-slate-100 transition-all">💰 Budget</button>
                </div>
              </div>
            )}
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-xs px-3 py-2 rounded-lg text-sm ${msg.role === 'user' ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white' : 'bg-white text-slate-900 border border-slate-200'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex items-center gap-2 text-slate-600">
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center border border-slate-200">
                  <div className="flex gap-1">
                    <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <div className="w-1.5 h-1.5 bg-teal-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                  </div>
                </div>
                <span className="text-xs">Typing...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="border-t border-slate-200 p-3 bg-white rounded-b-xl flex gap-2">
            <input
              type="text"
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && currentMessage.trim() && !isTyping) sendMessageToAgent(currentMessage.trim()); }}
              placeholder="Type your message..."
              disabled={isTyping}
              className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
            />
            <button
              onClick={() => { if (currentMessage.trim() && !isTyping) sendMessageToAgent(currentMessage.trim()); }}
              disabled={!currentMessage.trim() || isTyping}
              className="bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white p-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Floating Chat Button */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white rounded-full shadow-xl flex items-center justify-center z-40 transition-all hover:scale-110"
        >
          <MessageCircle className="w-6 h-6" />
          {chatMessages.length > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
              {Math.min(chatMessages.length, 9)}
            </span>
          )}
        </button>
      )}
    </div>
  );
};

export default ProductsPage;