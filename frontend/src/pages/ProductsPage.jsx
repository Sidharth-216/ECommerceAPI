import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ShoppingBag, Search, ShoppingCart,
  UserCircle, LogOut, Package, X, Send,
  ChevronLeft, ChevronRight, Sparkles, Bot, Loader2,
  Star, Zap, Eye, Shield, Truck, RotateCcw,
  ArrowRight, Tag, Filter, Grid, List,
  CheckCircle, Award, Clock, Percent, MessageSquare
} from 'lucide-react';
import { productsAPI } from '../api.js';

const AI_AGENT_URL = process.env.REACT_APP_AI_AGENT_URL || 'http://localhost:7860';

// ─── HELPERS ───────────────────────────────────────────────────────
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
const getProductId = (product) =>
  product?.id || product?._id?.$oid || product?._id || product?.Id || null;

// ─── AI CHAT ───────────────────────────────────────────────────────
const callAIAgent = async (message, history, userId) => {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token') || '';
  const res = await fetch(`${AI_AGENT_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message, userId,
      history: history.map(m => ({ role: m.role, content: m.content })),
      jwt_token: token,
    }),
  });
  if (!res.ok) throw new Error(`Agent error: ${res.status}`);
  return res.json();
};

const QUICK_CHIPS = [
  { label: '📱 Best smartphones', msg: 'Show me the best smartphones' },
  { label: '🎧 Headphones under ₹5000', msg: 'Find headphones under ₹5000' },
  { label: '🛒 My cart', msg: 'Show my cart' },
  { label: '📦 My orders', msg: 'Show my order history' },
  { label: '🔥 Trending now', msg: 'What are trending products?' },
  { label: '💻 Gaming laptops', msg: 'Recommend gaming laptops' },
];

// ─── GLOBAL CSS ────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
  * { box-sizing: border-box; }
  @keyframes fadeInUp   { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
  @keyframes scaleIn    { from { opacity:0; transform:scale(0.93) }       to { opacity:1; transform:scale(1) } }
  @keyframes slideRight { from { opacity:0; transform:translateX(-14px) } to { opacity:1; transform:translateX(0) } }
  @keyframes spinAnim   { to { transform:rotate(360deg) } }
  @keyframes shimmerBg  { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes floatImg   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  @keyframes dotPulse1  { 0%,80%,100%{transform:scale(0);opacity:.3} 40%{transform:scale(1);opacity:1} }
  @keyframes dotPulse2  { 0%,20%,80%,100%{transform:scale(0);opacity:.3} 50%{transform:scale(1);opacity:1} }
  @keyframes dotPulse3  { 0%,40%,80%,100%{transform:scale(0);opacity:.3} 60%{transform:scale(1);opacity:1} }
  @keyframes pulseRing  { 0%,100%{box-shadow:0 0 0 0 rgba(56,189,248,.4)} 60%{box-shadow:0 0 0 10px rgba(56,189,248,0)} }
  @keyframes chatOpen   { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
  @keyframes bounceIn   { 0%{transform:scale(.8);opacity:0} 60%{transform:scale(1.05)} 100%{transform:scale(1);opacity:1} }
  @keyframes slideInMsg { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
  .card-in   { animation: fadeInUp .35s ease both; }
  .msg-in    { animation: slideInMsg .25s ease both; }
  .spin      { animation: spinAnim 1s linear infinite !important; }
  ::-webkit-scrollbar { width:5px; height:5px; }
  ::-webkit-scrollbar-track { background:#f0fdfa; border-radius:8px; }
  ::-webkit-scrollbar-thumb { background:#99f6e4; border-radius:8px; }
  ::-webkit-scrollbar-thumb:hover { background:#5eead4; }
`;

// ─── CHAT PRODUCT CARD ─────────────────────────────────────────────
const ChatProductCard = ({ product, onAddToCart }) => {
  const price = typeof product.price === 'number' ? product.price : parseFloat(product.price || 0);
  const [hov, setHov] = useState(false);
  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: 'white', border: `1.5px solid ${hov ? '#5eead4' : '#ccfbf1'}`, borderRadius: 16, padding: 12, display: 'flex', gap: 10, minWidth: 210, maxWidth: 230, boxShadow: hov ? '0 8px 24px rgba(13,148,136,.15)' : '0 2px 10px rgba(13,148,136,.07)', transition: 'all .2s', flexShrink: 0, transform: hov ? 'translateY(-2px)' : 'none' }}>
      <img src={product.imageUrl || 'https://via.placeholder.com/60/ccfbf1/0d9488?text=P'} alt={product.name}
        style={{ width: 52, height: 52, objectFit: 'contain', borderRadius: 10, background: '#f0fdfa', flexShrink: 0 }}
        onError={e => { e.currentTarget.src = 'https://via.placeholder.com/60/ccfbf1/0d9488?text=P'; }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#064e3b', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: '0 0 4px' }}>{product.name}</p>
        <p style={{ fontSize: 14, fontWeight: 900, color: '#0d9488', margin: '0 0 7px' }}>₹{price.toLocaleString()}</p>
        <button onClick={() => onAddToCart(product)} disabled={product.stockQuantity === 0}
          style={{ width: '100%', fontSize: 11, background: product.stockQuantity === 0 ? '#f1f5f9' : 'linear-gradient(135deg,#2dd4bf,#0d9488)', color: product.stockQuantity === 0 ? '#94a3b8' : 'white', border: 'none', padding: '6px 0', borderRadius: 8, cursor: product.stockQuantity === 0 ? 'not-allowed' : 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>
          {product.stockQuantity === 0 ? 'Out of stock' : '+ Add to cart'}
        </button>
      </div>
    </div>
  );
};

// ─── PRODUCT DETAIL MODAL ──────────────────────────────────────────
const ProductDetailModal = ({ product, onClose, onAddToCart, setError }) => {
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState('overview');
  const [imgLoaded, setImgLoaded] = useState(false);
  const price = getPrice(product);
  const rating = getRating(product);
  const category = getCategoryName(product);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(186,230,253,0.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, backdropFilter: 'blur(8px)', animation: 'chatOpen .25s ease' }}>
      <style>{`
        .mtab { padding:8px 18px; border-radius:20px; font-size:13px; font-weight:700; cursor:pointer; border:none; transition:all .2s; font-family:inherit; }
        .mtab.on { background:linear-gradient(135deg,#2dd4bf,#0d9488); color:white; box-shadow:0 4px 14px rgba(13,148,136,.3); }
        .mtab:not(.on) { background:#f0fdfa; color:#0d9488; }
        .mtab:not(.on):hover { background:#ccfbf1; }
        .qbtn { width:34px; height:34px; border-radius:50%; border:2px solid #5eead4; background:white; color:#0d9488; font-size:20px; font-weight:800; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all .15s; font-family:inherit; line-height:1; }
        .qbtn:hover { background:linear-gradient(135deg,#2dd4bf,#0d9488); color:white; border-color:transparent; }
      `}</style>

      <div style={{ background: 'white', borderRadius: 28, width: '100%', maxWidth: 880, maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', animation: 'scaleIn .3s cubic-bezier(.34,1.56,.64,1)', boxShadow: '0 32px 80px rgba(13,148,136,.2), 0 0 0 1px #99f6e4' }}>

        {/* Header */}
        <div style={{ padding: '14px 24px', borderBottom: '1px solid #ccfbf1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg,#f0fdfa,#ccfbf1)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 12, background: 'linear-gradient(135deg,#2dd4bf,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(13,148,136,.3)' }}><Package size={18} color="white" /></div>
            <div>
              <p style={{ fontSize: 10, color: '#2dd4bf', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: 1 }}>{category}</p>
              <p style={{ fontSize: 14, color: '#064e3b', fontWeight: 900, margin: 0 }}>Product Details</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: '50%', border: 'none', background: '#fef2f2', color: '#ef4444', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', display: 'flex' }}>
          {/* Left – image panel */}
          <div style={{ width: 300, flexShrink: 0, background: 'linear-gradient(160deg,#f0fdfa,#ccfbf1 60%,#99f6e4)', padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: -50, right: -50, width: 180, height: 180, borderRadius: '50%', background: 'rgba(56,189,248,.1)' }} />
            <div style={{ position: 'relative', width: 210, height: 210, background: 'white', borderRadius: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 12px 40px rgba(13,148,136,.15)', animation: 'floatImg 4s ease-in-out infinite' }}>
              {!imgLoaded && <div style={{ position: 'absolute', inset: 0, borderRadius: 24, background: 'linear-gradient(90deg,#ccfbf1 25%,#f0fdfa 50%,#ccfbf1 75%)', backgroundSize: '200% 100%', animation: 'shimmerBg 1.5s infinite' }} />}
              <img src={product.imageUrl || 'https://via.placeholder.com/280/ccfbf1/0d9488?text=Product'} alt={product.name}
                style={{ width: 170, height: 170, objectFit: 'contain', opacity: imgLoaded ? 1 : 0, transition: 'opacity .4s' }}
                onLoad={() => setImgLoaded(true)} onError={e => { e.currentTarget.src = 'https://via.placeholder.com/280/ccfbf1/0d9488?text=Product'; setImgLoaded(true); }} />
            </div>
            {product.stockQuantity > 0 && product.stockQuantity <= 5 && (
              <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Clock size={13} color="#ea580c" /><span style={{ fontSize: 12, color: '#c2410c', fontWeight: 700 }}>Only {product.stockQuantity} left!</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', justifyContent: 'center' }}>
              {[{ icon: <Shield size={12} />, text: '1yr warranty' }, { icon: <Truck size={12} />, text: 'Free ship' }, { icon: <RotateCcw size={12} />, text: '7-day return' }].map((b, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'white', padding: '6px 10px', borderRadius: 20, fontSize: 11, color: '#0d9488', fontWeight: 700, boxShadow: '0 2px 8px rgba(13,148,136,.1)', border: '1px solid #99f6e4' }}>
                  <span style={{ color: '#2dd4bf' }}>{b.icon}</span>{b.text}
                </div>
              ))}
            </div>
          </div>

          {/* Right – info */}
          <div style={{ flex: 1, padding: '24px 28px', overflowY: 'auto' }}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 7, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ background: 'linear-gradient(135deg,#2dd4bf,#0d9488)', color: 'white', fontSize: 11, fontWeight: 800, padding: '3px 12px', borderRadius: 20 }}>{category}</span>
                {product.brand && <span style={{ background: '#f0fdfa', color: '#0d9488', fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 20 }}>{product.brand}</span>}
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: '#064e3b', margin: '0 0 10px', lineHeight: 1.3 }}>{product.name}</h2>
              {rating && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 2 }}>{[...Array(5)].map((_, i) => <Star key={i} size={14} style={{ color: i < Math.floor(rating) ? '#f59e0b' : '#e2e8f0', fill: i < Math.floor(rating) ? '#f59e0b' : '#e2e8f0' }} />)}</div>
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#f59e0b' }}>{rating.toFixed(1)}</span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>({product.reviewCount || 0})</span>
                </div>
              )}
            </div>

            <div style={{ background: 'linear-gradient(135deg,#f0fdfa,#ccfbf1)', borderRadius: 16, padding: '14px 18px', marginBottom: 18, border: '1px solid #99f6e4' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 30, fontWeight: 900, color: '#0d9488', letterSpacing: -1 }}>₹{price.toLocaleString()}</span>
                <span style={{ fontSize: 15, color: '#94a3b8', textDecoration: 'line-through' }}>₹{(price * 1.2).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                <span style={{ background: '#fef3c7', color: '#d97706', fontSize: 12, fontWeight: 800, padding: '3px 9px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 3 }}><Percent size={11} />20% OFF</span>
              </div>
              <p style={{ fontSize: 12, color: '#2dd4bf', fontWeight: 700, margin: '5px 0 0' }}>✓ Inclusive of all taxes</p>
            </div>

            <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
              {['overview', 'specs', 'shipping'].map(t => (
                <button key={t} className={`mtab ${tab === t ? 'on' : ''}`} onClick={() => setTab(t)}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            <div style={{ marginBottom: 22, minHeight: 90 }}>
              {tab === 'overview' && (
                <div>
                  <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.7, margin: '0 0 14px' }}>{product.description || `Experience the best of ${product.name}. Crafted for performance, comfort, and style.`}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9 }}>
                    {[{ icon: <CheckCircle size={13} />, t: 'Premium quality' }, { icon: <Award size={13} />, t: 'Brand certified' }, { icon: <Shield size={13} />, t: '1 year warranty' }, { icon: <Zap size={13} />, t: 'Fast delivery' }].map((f, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: '#f0fdfa', borderRadius: 12, border: '1px solid #99f6e4' }}>
                        <span style={{ color: '#2dd4bf' }}>{f.icon}</span>
                        <span style={{ fontSize: 12, color: '#064e3b', fontWeight: 700 }}>{f.t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {tab === 'specs' && (
                <div>{[{ label: 'Brand', value: product.brand || 'N/A' }, { label: 'Category', value: category }, { label: 'Stock', value: product.stockQuantity > 0 ? `${product.stockQuantity} units` : 'Out of stock' }, { label: 'SKU', value: getProductId(product) || 'N/A' }].map((s, i, arr) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < arr.length - 1 ? '1px solid #f0fdfa' : 'none' }}>
                    <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{s.label}</span>
                    <span style={{ fontSize: 13, color: '#064e3b', fontWeight: 800 }}>{s.value}</span>
                  </div>
                ))}</div>
              )}
              {tab === 'shipping' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {[{ icon: <Truck size={15} />, title: 'Free Delivery', desc: 'On orders above ₹499' }, { icon: <RotateCcw size={15} />, title: '7-Day Returns', desc: 'Hassle-free return policy' }, { icon: <Shield size={15} />, title: 'Secure Payment', desc: '100% safe & encrypted' }].map((s, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, padding: 12, background: '#f0fdfa', borderRadius: 14, alignItems: 'flex-start', border: '1px solid #99f6e4' }}>
                      <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg,#2dd4bf,#0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{React.cloneElement(s.icon, { color: 'white' })}</div>
                      <div><p style={{ fontSize: 13, fontWeight: 800, color: '#064e3b', margin: '0 0 2px' }}>{s.title}</p><p style={{ fontSize: 12, color: '#64748b', margin: 0 }}>{s.desc}</p></div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdfa', padding: '8px 16px', borderRadius: 40, border: '1px solid #99f6e4' }}>
                <button className="qbtn" onClick={() => setQty(q => Math.max(1, q - 1))}>−</button>
                <span style={{ fontSize: 16, fontWeight: 800, color: '#064e3b', minWidth: 22, textAlign: 'center' }}>{qty}</span>
                <button className="qbtn" onClick={() => setQty(q => q + 1)}>+</button>
              </div>
              <button onClick={() => { for (let i = 0; i < qty; i++) onAddToCart(product, setError); onClose(); }}
                disabled={product.stockQuantity === 0}
                style={{ flex: 1, padding: '13px 20px', background: product.stockQuantity === 0 ? '#f1f5f9' : 'linear-gradient(135deg,#2dd4bf,#0d9488)', color: product.stockQuantity === 0 ? '#94a3b8' : 'white', border: 'none', borderRadius: 40, fontSize: 14, fontWeight: 800, cursor: product.stockQuantity === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: product.stockQuantity === 0 ? 'none' : '0 8px 24px rgba(13,148,136,.4)', transition: 'all .2s', fontFamily: 'inherit' }}
                onMouseEnter={e => { if (product.stockQuantity > 0) { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 12px 30px rgba(13,148,136,.5)'; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = product.stockQuantity === 0 ? 'none' : '0 8px 24px rgba(13,148,136,.4)'; }}>
                <ShoppingCart size={17} />{product.stockQuantity === 0 ? 'Out of Stock' : `Add ${qty > 1 ? qty + 'x ' : ''}to Cart`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── PRODUCT CARD ──────────────────────────────────────────────────
const ProductCard = ({ product, onAddToCart, setError, onViewDetails }) => {
  const [hov, setHov] = useState(false);
  const [added, setAdded] = useState(false);
  const price = getPrice(product);
  const rating = getRating(product);

  const handleAdd = () => {
    onAddToCart(product, setError);
    setAdded(true);
    setTimeout(() => setAdded(false), 1100);
  };

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: 'white', borderRadius: 20, overflow: 'hidden', border: `1.5px solid ${hov ? '#5eead4' : '#ccfbf1'}`, transition: 'all .3s cubic-bezier(.34,1.56,.64,1)', transform: hov ? 'translateY(-6px) scale(1.02)' : 'none', boxShadow: hov ? '0 20px 50px rgba(13,148,136,.15)' : '0 2px 10px rgba(13,148,136,.06)', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative', aspectRatio: '1/1', background: 'linear-gradient(135deg,#f0fdfa,#ccfbf1)', overflow: 'hidden' }}>
        <img src={product.imageUrl || 'https://via.placeholder.com/300/ccfbf1/0d9488?text=Product'} alt={product.name}
          style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 12, transition: 'transform .4s', transform: hov ? 'scale(1.1)' : 'scale(1)' }}
          onError={e => { e.currentTarget.src = 'https://via.placeholder.com/300/ccfbf1/0d9488?text=Product'; }} />
        <div style={{ position: 'absolute', top: 10, left: 10, background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', color: 'white', fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 20 }}>-20%</div>
        {product.stockQuantity !== undefined && product.stockQuantity > 0 && product.stockQuantity <= 5 && (
          <div style={{ position: 'absolute', top: 10, right: 10, background: '#ff6b6b', color: 'white', fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 20 }}>{product.stockQuantity} left</div>
        )}
        {product.score && (
          <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'linear-gradient(135deg,#2dd4bf,#0d9488)', color: 'white', fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 3 }}>
            <Sparkles size={9} />{Math.round(product.score * 100)}%
          </div>
        )}
      </div>
      <div style={{ flex: 1, padding: 14, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <p style={{ fontSize: 10, color: '#2dd4bf', fontWeight: 800, textTransform: 'uppercase', letterSpacing: .5, margin: 0 }}>{product.brand || getCategoryName(product)}</p>
        <h3 style={{ fontSize: 13, fontWeight: 700, color: '#064e3b', margin: 0, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: 36 }}>{product.name}</h3>
        {rating && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            {[...Array(5)].map((_, i) => <Star key={i} size={11} style={{ color: i < Math.floor(rating) ? '#f59e0b' : '#e2e8f0', fill: i < Math.floor(rating) ? '#f59e0b' : '#e2e8f0' }} />)}
            <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 2 }}>({product.reviewCount || 0})</span>
          </div>
        )}
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#0d9488', letterSpacing: -.5 }}>₹{price.toLocaleString()}</div>
          <div style={{ fontSize: 11, color: '#cbd5e1', textDecoration: 'line-through' }}>₹{(price * 1.2).toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
        </div>
        <div style={{ marginTop: 'auto', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 7 }}>
          <button onClick={() => onViewDetails(product)}
            style={{ width: '100%', padding: '9px 0', fontSize: 12, fontWeight: 700, background: '#f0fdfa', color: '#0d9488', border: '1.5px solid #99f6e4', borderRadius: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all .2s', fontFamily: 'inherit' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#ccfbf1'; e.currentTarget.style.borderColor = '#2dd4bf'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f0fdfa'; e.currentTarget.style.borderColor = '#99f6e4'; }}>
            <Eye size={13} /> View Details
          </button>
          <button onClick={handleAdd} disabled={product.stockQuantity === 0}
            style={{ width: '100%', padding: '9px 0', fontSize: 12, fontWeight: 700, background: added ? 'linear-gradient(135deg,#34d399,#10b981)' : product.stockQuantity === 0 ? '#f1f5f9' : 'linear-gradient(135deg,#2dd4bf,#0d9488)', color: product.stockQuantity === 0 ? '#94a3b8' : 'white', border: 'none', borderRadius: 12, cursor: product.stockQuantity === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, transition: 'all .25s cubic-bezier(.34,1.56,.64,1)', transform: added ? 'scale(.96)' : 'scale(1)', boxShadow: added ? '0 4px 14px rgba(52,211,153,.45)' : product.stockQuantity === 0 ? 'none' : '0 4px 14px rgba(13,148,136,.3)', fontFamily: 'inherit' }}>
            {added ? <><CheckCircle size={13} />Added!</> : product.stockQuantity === 0 ? 'Out of Stock' : <><ShoppingCart size={13} />Add to Cart</>}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── FULL-PAGE CHAT OVERLAY ────────────────────────────────────────
const FullPageChat = ({ user, chatMessages, setChatMessages, onClose, addToCart, setError }) => {
  const [msg, setMsg] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, isTyping]);
  useEffect(() => {
    inputRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const sendMessage = async (text) => {
    const t = (text || msg).trim();
    if (!t || isTyping) return;
    setChatMessages(prev => [...prev, { role: 'user', content: t }]);
    setMsg('');
    setIsTyping(true);
    try {
      const userId = user?.id || user?.mongoUserId || user?.Id || '';
      const result = await callAIAgent(t, chatMessages, userId);
      setChatMessages(prev => [...prev, {
        role: 'assistant',
        content: result.response || "I had trouble understanding that. Please try again.",
        products: result.products || null,
        action: result.action || null,
      }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting right now. Please try again." }]);
    } finally { setIsTyping(false); }
  };

  const handleChatAdd = (product) => {
    addToCart(product, setError);
    setChatMessages(prev => [...prev, { role: 'assistant', content: `✅ **${product.name}** added to your cart!` }]);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', animation: 'chatOpen .28s ease', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>

      {/* LEFT SIDEBAR */}
      <div style={{ width: 290, background: 'linear-gradient(180deg,#ccfbf1 0%,#99f6e4 50%,#6ee7b7 100%)', display: 'flex', flexDirection: 'column', padding: '24px 18px', gap: 22, flexShrink: 0, boxShadow: '4px 0 20px rgba(13,148,136,.12)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 46, height: 46, borderRadius: 14, background: 'linear-gradient(135deg,#2dd4bf,#0f766e)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(13,148,136,.4)', animation: 'floatImg 3s ease-in-out infinite' }}>
            <Bot size={22} color="white" />
          </div>
          <div>
            <p style={{ fontSize: 17, fontWeight: 900, color: '#064e3b', margin: 0, letterSpacing: -.3 }}>ShopAI</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 7, height: 7, background: '#22c55e', borderRadius: '50%', animation: 'pulseRing 1.5s infinite' }} />
              <p style={{ fontSize: 11, color: '#065f46', fontWeight: 700, margin: 0 }}>AI Assistant · Online</p>
            </div>
          </div>
        </div>

        <div style={{ background: 'rgba(255,255,255,.7)', borderRadius: 16, padding: 14, backdropFilter: 'blur(6px)' }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: '#064e3b', margin: '0 0 5px' }}>👋 Hi {user?.fullName?.split(' ')[0] || 'there'}!</p>
          <p style={{ fontSize: 12, color: '#065f46', lineHeight: 1.65, margin: 0 }}>I can search products, manage your cart, compare items, and place orders for you.</p>
        </div>

        <div>
          <p style={{ fontSize: 10, fontWeight: 800, color: '#065f46', textTransform: 'uppercase', letterSpacing: 1.2, margin: '0 0 10px' }}>Quick Actions</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {QUICK_CHIPS.map((chip, i) => (
              <button key={i} onClick={() => sendMessage(chip.msg)}
                style={{ background: 'rgba(255,255,255,.65)', border: '1px solid rgba(255,255,255,.9)', borderRadius: 12, padding: '10px 14px', fontSize: 12, fontWeight: 600, color: '#064e3b', cursor: 'pointer', textAlign: 'left', transition: 'all .2s', fontFamily: 'inherit' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = '0 4px 12px rgba(13,148,136,.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.65)'; e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none'; }}>
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 'auto', background: 'rgba(255,255,255,.45)', borderRadius: 12, padding: 12, fontSize: 11, color: '#065f46', lineHeight: 1.6 }}>
          💡 <strong>Tip:</strong> Ask me to compare products, find deals, or track your orders!
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div style={{ flex: 1, background: '#f0fdfa', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Chat top bar */}
        <div style={{ background: 'white', padding: '14px 28px', borderBottom: '1px solid #ccfbf1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(13,148,136,.07)', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: '#064e3b', margin: 0 }}>AI Shopping Assistant</h2>
            <p style={{ fontSize: 12, color: '#2dd4bf', margin: 0, fontWeight: 600 }}>Powered by AI · Always ready to help</p>
          </div>
          <button onClick={onClose}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fef2f2', color: '#ef4444', border: '1.5px solid #fca5a5', borderRadius: 12, padding: '9px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all .2s', fontFamily: 'inherit' }}
            onMouseEnter={e => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = '#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.color = '#ef4444'; e.currentTarget.style.borderColor = '#fca5a5'; }}>
            <X size={15} /> Close Chat
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 40px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {chatMessages.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 60, animation: 'fadeInUp .5s ease' }}>
              <div style={{ width: 88, height: 88, background: 'linear-gradient(135deg,#ccfbf1,#99f6e4)', borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px', boxShadow: '0 8px 28px rgba(13,148,136,.2)' }}>
                <Sparkles size={40} color="#0d9488" />
              </div>
              <h3 style={{ fontSize: 26, fontWeight: 900, color: '#064e3b', margin: '0 0 10px' }}>How can I help you today?</h3>
              <p style={{ fontSize: 15, color: '#64748b', lineHeight: 1.7, margin: 0 }}>Ask me to find products, compare prices,<br />check orders, or get personalized recommendations.</p>
            </div>
          )}

          {chatMessages.map((m, idx) => (
            <div key={idx} className="msg-in" style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 12, animationDelay: `${idx * .04}s` }}>
              {m.role === 'assistant' && (
                <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#2dd4bf,#0d9488)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, boxShadow: '0 4px 12px rgba(13,148,136,.3)' }}>
                  <Bot size={19} color="white" />
                </div>
              )}
              <div style={{ maxWidth: '60%', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ padding: '13px 17px', borderRadius: m.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px', fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-wrap', background: m.role === 'user' ? 'linear-gradient(135deg,#2dd4bf,#0d9488)' : 'white', color: m.role === 'user' ? 'white' : '#064e3b', boxShadow: m.role === 'user' ? '0 4px 16px rgba(13,148,136,.35)' : '0 2px 10px rgba(13,148,136,.09)', border: m.role === 'assistant' ? '1px solid #ccfbf1' : 'none', fontWeight: m.role === 'user' ? 600 : 400 }}>
                  {m.content}
                </div>
                {m.role === 'assistant' && m.products && m.products.length > 0 && (
                  <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
                    {m.products.slice(0, 4).map((p, pi) => <ChatProductCard key={pi} product={p} onAddToCart={handleChatAdd} />)}
                  </div>
                )}
              </div>
              {m.role === 'user' && (
                <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#99f6e4,#5eead4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, fontSize: 16, fontWeight: 800, color: '#065f46' }}>
                  {(user?.fullName?.[0] || user?.name?.[0] || 'U').toUpperCase()}
                </div>
              )}
            </div>
          ))}

          {isTyping && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#2dd4bf,#0d9488)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(13,148,136,.3)' }}><Bot size={19} color="white" /></div>
              <div style={{ background: 'white', border: '1px solid #ccfbf1', borderRadius: '20px 20px 20px 4px', padding: '14px 18px', boxShadow: '0 2px 10px rgba(13,148,136,.08)', display: 'flex', gap: 6, alignItems: 'center' }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 10, height: 10, background: '#2dd4bf', borderRadius: '50%', animation: ['dotPulse1', 'dotPulse2', 'dotPulse3'][i] + ' 1.4s ease-in-out infinite' }} />)}
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input */}
        <div style={{ background: 'white', borderTop: '1px solid #ccfbf1', padding: '16px 40px', display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0 }}>
          <input ref={inputRef} type="text" value={msg}
            onChange={e => setMsg(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask me anything about products, orders, cart..."
            disabled={isTyping}
            style={{ flex: 1, border: '1.5px solid #99f6e4', borderRadius: 16, padding: '14px 20px', fontSize: 14, outline: 'none', background: '#f0fdfa', color: '#064e3b', fontFamily: 'inherit', transition: 'all .2s' }}
            onFocus={e => { e.currentTarget.style.borderColor = '#2dd4bf'; e.currentTarget.style.background = 'white'; e.currentTarget.style.boxShadow = '0 0 0 4px rgba(56,189,248,.12)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#99f6e4'; e.currentTarget.style.background = '#f0fdfa'; e.currentTarget.style.boxShadow = 'none'; }} />
          <button onClick={() => sendMessage()} disabled={!msg.trim() || isTyping}
            style={{ width: 52, height: 52, borderRadius: 16, border: 'none', background: !msg.trim() || isTyping ? '#ccfbf1' : 'linear-gradient(135deg,#2dd4bf,#0d9488)', color: !msg.trim() || isTyping ? '#94a3b8' : 'white', cursor: !msg.trim() || isTyping ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s', boxShadow: !msg.trim() || isTyping ? 'none' : '0 6px 18px rgba(13,148,136,.4)' }}
            onMouseEnter={e => { if (msg.trim() && !isTyping) e.currentTarget.style.transform = 'scale(1.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; }}>
            {isTyping ? <Loader2 size={20} className="spin" /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN COMPONENT ────────────────────────────────────────────────
const ProductsPage = ({ user, products, cart, searchQuery, setSearchQuery, setCurrentPage, handleLogout, addToCart, error, setError }) => {
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [semanticSuggestions, setSemanticSuggestions] = useState([]);
  const [semanticResults, setSemanticResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSemanticMode, setIsSemanticMode] = useState(false);
  const [currentBanner, setCurrentBanner] = useState(0);
  const [detailProduct, setDetailProduct] = useState(null);
  const [viewMode, setViewMode] = useState('grid');
  const debounceTimer = useRef(null);

  useEffect(() => { const t = setInterval(() => setCurrentBanner(p => (p + 1) % 3), 5000); return () => clearInterval(t); }, []);

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q || q.length < 2) { setSemanticSuggestions([]); setShowSuggestions(false); if (!q) { setIsSemanticMode(false); setSemanticResults([]); } return; }
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      setSearchLoading(true);
      try { const res = await productsAPI.search(q, 6); const list = res?.data?.results || []; setSemanticSuggestions(list); setShowSuggestions(list.length > 0); }
      catch { setSemanticSuggestions([]); } finally { setSearchLoading(false); }
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [searchQuery]);

  const handleFullSearch = useCallback(async (override) => {
    const q = (override || searchQuery).trim();
    if (!q) return;
    setShowSuggestions(false); setSearchLoading(true); setIsSemanticMode(true);
    try { const res = await productsAPI.search(q, 20); setSemanticResults(res?.data?.results || []); }
    catch { setSemanticResults([]); setError('Search failed.'); setIsSemanticMode(false); }
    finally { setSearchLoading(false); }
  }, [searchQuery]);

  const applyCategory = async (cat) => {
    if (!cat) { setSearchQuery(''); setIsSemanticMode(false); setSemanticResults([]); return; }
    setSearchQuery(cat); await handleFullSearch(cat);
  };

  const displayedProducts = isSemanticMode ? semanticResults : (products || []);
  const uniqueCategories = Array.from(new Set((products || []).map(p => getCategoryName(p)).filter(Boolean))).slice(0, 20);

  const banners = [
    { title: 'Summer Sale 2026', subtitle: 'Up to 50% OFF on Electronics', desc: 'Free shipping on orders above ₹999', bg: 'linear-gradient(135deg,#fca5a5 0%,#f87171 50%,#ef4444 100%)', tc: '#a0328e', bb: '#d61e64', bc: 'white' },
    { title: 'New Arrivals', subtitle: 'Latest Smartphones & Gadgets', desc: 'Shop the newest tech at best prices', bg: 'linear-gradient(135deg,#ccfbf1 0%,#99f6e4 50%,#5eead4 100%)', tc: '#064e3b', bb: '#0f766e', bc: 'white' },
    { title: 'Special Offer', subtitle: 'Buy 2 Get 1 Free', desc: 'On selected audio & wearables', bg: 'linear-gradient(135deg,#fef9c3 0%,#fde68a 50%,#fcd34d 100%)', tc: '#713f12', bb: '#f59e0b', bc: 'white' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#f0fdfa', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <style>{GLOBAL_CSS}</style>

      {/* ════ HEADER ════════════════════════════════════════════════ */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, boxShadow: '0 4px 20px rgba(13,148,136,.12)' }}>

        {/* Top bar – bright light teal */}
        <div style={{ background: 'linear-gradient(135deg,#ccfbf1 0%,#99f6e4 60%,#5eead4 100%)', borderBottom: '1px solid rgba(186,230,253,.8)' }}>
          <div style={{ maxWidth: 1500, margin: '0 auto', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 18 }}>

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', flexShrink: 0 }}>
              <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg,#2dd4bf,#0d9488)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 14px rgba(13,148,136,.4)' }}>
                <ShoppingBag size={20} color="white" />
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 900, color: '#064e3b', letterSpacing: -.5, lineHeight: 1 }}>ShopAI</div>
                <div style={{ fontSize: 9, color: '#065f46', fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase' }}>Marketplace</div>
              </div>
            </div>

            {/* ── SINGLE SEARCH BAR ── */}
            <div style={{ flex: 1, maxWidth: 680, position: 'relative' }}>
              <div style={{ display: 'flex', borderRadius: 16, overflow: 'hidden', boxShadow: '0 4px 20px rgba(13,148,136,.18)', border: '1.5px solid #5eead4', background: 'white' }}>
                <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                  <Search size={16} style={{ position: 'absolute', left: 16, color: '#2dd4bf', flexShrink: 0, pointerEvents: 'none' }} />
                  <input value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); if (!e.target.value.trim()) { setIsSemanticMode(false); setSemanticResults([]); } }}
                    onKeyDown={e => { if (e.key === 'Enter') handleFullSearch(); if (e.key === 'Escape') setShowSuggestions(false); }}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                    onFocus={() => semanticSuggestions.length > 0 && setShowSuggestions(true)}
                    placeholder="Search products with AI ✨"
                    style={{ width: '100%', padding: '14px 14px 14px 44px', fontSize: 14, border: 'none', outline: 'none', color: '#064e3b', background: 'transparent', fontFamily: 'inherit' }} />
                  {searchLoading && <Loader2 size={15} className="spin" style={{ position: 'absolute', right: 14, color: '#2dd4bf' }} />}
                </div>
                <button onClick={() => handleFullSearch()}
                  style={{ background: 'linear-gradient(135deg,#2dd4bf,#0d9488)', padding: '0 24px', border: 'none', cursor: 'pointer', color: 'white', fontSize: 13, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 6, transition: 'all .2s', fontFamily: 'inherit', flexShrink: 0 }}
                  onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(135deg,#0d9488,#0f766e)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg,#2dd4bf,#0d9488)'}>
                  <Search size={16} /> Search
                </button>
              </div>

              {/* ── SUGGESTIONS – white/light background ── */}
              {showSuggestions && semanticSuggestions.length > 0 && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', left: 0, right: 0, background: 'white', border: '1.5px solid #99f6e4', borderRadius: 16, boxShadow: '0 16px 48px rgba(13,148,136,.16)', zIndex: 100, overflow: 'hidden', animation: 'fadeInUp .2s ease' }}>
                  <div style={{ padding: '10px 16px', background: '#f0fdfa', borderBottom: '1px solid #ccfbf1', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Sparkles size={13} color="#0d9488" />
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', letterSpacing: .5 }}>AI Suggestions</span>
                  </div>
                  {semanticSuggestions.map((item, idx) => {
                    const p = getPrice(item);
                    const score = item.score ? `${Math.round(item.score * 100)}% match` : '';
                    return (
                      <div key={item.id || idx}
                        onMouseDown={() => { setSearchQuery(item.name); setShowSuggestions(false); handleFullSearch(item.name); }}
                        style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f0fdfa', background: 'white', transition: 'background .15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f0fdfa'}
                        onMouseLeave={e => e.currentTarget.style.background = 'white'}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#064e3b', margin: '0 0 2px' }}>{item.name}</p>
                          <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{item.brand || getCategoryName(item)}</p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
                          <span style={{ fontSize: 14, fontWeight: 900, color: '#0d9488' }}>₹{p.toLocaleString()}</span>
                          {score && <p style={{ fontSize: 10, color: '#2dd4bf', margin: '2px 0 0', fontWeight: 700 }}>{score}</p>}
                        </div>
                      </div>
                    );
                  })}
                  <div onMouseDown={() => { setShowSuggestions(false); handleFullSearch(); }}
                    style={{ padding: '11px 16px', textAlign: 'center', color: '#0d9488', fontSize: 13, fontWeight: 800, cursor: 'pointer', background: '#f0fdfa', borderTop: '1px solid #ccfbf1', transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#ccfbf1'}
                    onMouseLeave={e => e.currentTarget.style.background = '#f0fdfa'}>
                    See all results for "{searchQuery}" →
                  </div>
                </div>
              )}
            </div>

            {/* Right: profile + cart */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto', flexShrink: 0 }}>
              <button onClick={() => setCurrentPage('profile')}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'white', border: '1.5px solid #99f6e4', borderRadius: 14, padding: '8px 14px', cursor: 'pointer', transition: 'all .2s', boxShadow: '0 2px 8px rgba(13,148,136,.1)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#2dd4bf'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(13,148,136,.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#99f6e4'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(13,148,136,.1)'; }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#99f6e4,#5eead4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UserCircle size={18} color="#065f46" />
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1 }}>Hello,</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#064e3b', lineHeight: 1.2 }}>{user?.name || user?.fullName || 'User'}</div>
                </div>
              </button>

              <button onClick={() => setCurrentPage('cart')}
                style={{ background: 'linear-gradient(135deg,#2dd4bf,#0d9488)', border: 'none', borderRadius: 14, padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all .2s', color: 'white', boxShadow: '0 4px 14px rgba(13,148,136,.35)', position: 'relative', animation: cart.length > 0 ? 'pulseRing 2.5s infinite' : 'none' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(13,148,136,.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(13,148,136,.35)'; }}>
                <div style={{ position: 'relative' }}>
                  <ShoppingCart size={22} />
                  {cart.length > 0 && <span style={{ position: 'absolute', top: -8, right: -8, background: '#ff6b6b', color: 'white', fontSize: 10, fontWeight: 800, borderRadius: '50%', width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', animation: 'bounceIn .4s ease' }}>{cart.length}</span>}
                </div>
                <div><div style={{ fontSize: 10, color: 'rgba(255,255,255,.8)', lineHeight: 1 }}>My Cart</div><div style={{ fontSize: 13, fontWeight: 800, lineHeight: 1.2 }}>{cart.length} items</div></div>
              </button>
            </div>
          </div>
        </div>

        {/* Nav strip – bright cyan gradient */}
        <div style={{ background: 'linear-gradient(135deg,#2dd4bf,#0d9488)', borderBottom: '1px solid rgba(255,255,255,.15)' }}>
          <div style={{ maxWidth: 1500, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', overflowX: 'auto' }}>
            <button onClick={() => applyCategory('')}
              style={{ color: 'white', background: searchQuery === '' ? 'rgba(255,255,255,.2)' : 'transparent', border: 'none', padding: '12px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', borderBottom: searchQuery === '' ? '3px solid white' : '3px solid transparent', display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit', transition: 'background .2s' }}>
              <Package size={14} /> All Products
            </button>
            {uniqueCategories.slice(0, 8).map((cat, i) => (
              <button key={i} onClick={() => applyCategory(cat)}
                style={{ color: 'white', background: searchQuery === cat ? 'rgba(255,255,255,.2)' : 'transparent', border: 'none', padding: '12px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', borderBottom: searchQuery === cat ? '3px solid white' : '3px solid transparent', fontFamily: 'inherit', transition: 'background .2s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.14)'}
                onMouseLeave={e => e.currentTarget.style.background = searchQuery === cat ? 'rgba(255,255,255,.2)' : 'transparent'}>
                {cat}
              </button>
            ))}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, padding: '6px 0', flexShrink: 0 }}>
              <button onClick={() => setChatOpen(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#064e3b', background: 'white', border: 'none', borderRadius: 20, padding: '8px 16px', cursor: 'pointer', fontSize: 13, fontWeight: 800, transition: 'all .2s', boxShadow: '0 2px 8px rgba(0,0,0,.1)', fontFamily: 'inherit' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,.15)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,.1)'; }}>
                <MessageSquare size={14} /> AI Chat
              </button>
              <button onClick={handleLogout}
                style={{ color: 'white', background: 'rgba(255,255,255,.15)', border: '1px solid rgba(255,255,255,.3)', borderRadius: 20, padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit', transition: 'all .2s' }}>
                <LogOut size={14} /> Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ════ MAIN ══════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 1500, margin: '0 auto', padding: '0 16px' }}>

        {error && (
          <div style={{ marginTop: 16, background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 12, padding: '12px 16px' }}>
            <p style={{ fontSize: 13, color: '#dc2626', fontWeight: 600, margin: 0 }}>{error}</p>
          </div>
        )}

        {/* BANNER */}
        <div style={{ position: 'relative', height: 260, overflow: 'hidden', marginTop: 20, marginBottom: 24, borderRadius: 24, boxShadow: '0 12px 40px rgba(13,148,136,.15)' }}>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', transition: 'transform .6s cubic-bezier(.45,0,.55,1)', transform: `translateX(-${currentBanner * 100}%)` }}>
            {banners.map((b, idx) => (
              <div key={idx} style={{ minWidth: '100%', height: '100%', background: b.bg, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -50, right: -50, width: 240, height: 240, borderRadius: '50%', background: 'rgba(255,255,255,.15)' }} />
                <div style={{ position: 'absolute', bottom: -30, right: 180, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,.1)' }} />
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '36px 48px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 10, background: 'rgba(255,255,255,.5)', display: 'inline-block', padding: '4px 12px', borderRadius: 20, width: 'fit-content', color: b.tc }}>Limited offer</div>
                  <h2 style={{ fontSize: 36, fontWeight: 900, margin: '0 0 6px', letterSpacing: -1, color: b.tc }}>{b.title}</h2>
                  <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 4px', color: b.tc, opacity: .85 }}>{b.subtitle}</p>
                  <p style={{ fontSize: 13, margin: '0 0 20px', color: b.tc, opacity: .7 }}>{b.desc}</p>
                  <button onClick={() => { setSearchQuery(''); setIsSemanticMode(false); setSemanticResults([]); }}
                    style={{ background: b.bb, color: b.bc, border: 'none', padding: '12px 26px', borderRadius: 40, fontSize: 14, fontWeight: 800, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, width: 'fit-content', boxShadow: '0 6px 18px rgba(0,0,0,.14)', transition: 'all .2s', fontFamily: 'inherit' }}
                    onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}>
                    Shop Now <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {[{ side: 'left', icon: <ChevronLeft size={18} color="#065f46" />, onClick: () => setCurrentBanner(p => (p - 1 + 3) % 3) },
            { side: 'right', icon: <ChevronRight size={18} color="#065f46" />, onClick: () => setCurrentBanner(p => (p + 1) % 3) }].map(btn => (
            <button key={btn.side} onClick={btn.onClick} style={{ position: 'absolute', [btn.side]: 16, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,.88)', border: 'none', borderRadius: '50%', width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,0,0,.1)', transition: 'all .2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.transform = 'translateY(-50%) scale(1.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.88)'; e.currentTarget.style.transform = 'translateY(-50%)'; }}>
              {btn.icon}
            </button>
          ))}
          <div style={{ position: 'absolute', bottom: 14, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 6 }}>
            {banners.map((_, idx) => <button key={idx} onClick={() => setCurrentBanner(idx)} style={{ height: 5, width: currentBanner === idx ? 26 : 7, borderRadius: 3, background: currentBanner === idx ? 'white' : 'rgba(255,255,255,.55)', border: 'none', cursor: 'pointer', transition: 'all .3s', padding: 0 }} />)}
          </div>
        </div>

        {/* CATEGORY CARDS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { title: 'Trending Electronics', subs: ['Smartphones', 'Laptops', 'Tablets', 'Accessories'], cat: 'Electronics', icon: <Zap size={16} />, bg: '#ccfbf1', accent: '#0d9488' },
            { title: 'Audio & Wearables', subs: ['Headphones', 'Watches', 'Earbuds', 'Speakers'], cat: 'Audio', icon: <Star size={16} />, bg: '#f0e9ff', accent: '#8b5cf6' },
            { title: 'Home Appliances', subs: ['Purifiers', 'Vacuums', 'Microwaves', 'Washers'], cat: 'Appliances', icon: <Package size={16} />, bg: '#fef9ee', accent: '#f59e0b' },
            { title: 'Deals Under ₹999', subs: ['Cables', 'Cases', 'Chargers', 'More'], cat: '', icon: <Tag size={16} />, bg: '#ecfdf5', accent: '#10b981' },
          ].map((c, i) => (
            <div key={i} style={{ background: 'white', borderRadius: 20, padding: 18, border: '1px solid #ccfbf1', boxShadow: '0 4px 14px rgba(13,148,136,.06)', transition: 'all .3s', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 16px 40px rgba(13,148,136,.13)'; e.currentTarget.style.borderColor = '#5eead4'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(13,148,136,.06)'; e.currentTarget.style.borderColor = '#ccfbf1'; }}>
              <div style={{ position: 'absolute', top: -18, right: -18, width: 80, height: 80, borderRadius: '50%', background: c.bg, opacity: .9 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, position: 'relative' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.accent }}>{c.icon}</div>
                <h3 style={{ fontSize: 13, fontWeight: 800, color: '#064e3b', margin: 0 }}>{c.title}</h3>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                {c.subs.map(sub => (
                  <div key={sub}>
                    <div style={{ aspectRatio: '1/1', background: c.bg, borderRadius: 10, marginBottom: 4, opacity: .85 }} />
                    <p style={{ fontSize: 11, color: '#64748b', margin: 0, fontWeight: 600 }}>{sub}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => applyCategory(c.cat)} style={{ background: 'none', border: 'none', color: c.accent, fontSize: 12, fontWeight: 800, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'inherit', transition: 'gap .2s' }}
                onMouseEnter={e => e.currentTarget.style.gap = '8px'} onMouseLeave={e => e.currentTarget.style.gap = '4px'}>
                Explore all <ArrowRight size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* FILTER BAR */}
        <div style={{ background: 'white', borderRadius: 16, padding: '12px 20px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, border: '1px solid #ccfbf1', boxShadow: '0 2px 10px rgba(13,148,136,.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#64748b', display: 'flex', alignItems: 'center', gap: 6 }}><Filter size={14} color="#2dd4bf" />Sort:</span>
            <select style={{ fontSize: 13, border: '1.5px solid #99f6e4', borderRadius: 20, padding: '6px 14px', background: '#f0fdfa', color: '#064e3b', fontWeight: 700, outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
              <option>Featured</option><option>Price: Low to High</option><option>Price: High to Low</option><option>Top Rated</option>
            </select>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isSemanticMode && (
              <>
                <span style={{ background: '#f0fdfa', color: '#0d9488', fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 20, border: '1px solid #99f6e4', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Sparkles size={12} /> AI: "{searchQuery}"
                </span>
                <button onClick={() => { setSearchQuery(''); setIsSemanticMode(false); setSemanticResults([]); }} style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>✕ Clear</button>
              </>
            )}
            <span style={{ fontSize: 13, color: '#94a3b8' }}><strong style={{ color: '#064e3b' }}>{displayedProducts.length}</strong> products</span>
            <div style={{ display: 'flex', background: '#f0fdfa', borderRadius: 10, padding: 3, gap: 3, border: '1px solid #99f6e4' }}>
              {[{ m: 'grid', icon: <Grid size={14} /> }, { m: 'list', icon: <List size={14} /> }].map(v => (
                <button key={v.m} onClick={() => setViewMode(v.m)} style={{ padding: '6px 10px', borderRadius: 8, border: 'none', background: viewMode === v.m ? 'white' : 'transparent', color: viewMode === v.m ? '#0d9488' : '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all .2s', boxShadow: viewMode === v.m ? '0 2px 6px rgba(13,148,136,.12)' : 'none' }}>{v.icon}</button>
              ))}
            </div>
          </div>
        </div>

        {/* PRODUCTS */}
        <div style={{ paddingBottom: 60 }}>
          {searchLoading && isSemanticMode ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16 }}>
              {[...Array(10)].map((_, i) => (
                <div key={i} style={{ background: 'white', borderRadius: 20, overflow: 'hidden', border: '1px solid #ccfbf1' }}>
                  <div style={{ aspectRatio: '1/1', background: 'linear-gradient(90deg,#ccfbf1 25%,#f0fdfa 50%,#ccfbf1 75%)', backgroundSize: '200% 100%', animation: 'shimmerBg 1.5s infinite' }} />
                  <div style={{ padding: 14 }}>
                    <div style={{ height: 12, background: '#ccfbf1', borderRadius: 6, marginBottom: 8 }} />
                    <div style={{ height: 12, background: '#ccfbf1', borderRadius: 6, width: '65%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : displayedProducts.length === 0 ? (
            <div style={{ background: 'white', padding: '60px 20px', textAlign: 'center', borderRadius: 24, border: '1px solid #ccfbf1' }}>
              <div style={{ width: 80, height: 80, background: '#f0fdfa', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><Search size={32} color="#99f6e4" /></div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#064e3b', marginBottom: 8 }}>No products found</h3>
              <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 24 }}>{isSemanticMode ? `No matches for "${searchQuery}".` : 'Try different keywords.'}</p>
              <button onClick={() => { setSearchQuery(''); setIsSemanticMode(false); setSemanticResults([]); }} style={{ background: 'linear-gradient(135deg,#2dd4bf,#0d9488)', color: 'white', border: 'none', padding: '12px 28px', borderRadius: 40, fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>View All Products</button>
            </div>
          ) : viewMode === 'grid' ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16 }}>
              {displayedProducts.map((product, index) => (
                <div key={getProductId(product) || index} className="card-in" style={{ animationDelay: `${Math.min(index * .04, .4)}s` }}>
                  <ProductCard product={product} onAddToCart={addToCart} setError={setError} onViewDetails={setDetailProduct} />
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {displayedProducts.map((product, index) => (
                <div key={getProductId(product) || index} className="card-in" style={{ animationDelay: `${Math.min(index * .03, .3)}s`, background: 'white', borderRadius: 16, border: '1px solid #ccfbf1', padding: 16, display: 'flex', gap: 16, alignItems: 'center', transition: 'all .2s', boxShadow: '0 2px 8px rgba(13,148,136,.05)' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(13,148,136,.12)'; e.currentTarget.style.borderColor = '#5eead4'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(13,148,136,.05)'; e.currentTarget.style.borderColor = '#ccfbf1'; }}>
                  <img src={product.imageUrl || 'https://via.placeholder.com/100/ccfbf1/0d9488?text=P'} alt={product.name} style={{ width: 88, height: 88, objectFit: 'contain', borderRadius: 12, background: '#f0fdfa', flexShrink: 0 }} onError={e => { e.currentTarget.src = 'https://via.placeholder.com/100/ccfbf1/0d9488?text=P'; }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 11, color: '#2dd4bf', fontWeight: 800, margin: '0 0 4px' }}>{getCategoryName(product)}</p>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: '#064e3b', margin: '0 0 6px' }}>{product.name}</h3>
                    {getRating(product) && <div style={{ display: 'flex', gap: 2 }}>{[...Array(5)].map((_, i) => <Star key={i} size={12} style={{ color: i < Math.floor(getRating(product)) ? '#f59e0b' : '#e2e8f0', fill: i < Math.floor(getRating(product)) ? '#f59e0b' : '#e2e8f0' }} />)}</div>}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#0d9488' }}>₹{getPrice(product).toLocaleString()}</div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => setDetailProduct(product)} style={{ padding: '8px 14px', background: '#f0fdfa', color: '#0d9488', border: '1.5px solid #99f6e4', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontFamily: 'inherit' }}><Eye size={13} /> Details</button>
                      <button onClick={() => addToCart(product, setError)} disabled={product.stockQuantity === 0} style={{ padding: '8px 14px', background: 'linear-gradient(135deg,#2dd4bf,#0d9488)', color: 'white', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, opacity: product.stockQuantity === 0 ? .4 : 1, fontFamily: 'inherit' }}><ShoppingCart size={13} /> Add</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PRODUCT DETAIL MODAL */}
      {detailProduct && <ProductDetailModal product={detailProduct} onClose={() => setDetailProduct(null)} onAddToCart={addToCart} setError={setError} />}

      {/* FULL-PAGE CHAT */}
      {chatOpen && <FullPageChat user={user} chatMessages={chatMessages} setChatMessages={setChatMessages} onClose={() => setChatOpen(false)} addToCart={addToCart} setError={setError} />}

      {/* FLOATING CHAT BUTTON */}
      {!chatOpen && (
        <button onClick={() => setChatOpen(true)}
          style={{ position: 'fixed', bottom: 28, right: 28, width: 62, height: 62, background: 'linear-gradient(135deg,#2dd4bf,#0d9488)', borderRadius: 20, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 40, boxShadow: '0 8px 28px rgba(13,148,136,.5)', transition: 'all .3s cubic-bezier(.34,1.56,.64,1)', animation: 'pulseRing 2.5s infinite' }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15) rotate(-5deg)'; e.currentTarget.style.boxShadow = '0 14px 36px rgba(13,148,136,.65)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 8px 28px rgba(13,148,136,.5)'; }}>
          <Bot size={26} color="white" />
          {chatMessages.filter(m => m.role === 'user').length > 0 && (
            <span style={{ position: 'absolute', top: -6, right: -6, background: '#ff6b6b', color: 'white', fontSize: 10, fontWeight: 800, borderRadius: '50%', width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white', animation: 'bounceIn .4s ease' }}>
              {Math.min(chatMessages.filter(m => m.role === 'user').length, 9)}
            </span>
          )}
        </button>
      )}
    </div>
  );
};

export default ProductsPage;