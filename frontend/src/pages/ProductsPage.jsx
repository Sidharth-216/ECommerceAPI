import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ShoppingBag, Search, ShoppingCart, MessageCircle, UserCircle, LogOut, Package, X, Send, ChevronLeft, ChevronRight, Sparkles, Zap, Star, TrendingUp, Bot, Mic, Paperclip, ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react';
import { productsAPI } from '/home/sidhu/Desktop/ECommerceAPI/frontend/src/api.js';

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
  if (typeof product.price === 'object' && product.price.$numberDecimal) {
    return parseFloat(product.price.$numberDecimal);
  }
  return parseFloat(product.price) || 0;
};

const getRating = (product) => {
  if (!product?.rating) return null;
  if (typeof product.rating === 'number') return product.rating;
  if (typeof product.rating === 'object' && product.rating.$numberDecimal) {
    return parseFloat(product.rating.$numberDecimal);
  }
  return parseFloat(product.rating) || null;
};

// ─────────────────────────────────────────────────────────────────
// ANIMATED CHAT BOT ICON
// ─────────────────────────────────────────────────────────────────
const ChatBotIcon = ({ hasMessages, messageCount, onClick }) => {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulse(p => !p);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      onClick={onClick}
      className="fixed bottom-8 right-8 z-50 group"
      style={{ filter: 'drop-shadow(0 8px 32px rgba(20,184,166,0.55))' }}
    >
      {/* Outer glow ring */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle, rgba(20,184,166,0.4) 0%, transparent 70%)',
          animation: 'ping 2s cubic-bezier(0,0,0.2,1) infinite',
          borderRadius: '50%',
          width: '64px',
          height: '64px',
        }}
      />
      {/* Button */}
      <div
        className="relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 group-hover:scale-110"
        style={{
          background: 'linear-gradient(135deg, #14b8a6 0%, #0891b2 50%, #22d3ee 100%)',
          boxShadow: '0 0 0 3px rgba(20,184,166,0.35), 0 8px 32px rgba(20,184,166,0.45)',
        }}
      >
        {/* Animated inner ring */}
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: 'conic-gradient(from 0deg, transparent 60%, rgba(255,255,255,0.4) 80%, transparent 100%)',
            animation: 'spin 3s linear infinite',
          }}
        />
        {/* Bot face */}
        <div className="relative z-10 flex flex-col items-center justify-center">
          <Bot className="w-7 h-7 text-white" strokeWidth={1.5} />
        </div>
        {/* Badge */}
        {hasMessages && (
          <span
            className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
            style={{ boxShadow: '0 2px 8px rgba(249,115,22,0.6)' }}
          >
            {Math.min(messageCount, 9)}
          </span>
        )}
        {/* AI label */}
        <span
          className="absolute -top-7 left-1/2 -translate-x-1/2 text-xs font-bold text-cyan-300 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          AI Assistant
        </span>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes ping {
          75%, 100% { transform: scale(1.8); opacity: 0; }
        }
      `}</style>
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────
// CHAT WIDGET
// ─────────────────────────────────────────────────────────────────
const ChatWidget = ({ onClose, products, cart, addToCart, setError }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    setTimeout(() => setAnimateIn(true), 10);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const quickPrompts = [
    { icon: '📱', label: 'Smartphones', query: 'Show me top smartphones' },
    { icon: '💰', label: 'Under ₹5k', query: 'Products under 5000' },
    { icon: '⭐', label: 'Top Rated', query: 'Best rated products' },
    { icon: '🎧', label: 'Audio', query: 'Show audio products' },
  ];

  const sendMessage = async (text) => {
    const userMsg = { role: 'user', content: text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    await new Promise(r => setTimeout(r, 900 + Math.random() * 800));

    let reply = '';
    const lc = text.toLowerCase();
    if (lc.includes('hi') || lc.includes('hello') || lc.includes('hey')) {
      reply = "👋 Hey there! I'm your AI shopping assistant powered by ShopAI.\n\nI can help you:\n• 🔍 Find the perfect products\n• 💸 Discover best deals & offers\n• 🛒 Manage your cart\n• ⭐ Get personalized recommendations\n\nWhat can I help you find today?";
    } else if (lc.includes('smartphone') || lc.includes('phone') || lc.includes('mobile')) {
      const phones = (products || []).filter(p => getCategoryName(p).toLowerCase().includes('phone') || getCategoryName(p).toLowerCase().includes('electronic'));
      reply = `📱 **Smartphones** — ${phones.length} options available!\n\n🏆 Top Pick: Samsung Galaxy S25\n💰 Price: ₹79,999 | ⭐ 4.8/5\n📦 Free delivery by tomorrow\n\n🥈 Also Popular: Pixel 9 Pro — ₹89,999\n\nWant me to filter by budget or features?`;
    } else if (lc.includes('under') || lc.includes('budget') || lc.includes('cheap')) {
      reply = `💰 **Budget Picks** — Amazing deals found!\n\n✅ Under ₹999:\n• USB-C Cables, Phone Cases, Chargers\n\n✅ Under ₹5,000:\n• Wireless Earbuds, Smart Bands, Speakers\n\n✅ Under ₹10,000:\n• Entry Smartphones, Tablets, Cameras\n\nWhich range works for you?`;
    } else if (lc.includes('cart') || lc.includes('show cart')) {
      if (cart.length === 0) {
        reply = "🛒 Your cart is empty right now!\n\nWant me to suggest some trending products? I can find:\n• 🔥 Today's hot deals\n• ⭐ Top-rated items\n• 💎 Premium picks";
      } else {
        const total = cart.reduce((s, i) => s + getPrice(i) * i.quantity, 0);
        reply = `🛒 **Your Cart** — ${cart.length} items\n\n${cart.map(i => `• ${i.name || i.productName} × ${i.quantity} — ₹${getPrice(i).toLocaleString()}`).join('\n')}\n\n💳 **Total: ₹${total.toLocaleString()}**\n\nReady to checkout? I can apply coupon codes too!`;
      }
    } else if (lc.includes('recommend') || lc.includes('suggest') || lc.includes('best')) {
      reply = "✨ **Trending Right Now:**\n\n🥇 Premium Smartphone X1 — ₹9,999\n🥈 Wireless Earbuds Pro — ₹2,499\n🥉 Smart Watch Ultra — ₹4,999\n\n🔥 Flash Sale (ends tonight):\n• Sony WH-1000XM5 — 30% OFF\n• iPad Air — ₹4,000 instant discount\n\nWant details on any of these?";
    } else if (lc.includes('add') && lc.includes('cart')) {
      if (products?.length > 0) {
        addToCart(products[0], setError);
        reply = `✅ Added **${products[0].name}** to your cart!\n\n🛒 Cart: ${cart.length + 1} items\n\nWant to:\n• Continue shopping?\n• View cart?\n• Apply a promo code?`;
      }
    } else if (lc.includes('offer') || lc.includes('deal') || lc.includes('discount') || lc.includes('sale')) {
      reply = "🔥 **Live Deals Today:**\n\n⚡ Flash Sale — Ends in 2:45:30\n• Electronics: Up to 50% OFF\n• Audio: Buy 1 Get 1 Free\n\n🎁 Coupon Codes:\n• SAVE10 — Extra 10% off\n• FIRST50 — 50% on first order\n• TECH200 — ₹200 off on ₹2000+\n\nWhich category interests you?";
    } else if (lc.includes('delivery') || lc.includes('shipping') || lc.includes('track')) {
      reply = "🚚 **Delivery Info:**\n\n• Express: Tomorrow by 10 AM ⚡\n• Standard: 2–4 business days\n• Free shipping on orders ₹999+\n\n📦 Track your order:\nGo to Profile → My Orders → Track\n\nNeed help with a specific order?";
    } else {
      reply = "🤔 I'm not sure about that, but I can definitely help with:\n\n🔍 **Search** — \"Find me a gaming laptop\"\n💰 **Budget** — \"Headphones under ₹2000\"\n🛒 **Cart** — \"Show my cart\"\n⭐ **Picks** — \"Best rated cameras\"\n🏷️ **Deals** — \"Today's offers\"\n\nTry one of the quick prompts below!";
    }

    setMessages(prev => [...prev, {
      role: 'assistant',
      content: reply,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setIsTyping(false);
  };

  return (
    <div
      className="fixed bottom-8 right-8 z-50 w-[400px] rounded-2xl overflow-hidden flex flex-col"
      style={{
        height: '600px',
        boxShadow: '0 32px 80px rgba(0,0,0,0.35), 0 0 0 1px rgba(20,184,166,0.25)',
        transform: animateIn ? 'scale(1) translateY(0)' : 'scale(0.9) translateY(20px)',
        transformOrigin: 'bottom right',
        opacity: animateIn ? 1 : 0,
        transition: 'all 0.35s cubic-bezier(0.34,1.56,0.64,1)',
        background: '#f0fdfa',
      }}
    >
      {/* Header */}
      <div
        className="relative px-5 py-4 flex items-center justify-between shrink-0"
        style={{
          background: 'linear-gradient(135deg, #14b8a6 0%, #0891b2 40%, #22d3ee 100%)',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Animated circuit background */}
        <div className="absolute inset-0 overflow-hidden opacity-15">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full border border-white/50"
              style={{
                width: `${40 + i * 30}px`,
                height: `${40 + i * 30}px`,
                top: `${-10 + i * 5}px`,
                right: `${-10 + i * 5}px`,
                animation: `spin ${3 + i}s linear infinite`,
              }}
            />
          ))}
        </div>

        <div className="flex items-center gap-3 relative z-10">
          {/* Animated avatar */}
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center relative"
            style={{ background: 'rgba(255,255,255,0.35)', backdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)' }}
          >
            <Bot className="w-6 h-6 text-white" strokeWidth={1.5} />
            <span
              className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-teal-600"
              style={{ animation: 'pulse 2s infinite' }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-base">ShopAI Assistant</h3>
              <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">GPT-4</span>
            </div>
            <p className="text-cyan-100 text-xs flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" style={{ animation: 'pulse 2s infinite' }} />
              Online · Typically replies instantly
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 relative z-10">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white">
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <style>{`
          @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          @keyframes fadeSlideUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
          @keyframes typingDot { 0%, 60%, 100% { transform: translateY(0); opacity: 0.4; } 30% { transform: translateY(-4px); opacity: 1; } }
        `}</style>
      </div>

      {/* Messages Area */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-4"
        style={{
          background: 'linear-gradient(180deg, #f0fdfa 0%, #e6fffa 100%)',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(20,184,166,0.35) transparent',
        }}
      >
        {/* Welcome state */}
        {messages.length === 0 && (
          <div className="flex flex-col items-center text-center pt-6 pb-2" style={{ animation: 'fadeSlideUp 0.5s ease both' }}>
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4 relative"
              style={{
                background: 'linear-gradient(135deg, rgba(20,184,166,0.25), rgba(14,116,144,0.3))',
                border: '1px solid rgba(20,184,166,0.35)',
                boxShadow: '0 0 40px rgba(20,184,166,0.2)',
              }}
            >
              <Sparkles className="w-9 h-9 text-cyan-400" />
              <div
                className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-full flex items-center justify-center"
              >
                <Zap className="w-3 h-3 text-white" />
              </div>
            </div>
            <h4 className="text-teal-900 font-bold text-lg mb-1">Hello, Shopper! 👋</h4>
            <p className="text-teal-700 text-sm mb-5 max-w-xs leading-relaxed">
              I'm your AI-powered shopping assistant. Ask me anything about products, deals, or your cart!
            </p>

            {/* Quick prompts */}
            <div className="grid grid-cols-2 gap-2 w-full">
              {quickPrompts.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q.query)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all hover:scale-[1.02] group"
                  style={{
                    background: 'rgba(20,184,166,0.08)',
                    border: '1px solid rgba(20,184,166,0.25)',
                    animation: `fadeSlideUp 0.5s ease ${0.1 * i}s both`,
                  }}
                >
                  <span className="text-lg">{q.icon}</span>
                  <span className="text-teal-700 text-xs font-medium group-hover:text-teal-600 transition-colors">{q.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Messages */}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} gap-2`}
            style={{ animation: 'fadeSlideUp 0.3s ease both' }}
          >
            {msg.role === 'assistant' && (
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-auto"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0891b2)', border: '1px solid rgba(20,184,166,0.45)' }}
              >
                <Bot className="w-4 h-4 text-white" strokeWidth={1.5} />
              </div>
            )}
            <div className="max-w-[78%] flex flex-col gap-1">
              <div
                className="px-4 py-3 rounded-2xl text-sm leading-relaxed"
                style={msg.role === 'user' ? {
                  background: 'linear-gradient(135deg, #14b8a6, #0891b2)',
                  color: 'white',
                  borderRadius: '18px 18px 4px 18px',
                  boxShadow: '0 4px 16px rgba(20,184,166,0.3)',
                } : {
                  background: 'rgba(20,184,166,0.08)',
                  border: '1px solid rgba(20,184,166,0.2)',
                  color: '#0f172a',
                  borderRadius: '4px 18px 18px 18px',
                  whiteSpace: 'pre-line',
                }}
              >
                {msg.content}
              </div>
              <div className="flex items-center gap-2 px-1">
                <span className="text-[10px] text-slate-600">{msg.time}</span>
                {msg.role === 'assistant' && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="text-slate-600 hover:text-green-400 transition-colors">
                      <ThumbsUp className="w-3 h-3" />
                    </button>
                    <button className="text-slate-600 hover:text-red-400 transition-colors">
                      <ThumbsDown className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {isTyping && (
          <div className="flex items-end gap-2" style={{ animation: 'fadeSlideUp 0.3s ease both' }}>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0891b2)' }}
            >
              <Bot className="w-4 h-4 text-white" strokeWidth={1.5} />
            </div>
            <div
              className="px-4 py-3 rounded-2xl flex items-center gap-1"
              style={{
                background: 'rgba(20,184,166,0.08)',
                border: '1px solid rgba(20,184,166,0.2)',
                borderRadius: '4px 18px 18px 18px',
              }}
            >
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-2 h-2 bg-cyan-400 rounded-full"
                  style={{ animation: `typingDot 1.2s ease ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div
        className="px-4 py-3 shrink-0"
        style={{
          background: 'rgba(240,253,250,0.97)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Suggestion chips */}
        {messages.length > 0 && messages.length < 3 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
            {['Best deals today 🔥', 'Track my order 📦', 'Apply coupon 🏷️'].map((chip, i) => (
              <button
                key={i}
                onClick={() => sendMessage(chip.replace(/[^\w\s]/g, '').trim())}
                className="shrink-0 text-xs px-3 py-1.5 rounded-full transition-all hover:scale-105"
                style={{
                  background: 'rgba(20,184,166,0.12)',
                  border: '1px solid rgba(20,184,166,0.3)',
                  color: '#0f766e',
                  whiteSpace: 'nowrap',
                }}
              >
                {chip}
              </button>
            ))}
          </div>
        )}

        <div
          className="flex items-end gap-2 p-2 rounded-2xl"
          style={{
            background: 'rgba(20,184,166,0.05)',
            border: '1px solid rgba(20,184,166,0.25)',
          }}
        >
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (input.trim() && !isTyping) sendMessage(input.trim());
              }
            }}
            placeholder="Ask me anything..."
            rows={1}
            disabled={isTyping}
            className="flex-1 bg-transparent text-slate-800 placeholder-slate-400 text-sm resize-none focus:outline-none leading-5 py-1 px-1 max-h-28"
            style={{ scrollbarWidth: 'none' }}
          />
          <div className="flex items-center gap-1">
            <button className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-500 hover:text-cyan-400 transition-colors">
              <Mic className="w-4 h-4" />
            </button>
            <button
              onClick={() => { if (input.trim() && !isTyping) sendMessage(input.trim()); }}
              disabled={!input.trim() || isTyping}
              className="w-9 h-9 flex items-center justify-center rounded-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105"
              style={{
                background: input.trim() ? 'linear-gradient(135deg, #14b8a6, #0891b2)' : 'rgba(20,184,166,0.05)',
                boxShadow: input.trim() ? '0 4px 16px rgba(20,184,166,0.45)' : 'none',
              }}
            >
              <Send className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
        <p className="text-center text-[10px] text-slate-600 mt-2">Powered by ShopAI · Responses may not be 100% accurate</p>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// PRODUCT CARD with hover animations
// ─────────────────────────────────────────────────────────────────
const ProductCard = ({ product, index, addToCart, setError }) => {
  const [hovered, setHovered] = useState(false);
  const [addedAnim, setAddedAnim] = useState(false);
  const price = getPrice(product);
  const rating = getRating(product);
  const category = getCategoryName(product);
  const productId = product.id || product._id?.$oid || product._id || index;

  const handleAdd = () => {
    addToCart(product, setError);
    setAddedAnim(true);
    setTimeout(() => setAddedAnim(false), 1200);
  };

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="bg-white rounded-2xl overflow-hidden flex flex-col"
      style={{
        boxShadow: hovered
          ? '0 20px 60px rgba(20,184,166,0.2), 0 4px 20px rgba(0,0,0,0.1)'
          : '0 2px 12px rgba(0,0,0,0.06)',
        transform: hovered ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        border: hovered ? '1px solid rgba(20,184,166,0.35)' : '1px solid rgba(226,232,240,1)',
      }}
    >
      {/* Image */}
      <div className="relative overflow-hidden bg-slate-50" style={{ paddingBottom: '100%' }}>
        <img
          src={product.imageUrl || `https://via.placeholder.com/300x300/f0fdff/0e7490?text=${encodeURIComponent(product.name?.slice(0, 8) || 'Product')}`}
          alt={product.name}
          className="absolute inset-0 w-full h-full object-contain p-3"
          style={{
            transform: hovered ? 'scale(1.07)' : 'scale(1)',
            transition: 'transform 0.4s ease',
          }}
          onError={e => { e.currentTarget.src = 'https://via.placeholder.com/300x300/f0fdff/0e7490?text=Product'; }}
        />

        {/* Badges */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5">
          <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg, #e55a1c, #f97316)' }}>
            -20%
          </span>
          {product.stockQuantity !== undefined && product.stockQuantity <= 5 && product.stockQuantity > 0 && (
            <span className="text-xs font-semibold text-white px-2 py-0.5 rounded-full bg-amber-500">
              Only {product.stockQuantity} left
            </span>
          )}
        </div>

        {/* Semantic score */}
        {product.score && (
          <div className="absolute top-2.5 right-2.5 text-xs font-bold text-white px-2 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg, #14b8a6, #0891b2)' }}>
            {Math.round(product.score * 100)}% match
          </div>
        )}

        {/* Hover overlay actions */}
        <div
          className="absolute inset-0 flex items-center justify-center gap-3"
          style={{
            background: 'rgba(15,23,42,0.45)',
            opacity: hovered ? 1 : 0,
            transition: 'opacity 0.25s ease',
            backdropFilter: hovered ? 'blur(2px)' : 'blur(0px)',
          }}
        >
          <button
            onClick={() => alert(`${product.name}\n\n₹${price.toLocaleString()}\n${product.description || ''}`)}
            className="px-4 py-2 bg-white text-slate-900 text-xs font-bold rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            Quick View
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="p-4 flex flex-col flex-1">
        <p className="text-xs text-cyan-600 font-semibold mb-1">{product.brand || category}</p>
        <h3 className="text-sm font-semibold text-slate-800 mb-2 line-clamp-2 leading-snug">{product.name}</h3>

        {/* Stars */}
        {rating && (
          <div className="flex items-center gap-1.5 mb-2.5">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-3 h-3"
                  fill={i < Math.floor(rating) ? '#f59e0b' : 'none'}
                  stroke={i < Math.floor(rating) ? '#f59e0b' : '#d1d5db'}
                />
              ))}
            </div>
            <span className="text-xs text-slate-500">({product.reviewCount || 0})</span>
          </div>
        )}

        {/* Price */}
        <div className="mb-3 mt-auto">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-extrabold text-slate-900">₹{price.toLocaleString()}</span>
          </div>
          <span className="text-xs text-slate-500 line-through">₹{(price * 1.2).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          <span className="text-xs text-green-600 font-semibold ml-2">Save ₹{(price * 0.2).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
        </div>

        {/* Add to cart */}
        <button
          onClick={handleAdd}
          disabled={product.stockQuantity === 0}
          className="w-full py-2.5 text-sm font-bold rounded-xl transition-all relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: addedAnim
              ? 'linear-gradient(135deg, #059669, #10b981)'
              : 'linear-gradient(135deg, #14b8a6, #0891b2)',
            color: 'white',
            boxShadow: hovered && !addedAnim ? '0 6px 20px rgba(20,184,166,0.45)' : 'none',
            transform: addedAnim ? 'scale(0.97)' : 'scale(1)',
          }}
        >
          {product.stockQuantity === 0 ? 'Out of Stock' : addedAnim ? '✓ Added!' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────
const ProductsPage = ({
  user, products, cart, searchQuery, setSearchQuery, setCurrentPage,
  handleLogout, addToCart, error, setError
}) => {
  const [chatOpen, setChatOpen] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [semanticSuggestions, setSemanticSuggestions] = useState([]);
  const [semanticResults, setSemanticResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSemanticMode, setIsSemanticMode] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const debounceTimer = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentBanner(p => (p + 1) % 3), 5000);
    return () => clearInterval(timer);
  }, []);

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
        const response = await productsAPI.search(query, 6);
        const results = response?.data?.results || [];
        setSemanticSuggestions(results);
        setShowSuggestions(results.length > 0);
      } catch {
        setSemanticSuggestions([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [searchQuery]);

  const handleFullSearch = useCallback(async (queryOverride) => {
    const query = (queryOverride || searchQuery).trim();
    if (!query) return;
    setShowSuggestions(false);
    setSearchLoading(true);
    setIsSemanticMode(true);
    try {
      const response = await productsAPI.search(query, 20);
      setSemanticResults(response?.data?.results || []);
    } catch {
      setSemanticResults([]);
      setError('Search failed. Showing all products instead.');
      setIsSemanticMode(false);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery]);

  const displayedProducts = isSemanticMode ? semanticResults : (products || []);
  const uniqueCategories = Array.from(new Set((products || []).map(p => getCategoryName(p)).filter(Boolean))).slice(0, 20);

  const applyCategory = async (cat) => {
    if (!cat) { setSearchQuery(''); setIsSemanticMode(false); setSemanticResults([]); return; }
    setSearchQuery(cat);
    await handleFullSearch(cat);
  };

  const banners = [
    {
      title: "Summer Sale 2026",
      sub: "Up to 50% OFF on Electronics",
      desc: "Free shipping on orders above ₹999",
      gradient: "linear-gradient(135deg, #0f766e 0%, #14b8a6 40%, #0891b2 80%, #22d3ee 100%)",
      accent: "#67e8f9",
      tag: "🔥 LIMITED TIME",
    },
    {
      title: "New Arrivals",
      sub: "Latest Smartphones & Gadgets",
      desc: "Shop the newest tech at best prices",
      gradient: "linear-gradient(135deg, #4c1d95 0%, #7c3aed 40%, #a855f7 80%, #d946ef 100%)",
      accent: "#d946ef",
      tag: "✨ JUST IN",
    },
    {
      title: "Special Offer",
      sub: "Buy 2 Get 1 Free",
      desc: "On selected audio & wearables",
      gradient: "linear-gradient(135deg, #7c2d12 0%, #c2410c 40%, #f97316 80%, #fbbf24 100%)",
      accent: "#fbbf24",
      tag: "🎁 EXCLUSIVE",
    },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#f8fafc', fontFamily: "'Outfit', 'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />

      {/* ── HEADER ── */}
      <header
        className="sticky top-0 z-40 transition-all duration-300"
        style={{
          background: scrolled
            ? 'rgba(7,35,55,0.97)'
            : 'linear-gradient(180deg, #0f2d2b 0%, #134e4a 100%)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(20,184,166,0.2)',
          boxShadow: scrolled ? '0 4px 30px rgba(0,0,0,0.3)' : 'none',
        }}
      >
        <div className="max-w-[1600px] mx-auto px-5 py-3 flex items-center gap-5">
          {/* Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer shrink-0">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0891b2)', boxShadow: '0 4px 16px rgba(20,184,166,0.45)' }}
            >
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="text-white font-extrabold text-lg leading-none">ShopAI</div>
              <div className="text-cyan-400 text-[10px] font-medium">.marketplace</div>
            </div>
          </div>

          {/* Category select */}
          <select
            className="hidden md:block bg-white/10 text-white text-sm px-3 py-2.5 rounded-xl border border-white/10 focus:outline-none focus:border-cyan-400/50 shrink-0"
            style={{ maxWidth: '140px' }}
            onChange={(e) => applyCategory(e.target.value)}
          >
            <option value="" style={{ color: '#0f172a' }}>All Categories</option>
            {uniqueCategories.map((cat, i) => (
              <option key={i} value={cat} style={{ color: '#0f172a' }}>{cat}</option>
            ))}
          </select>

          {/* Search */}
          <div className="flex-1 max-w-2xl relative">
            <div
              className="flex items-center rounded-xl overflow-hidden transition-all"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(20,184,166,0.35)',
                boxShadow: '0 0 0 0 rgba(6,182,212,0)',
              }}
            >
              <Search className="w-4 h-4 text-cyan-400 ml-4 shrink-0" />
              <input
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
                placeholder="Search with AI — try 'wireless earbuds under ₹2000'..."
                className="flex-1 bg-transparent text-white placeholder-slate-400 px-3 py-3 text-sm focus:outline-none"
              />
              {searchLoading ? (
                <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mr-3" />
              ) : (
                <button
                  onClick={() => handleFullSearch()}
                  className="px-4 py-3 text-white text-sm font-semibold transition-all hover:bg-cyan-500/20 flex items-center gap-1.5"
                  style={{ borderLeft: '1px solid rgba(20,184,166,0.25)' }}
                >
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span className="text-white hidden lg:block">AI Search</span>
                </button>
              )}
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && semanticSuggestions.length > 0 && (
              <div
                className="absolute top-full left-0 right-0 mt-2 rounded-2xl overflow-hidden z-50"
                style={{
                  background: 'rgba(15,118,110,0.97)',
                  border: '1px solid rgba(20,184,166,0.3)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: '1px solid rgba(20,184,166,0.2)' }}>
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-xs font-semibold text-cyan-400">AI Suggestions</span>
                </div>
                {semanticSuggestions.map((item, idx) => (
                  <div
                    key={item.id || item._id || idx}
                    onMouseDown={() => { setSearchQuery(item.name); setShowSuggestions(false); handleFullSearch(item.name); }}
                    className="px-4 py-3 cursor-pointer flex items-center justify-between gap-4 transition-all"
                    style={{ borderBottom: idx < semanticSuggestions.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(20,184,166,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white font-medium truncate">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.brand || getCategoryName(item)}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-bold text-cyan-400">₹{getPrice(item).toLocaleString()}</p>
                      {item.score && <p className="text-[10px] text-slate-600">{Math.round(item.score * 100)}% match</p>}
                    </div>
                  </div>
                ))}
                <div
                  onMouseDown={() => { setShowSuggestions(false); handleFullSearch(); }}
                  className="px-4 py-2.5 text-center text-sm text-cyan-400 font-semibold cursor-pointer transition-all"
                  style={{ borderTop: '1px solid rgba(20,184,166,0.2)' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(20,184,166,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  See all results for "{searchQuery}" →
                </div>
              </div>
            )}
          </div>

          {/* Right */}
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={() => setCurrentPage('profile')} className="flex items-center gap-2 text-white hover:text-cyan-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-white/5">
              <UserCircle className="w-6 h-6" />
              <span className="hidden lg:block text-sm font-medium">{user?.name?.split(' ')[0] || 'User'}</span>
            </button>
            <button
              onClick={() => setCurrentPage('cart')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl relative transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #14b8a6, #0891b2)', boxShadow: '0 4px 16px rgba(20,184,166,0.4)' }}
            >
              <ShoppingCart className="w-5 h-5 text-white" />
              <span className="text-white text-sm font-bold hidden lg:block">Cart</span>
              {cart.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-orange-500 text-white text-xs font-bold rounded-full flex items-center justify-center shadow-lg">
                  {cart.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Nav bar */}
        <div
          className="overflow-x-auto"
          style={{ background: 'rgba(0,0,0,0.2)', borderTop: '1px solid rgba(255,255,255,0.04)' }}
        >
          <div className="max-w-[1600px] mx-auto px-5 py-2 flex items-center gap-1">
            <button
              onClick={() => applyCategory('')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all text-slate-300 hover:text-white hover:bg-white/10 whitespace-nowrap"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              All Products
            </button>
            {uniqueCategories.slice(0, 9).map((cat, i) => (
              <button
                key={i}
                onClick={() => applyCategory(cat)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap"
                style={{
                  color: searchQuery === cat ? 'white' : '#94a3b8',
                  background: searchQuery === cat ? 'rgba(20,184,166,0.25)' : 'transparent',
                  border: searchQuery === cat ? '1px solid rgba(20,184,166,0.4)' : '1px solid transparent',
                }}
              >
                {cat}
              </button>
            ))}
            <div className="flex-1" />
            <button onClick={() => setChatOpen(c => !c)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-cyan-400 hover:bg-cyan-400/10 transition-all whitespace-nowrap">
              <Bot className="w-3.5 h-3.5" />
              AI Help
            </button>
            <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-white hover:bg-white/10 transition-all whitespace-nowrap">
              <LogOut className="w-3.5 h-3.5" />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Mobile search */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3">
        <div className="flex items-center gap-2 bg-slate-100 rounded-xl px-3 py-2.5">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); if (!e.target.value.trim()) { setIsSemanticMode(false); setSemanticResults([]); } }}
            onKeyDown={e => e.key === 'Enter' && handleFullSearch()}
            placeholder="AI-powered search..."
            className="flex-1 bg-transparent text-sm focus:outline-none text-slate-700"
          />
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4 md:px-5">
        {error && (
          <div className="mt-4 bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-r-xl text-sm font-medium">
            {error}
          </div>
        )}

        {/* ── Hero Banner ── */}
        <div className="relative mt-5 mb-6 rounded-2xl overflow-hidden" style={{ height: '360px' }}>
          {banners.map((banner, idx) => (
            <div
              key={idx}
              className="absolute inset-0 transition-all duration-700"
              style={{
                background: banner.gradient,
                opacity: currentBanner === idx ? 1 : 0,
                transform: currentBanner === idx ? 'scale(1)' : 'scale(1.02)',
              }}
            >
              {/* Decorative circles */}
              <div className="absolute right-0 top-0 w-96 h-96 rounded-full opacity-20" style={{ background: banner.accent, transform: 'translate(30%, -30%)', filter: 'blur(60px)' }} />
              <div className="absolute right-40 bottom-0 w-64 h-64 rounded-full opacity-15" style={{ background: banner.accent, transform: 'translate(0, 40%)', filter: 'blur(40px)' }} />

              {/* Geometric grid */}
              <div className="absolute inset-0 opacity-5" style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
              }} />

              <div className="relative h-full flex flex-col justify-center px-10 md:px-16 max-w-xl">
                <span className="inline-flex items-center gap-2 text-xs font-bold px-3 py-1 rounded-full mb-4 w-fit" style={{ background: 'rgba(255,255,255,0.35)', color: banner.accent, border: `1px solid ${banner.accent}40` }}>
                  {banner.tag}
                </span>
                <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-2 leading-tight">{banner.title}</h2>
                <p className="text-xl font-semibold mb-1" style={{ color: banner.accent }}>{banner.sub}</p>
                <p className="text-white/75 text-sm mb-7">{banner.desc}</p>
                <button
                  onClick={() => { setSearchQuery(''); setIsSemanticMode(false); setSemanticResults([]); }}
                  className="w-fit flex items-center gap-2 px-7 py-3 bg-white font-bold text-sm rounded-xl transition-all hover:shadow-2xl hover:scale-105"
                  style={{ color: '#14b8a6' }}
                >
                  Shop Now <span>→</span>
                </button>
              </div>
            </div>
          ))}

          {/* Controls */}
          <button
            onClick={() => setCurrentBanner(p => (p - 1 + 3) % 3)}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-sm transition-all border border-white/20"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={() => setCurrentBanner(p => (p + 1) % 3)}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-sm transition-all border border-white/20"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentBanner(i)}
                className="rounded-full transition-all"
                style={{
                  width: currentBanner === i ? '28px' : '8px',
                  height: '8px',
                  background: currentBanner === i ? 'white' : 'rgba(255,255,255,0.4)',
                }}
              />
            ))}
          </div>
        </div>

        {/* ── Category Cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { title: 'Trending Electronics', subs: ['Smartphones', 'Laptops', 'Tablets', 'Accessories'], cat: 'Electronics', gradient: 'from-cyan-50 to-teal-50', accent: '#14b8a6' },
            { title: 'Audio & Wearables', subs: ['Headphones', 'Smart Watches', 'Earbuds', 'Speakers'], cat: 'Audio', gradient: 'from-purple-50 to-violet-50', accent: '#7c3aed' },
            { title: 'Home Appliances', subs: ['Air Purifiers', 'Vacuum', 'Microwaves', 'Washers'], cat: 'Appliances', gradient: 'from-orange-50 to-amber-50', accent: '#c2410c' },
            { title: 'Deals Under ₹999', subs: ['Cables', 'Cases', 'Chargers', 'More'], cat: '', gradient: 'from-green-50 to-emerald-50', accent: '#059669' },
          ].map((card, i) => (
            <div
              key={i}
              onClick={() => applyCategory(card.cat)}
              className={`bg-gradient-to-br ${card.gradient} p-5 rounded-2xl cursor-pointer transition-all hover:shadow-lg hover:-translate-y-1 border border-white`}
            >
              <h3 className="text-sm font-bold text-slate-900 mb-3">{card.title}</h3>
              <div className="grid grid-cols-2 gap-1.5 mb-3">
                {card.subs.map(sub => (
                  <div key={sub} className="bg-white/60 rounded-lg px-2 py-1.5">
                    <p className="text-xs text-slate-600 font-medium">{sub}</p>
                  </div>
                ))}
              </div>
              <span className="text-xs font-semibold" style={{ color: card.accent }}>Explore →</span>
            </div>
          ))}
        </div>

        {/* ── Filter Bar ── */}
        <div className="bg-white rounded-2xl px-5 py-3.5 mb-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold text-slate-600">Sort by:</span>
            <select className="text-sm border border-slate-200 rounded-xl px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-cyan-400 text-slate-700">
              <option>Featured</option>
              <option>Price: Low to High</option>
              <option>Price: High to Low</option>
              <option>Top Rated</option>
              <option>Newest First</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            {isSemanticMode && (
              <span className="text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5" style={{ background: 'rgba(20,184,166,0.12)', color: '#14b8a6', border: '1px solid rgba(20,184,166,0.3)' }}>
                <Sparkles className="w-3 h-3" />
                AI Results for "{searchQuery}"
              </span>
            )}
            {isSemanticMode && (
              <button
                onClick={() => { setSearchQuery(''); setIsSemanticMode(false); setSemanticResults([]); }}
                className="text-xs text-slate-500 hover:text-slate-600 flex items-center gap-1 transition-colors"
              >
                <X className="w-3 h-3" /> Clear
              </button>
            )}
            <span className="text-sm text-slate-500">
              <span className="font-bold text-slate-900">{displayedProducts.length}</span> products
            </span>
          </div>
        </div>

        {/* ── Products Grid ── */}
        <div className="pb-12">
          {searchLoading && isSemanticMode ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 animate-pulse">
                  <div className="aspect-square bg-slate-100 rounded-xl mb-3" />
                  <div className="h-3 bg-slate-100 rounded mb-2" />
                  <div className="h-3 bg-slate-100 rounded w-2/3 mb-3" />
                  <div className="h-8 bg-slate-100 rounded-xl" />
                </div>
              ))}
            </div>
          ) : displayedProducts.length === 0 ? (
            <div className="bg-white rounded-2xl p-16 text-center shadow-sm border border-slate-100">
              <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Search className="w-9 h-9 text-slate-300" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No products found</h3>
              <p className="text-slate-500 text-sm mb-7">
                {isSemanticMode ? `No matches for "${searchQuery}". Try different keywords.` : 'Try searching something'}
              </p>
              <button
                onClick={() => { setSearchQuery(''); setIsSemanticMode(false); setSemanticResults([]); }}
                className="px-6 py-2.5 text-white text-sm font-bold rounded-xl transition-all hover:scale-105"
                style={{ background: 'linear-gradient(135deg, #14b8a6, #0891b2)', boxShadow: '0 4px 16px rgba(20,184,166,0.45)' }}
              >
                View All Products
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {displayedProducts.map((product, index) => (
                <ProductCard
                  key={product.id || product._id?.$oid || product._id || index}
                  product={product}
                  index={index}
                  addToCart={addToCart}
                  setError={setError}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Chat widget or floating button */}
      {chatOpen ? (
        <ChatWidget
          onClose={() => setChatOpen(false)}
          products={products}
          cart={cart}
          addToCart={addToCart}
          setError={setError}
        />
      ) : (
        <ChatBotIcon
          hasMessages={false}
          messageCount={0}
          onClick={() => setChatOpen(true)}
        />
      )}
    </div>
  );
};

export default ProductsPage;