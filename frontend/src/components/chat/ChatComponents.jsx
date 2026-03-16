// ─────────────────────────────────────────────────────────────────────────────
// FILE: src/components/chat/ChatComponents.jsx
//
// Drop-in replacement for the chat section in ProductsPage.jsx
// Replaces: FullPageChat, ChatProductCard, QUICK_CHIPS, callAIAgent
//
// Key improvements:
//   - RichMessage: parses AI text into styled blocks (cart, orders, search results,
//     bold/bullets) instead of raw plain text
//   - ChatCartCard: beautiful cart item row with image + price
//   - ChatOrderCard: order summary pill with status badge
//   - ChatProductCard: improved with rating stars and match score
//   - Typing indicator with animated dots
//   - Message timestamps
// ─────────────────────────────────────────────────────────────────────────────
import React, { useState, useEffect, useRef } from 'react';
import {
  Bot, Send, X, Loader2, ShoppingCart, Star,
  Package, CheckCircle, Clock, Sparkles, MessageSquare,
  Trash2, RotateCcw, MapPin, CreditCard, TrendingUp
} from 'lucide-react';

const AI_AGENT_URL = process.env.REACT_APP_AI_AGENT_URL || 'http://localhost:7860';

// ─────────────────────────────────────────────────────────────────────────────
// callAIAgent — unchanged API contract
// ─────────────────────────────────────────────────────────────────────────────
export const callAIAgent = async (message, history, userId) => {
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

// ─────────────────────────────────────────────────────────────────────────────
// Quick chips
// ─────────────────────────────────────────────────────────────────────────────
export const QUICK_CHIPS = [
  { label: '📱 Best smartphones', msg: 'Show me the best smartphones' },
  { label: '🎧 Headphones under ₹5000', msg: 'Find headphones under ₹5000' },
  { label: '🛒 My cart', msg: 'Show my cart' },
  { label: '📦 My orders', msg: 'Show my order history' },
  { label: '🔥 Trending now', msg: 'What are trending products?' },
  { label: '💻 Gaming laptops', msg: 'Recommend gaming laptops' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

const StatusBadge = ({ status }) => {
  const map = {
    pending:    { bg: '#fef3c7', color: '#d97706', icon: '⏳' },
    processing: { bg: '#dbeafe', color: '#2563eb', icon: '⚙️' },
    shipped:    { bg: '#d1fae5', color: '#059669', icon: '🚚' },
    delivered:  { bg: '#dcfce7', color: '#16a34a', icon: '✅' },
    cancelled:  { bg: '#fee2e2', color: '#dc2626', icon: '❌' },
  };
  const s = map[(status || '').toLowerCase()] || { bg: '#f1f5f9', color: '#64748b', icon: '📋' };
  return (
    <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {s.icon} {status}
    </span>
  );
};

const StarRating = ({ rating, size = 12 }) => {
  if (!rating) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={size} style={{ color: i <= Math.round(rating) ? '#f59e0b' : '#e2e8f0', fill: i <= Math.round(rating) ? '#f59e0b' : '#e2e8f0' }} />
      ))}
      <span style={{ fontSize: size, color: '#94a3b8', marginLeft: 2 }}>{Number(rating).toFixed(1)}</span>
    </span>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ChatCartCard — rich cart item display
// ─────────────────────────────────────────────────────────────────────────────
const ChatCartCard = ({ item, index }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'white', borderRadius: 14, border: '1.5px solid #ccfbf1', boxShadow: '0 2px 10px rgba(13,148,136,.07)', animation: `slideInMsg .25s ease ${index * 0.06}s both` }}>
    <div style={{ width: 48, height: 48, borderRadius: 10, background: 'linear-gradient(135deg,#f0fdfa,#ccfbf1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <ShoppingCart size={18} color="#0d9488" />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: '#064e3b', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</p>
      <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Qty: {item.qty}</p>
    </div>
    <div style={{ textAlign: 'right', flexShrink: 0 }}>
      <p style={{ fontSize: 15, fontWeight: 900, color: '#0d9488', margin: 0 }}>₹{fmt(item.price)}</p>
      {item.subtotal && item.qty > 1 && <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>₹{fmt(item.subtotal)} total</p>}
    </div>
  </div>
);

// Cart summary block
const CartSummaryBlock = ({ items, total }) => (
  <div style={{ background: 'linear-gradient(135deg,#f0fdfa,#e6fff9)', border: '1.5px solid #99f6e4', borderRadius: 18, padding: 16, marginTop: 8, boxShadow: '0 4px 18px rgba(13,148,136,.1)' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 10, borderBottom: '1px dashed #99f6e4' }}>
      <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#2dd4bf,#0d9488)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <ShoppingCart size={16} color="white" />
      </div>
      <div>
        <p style={{ fontSize: 13, fontWeight: 800, color: '#064e3b', margin: 0 }}>Your Cart</p>
        <p style={{ fontSize: 11, color: '#2dd4bf', margin: 0, fontWeight: 600 }}>{items.length} item{items.length !== 1 ? 's' : ''}</p>
      </div>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, i) => <ChatCartCard key={i} item={item} index={i} />)}
    </div>
    {total > 0 && (
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px dashed #99f6e4', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>Total</span>
        <span style={{ fontSize: 20, fontWeight: 900, color: '#0d9488' }}>₹{fmt(total)}</span>
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ChatOrderCard — order history display
// ─────────────────────────────────────────────────────────────────────────────
const ChatOrderCard = ({ order, index }) => (
  <div style={{ background: 'white', borderRadius: 14, border: '1.5px solid #e2e8f0', padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start', animation: `slideInMsg .25s ease ${index * 0.07}s both`, boxShadow: '0 2px 10px rgba(0,0,0,.05)' }}>
    <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#f0fdfa,#ccfbf1)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <Package size={18} color="#0d9488" />
    </div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 4 }}>
        <p style={{ fontSize: 13, fontWeight: 800, color: '#064e3b', margin: 0 }}>{order.num}</p>
        <StatusBadge status={order.status} />
      </div>
      {order.items && <p style={{ fontSize: 11, color: '#64748b', margin: '4px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.items}</p>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
        {order.date && <span style={{ fontSize: 10, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} />{order.date}</span>}
        <span style={{ fontSize: 15, fontWeight: 900, color: '#0d9488' }}>₹{fmt(order.total)}</span>
      </div>
    </div>
  </div>
);

const OrderHistoryBlock = ({ orders }) => (
  <div style={{ background: 'linear-gradient(135deg,#f8faff,#eef2ff)', border: '1.5px solid #c7d2fe', borderRadius: 18, padding: 16, marginTop: 8 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg,#818cf8,#6366f1)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Package size={16} color="white" />
      </div>
      <p style={{ fontSize: 13, fontWeight: 800, color: '#312e81', margin: 0 }}>Your Orders ({orders.length})</p>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {orders.map((o, i) => <ChatOrderCard key={i} order={o} index={i} />)}
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ChatProductCard — improved with rating, stock, match score
// ─────────────────────────────────────────────────────────────────────────────
export const ChatProductCard = ({ product, onAddToCart, index = 0 }) => {
  const price = typeof product.price === 'number' ? product.price : parseFloat(product.price || 0);
  const [hov, setHov] = useState(false);
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    onAddToCart(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{ background: 'white', border: `1.5px solid ${hov ? '#5eead4' : '#ccfbf1'}`, borderRadius: 18, padding: 0, display: 'flex', flexDirection: 'column', minWidth: 180, maxWidth: 200, boxShadow: hov ? '0 12px 32px rgba(13,148,136,.18)' : '0 2px 12px rgba(13,148,136,.07)', transition: 'all .2s', flexShrink: 0, transform: hov ? 'translateY(-3px)' : 'none', overflow: 'hidden', animation: `slideInMsg .25s ease ${index * 0.08}s both` }}>
      {/* Image */}
      <div style={{ background: 'linear-gradient(135deg,#f0fdfa,#ccfbf1)', padding: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', height: 110 }}>
        <img src={product.imageUrl || 'https://via.placeholder.com/80/ccfbf1/0d9488?text=P'} alt={product.name}
          style={{ width: 80, height: 80, objectFit: 'contain', transition: 'transform .3s', transform: hov ? 'scale(1.1)' : 'scale(1)' }}
          onError={e => { e.currentTarget.src = 'https://via.placeholder.com/80/ccfbf1/0d9488?text=P'; }} />
        {product.score && (
          <div style={{ position: 'absolute', top: 8, right: 8, background: 'linear-gradient(135deg,#2dd4bf,#0d9488)', color: 'white', fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 20, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Sparkles size={8} />{Math.round(product.score * 100)}%
          </div>
        )}
        {product.stockQuantity === 0 && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#94a3b8' }}>Out of Stock</div>
        )}
      </div>
      {/* Info */}
      <div style={{ padding: '10px 12px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        {product.brand && <p style={{ fontSize: 10, color: '#2dd4bf', fontWeight: 800, margin: 0, textTransform: 'uppercase', letterSpacing: 0.5 }}>{product.brand}</p>}
        <p style={{ fontSize: 12, fontWeight: 700, color: '#064e3b', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', margin: 0, minHeight: 32 }}>{product.name}</p>
        {product.rating > 0 && <StarRating rating={product.rating} size={10} />}
        <p style={{ fontSize: 16, fontWeight: 900, color: '#0d9488', margin: '4px 0 0', letterSpacing: -0.5 }}>₹{fmt(price)}</p>
        <button onClick={handleAdd} disabled={product.stockQuantity === 0}
          style={{ width: '100%', fontSize: 11, background: added ? 'linear-gradient(135deg,#34d399,#10b981)' : product.stockQuantity === 0 ? '#f1f5f9' : 'linear-gradient(135deg,#2dd4bf,#0d9488)', color: product.stockQuantity === 0 ? '#94a3b8' : 'white', border: 'none', padding: '7px 0', borderRadius: 10, cursor: product.stockQuantity === 0 ? 'not-allowed' : 'pointer', fontWeight: 700, fontFamily: 'inherit', marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, transition: 'all .25s', transform: added ? 'scale(.96)' : 'scale(1)' }}>
          {added ? <><CheckCircle size={11} />Added!</> : <><ShoppingCart size={11} />Add to cart</>}
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// parseCartFromText — extracts cart data from AI text response
// e.g. "1. **Samsung TV** (₹45,999)\n2. **iPhone** (₹79,999)\nTotal: ₹1,25,998"
// ─────────────────────────────────────────────────────────────────────────────
const parseCartFromText = (text) => {
  const items = [];
  // Match numbered list items with price
  const itemRe = /\d+\.\s+\*\*(.+?)\*\*.*?(?:₹|Rs\.?)\s*([\d,]+)/g;
  let m;
  while ((m = itemRe.exec(text)) !== null) {
    items.push({ name: m[1].trim(), price: parseInt(m[2].replace(/,/g, ''), 10), qty: 1 });
  }
  // Also try "• Name — ₹price × qty = ₹subtotal" format
  const bulletRe = /[•\-]\s+\*\*(.+?)\*\*\s*(?:—|-)\s*(?:₹|Rs\.?)([\d,]+)\s*×\s*(\d+)\s*=\s*(?:₹|Rs\.?)([\d,]+)/g;
  while ((m = bulletRe.exec(text)) !== null) {
    items.push({ name: m[1].trim(), price: parseInt(m[2].replace(/,/g,''),10), qty: parseInt(m[3],10), subtotal: parseInt(m[4].replace(/,/g,''),10) });
  }
  const totalM = text.match(/[Tt]otal[:\s]*(?:₹|Rs\.?)\s*([\d,]+)/);
  const total = totalM ? parseInt(totalM[1].replace(/,/g,''),10) : 0;
  return items.length > 0 ? { items, total } : null;
};

// parseOrdersFromText — extracts order list from AI text
const parseOrdersFromText = (text) => {
  const orders = [];
  // Match "**ORD-xxx** — ₹price | Status | date"
  const re = /\*\*(ORD-[\w-]+)\*\*\s*(?:—|-)\s*(?:Rs\.|₹)([\d,]+)\s*\|\s*([\w]+)(?:\s*\|\s*(.+?))?(?:\n|$)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const itemLine = text.slice(m.index).match(/\n\s+(.+?)(?:\n|$)/);
    orders.push({ num: m[1], total: parseInt(m[2].replace(/,/g,''),10), status: m[3].trim(), date: m[4]?.trim() || '', items: itemLine?.[1]?.trim() || '' });
  }
  return orders.length > 0 ? orders : null;
};

// ─────────────────────────────────────────────────────────────────────────────
// parseOrderSuccess — detects ORDER_SUCCESS|orderNum|total|items pipe string
// ─────────────────────────────────────────────────────────────────────────────
const parseOrderMessage = (content) => {
  if (!content.startsWith('ORDER_')) return null;
  const [type, orderNum, total, itemsRaw] = content.split('|');
  const items = itemsRaw
    ? itemsRaw.split(';;').filter(Boolean).map(p => {
        const [name, qty, price] = p.split('|');
        return { name, qty: parseInt(qty)||1, price: parseFloat(price)||0 };
      })
    : [];
  return { type, orderNum, total: parseFloat(total)||0, items };
};

// ─────────────────────────────────────────────────────────────────────────────
// OrderSuccessBlock — beautiful order confirmation card
// ─────────────────────────────────────────────────────────────────────────────
const OrderSuccessBlock = ({ parsed, onViewOrders }) => {
  const { type, orderNum, total, items } = parsed;
  const isPending = type === 'ORDER_PENDING';
  const isFail    = type === 'ORDER_FAIL';

  // Failure state
  if (isFail) {
    const [, reason, msg] = (orderNum + '|' + total + '|' + (items[0]?.name||'')).split('|');
    return (
      <div style={{ background:'#fef2f2', border:'1.5px solid #fca5a5', borderRadius:16, padding:'14px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
          <span style={{ fontSize:18 }}>❌</span>
          <p style={{ fontSize:13, fontWeight:800, color:'#dc2626', margin:0 }}>Order Failed</p>
        </div>
        <p style={{ fontSize:13, color:'#7f1d1d', margin:0, lineHeight:1.6 }}>{msg || orderNum}</p>
      </div>
    );
  }

  // Pending/timeout state
  if (isPending) {
    return (
      <div style={{ background:'linear-gradient(135deg,#fffbeb,#fef3c7)', border:'1.5px solid #fcd34d', borderRadius:18, padding:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
          <div style={{ width:36, height:36, background:'linear-gradient(135deg,#fbbf24,#f59e0b)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>⏳</div>
          <div>
            <p style={{ fontSize:14, fontWeight:900, color:'#78350f', margin:0 }}>Order is being processed!</p>
            <p style={{ fontSize:11, color:'#92400e', margin:0 }}>Server is confirming your order</p>
          </div>
        </div>
        <p style={{ fontSize:12, color:'#92400e', lineHeight:1.6, margin:'0 0 12px' }}>
          Your order should be confirmed shortly. Please check your Orders page to view status and complete payment.
        </p>
        <button onClick={onViewOrders}
          style={{ width:'100%', background:'linear-gradient(135deg,#fbbf24,#f59e0b)', color:'white', border:'none', padding:'10px 0', borderRadius:12, fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
          📦 View My Orders
        </button>
      </div>
    );
  }

  // Success state
  return (
    <div style={{ background:'linear-gradient(135deg,#f0fdf4,#dcfce7)', border:'1.5px solid #86efac', borderRadius:20, overflow:'hidden', boxShadow:'0 8px 28px rgba(22,163,74,.12)' }}>
      {/* Header */}
      <div style={{ background:'linear-gradient(135deg,#16a34a,#15803d)', padding:'16px 18px', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:44, height:44, background:'rgba(255,255,255,.2)', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🎉</div>
        <div style={{ flex:1 }}>
          <p style={{ fontSize:15, fontWeight:900, color:'white', margin:0, letterSpacing:-.3 }}>Order Placed Successfully!</p>
          <p style={{ fontSize:11, color:'rgba(255,255,255,.8)', margin:0, fontWeight:600 }}>
            {orderNum ? `#${orderNum}` : 'Processing...'} · Awaiting payment
          </p>
        </div>
        {total > 0 && (
          <div style={{ textAlign:'right' }}>
            <p style={{ fontSize:10, color:'rgba(255,255,255,.7)', margin:0, fontWeight:600 }}>TOTAL</p>
            <p style={{ fontSize:18, fontWeight:900, color:'white', margin:0 }}>₹{fmt(total)}</p>
          </div>
        )}
      </div>

      {/* Items list */}
      {items.length > 0 && (
        <div style={{ padding:'12px 18px', borderBottom:'1px dashed #86efac' }}>
          <p style={{ fontSize:10, fontWeight:800, color:'#15803d', textTransform:'uppercase', letterSpacing:1, margin:'0 0 8px' }}>Items Ordered</p>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {items.map((item, i) => (
              <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 12px', background:'white', borderRadius:12, border:'1px solid #bbf7d0' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:28, height:28, background:'linear-gradient(135deg,#dcfce7,#bbf7d0)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:12 }}>📦</div>
                  <div>
                    <p style={{ fontSize:12, fontWeight:700, color:'#14532d', margin:0, maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{item.name}</p>
                    <p style={{ fontSize:10, color:'#4ade80', margin:0 }}>Qty: {item.qty}</p>
                  </div>
                </div>
                {item.price > 0 && (
                  <p style={{ fontSize:13, fontWeight:900, color:'#16a34a', margin:0 }}>₹{fmt(item.price * item.qty)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment notice + CTA */}
      <div style={{ padding:'12px 18px' }}>
        <div style={{ background:'white', borderRadius:12, padding:'10px 12px', marginBottom:12, border:'1px solid #bbf7d0', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:16 }}>💳</span>
          <p style={{ fontSize:12, color:'#166534', margin:0, lineHeight:1.5 }}>
            <strong>Complete payment</strong> to confirm your order. Go to Orders → Pay Now.
          </p>
        </div>
        <button onClick={onViewOrders}
          style={{ width:'100%', background:'linear-gradient(135deg,#16a34a,#15803d)', color:'white', border:'none', padding:'12px 0', borderRadius:14, fontSize:13, fontWeight:800, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:'0 4px 16px rgba(22,163,74,.35)', transition:'all .2s' }}
          onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 24px rgba(22,163,74,.45)'}}
          onMouseLeave={e=>{e.currentTarget.style.transform='none';e.currentTarget.style.boxShadow='0 4px 16px rgba(22,163,74,.35)'}}>
          📦 View My Orders & Pay Now
        </button>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// RichMessage — renders AI text as beautiful structured content
// ─────────────────────────────────────────────────────────────────────────────
const RichMessage = ({ content, onViewOrders }) => {
  // ── ORDER SUCCESS / FAIL — highest priority ──────────────────
  const orderParsed = parseOrderMessage(content);
  if (orderParsed) {
    return <OrderSuccessBlock parsed={orderParsed} onViewOrders={onViewOrders} />;
  }

  // Try to detect cart content
  const cartData = (content.includes('cart') || content.includes('Cart')) ? parseCartFromText(content) : null;
  const orderData = (content.includes('ORD-') || content.includes('order') || content.includes('Order')) ? parseOrdersFromText(content) : null;

  // Render inline markdown: **bold**, bullet points, line breaks
  const renderInline = (text) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: '#064e3b', fontWeight: 800 }}>{part.slice(2,-2)}</strong>;
      }
      return part;
    });
  };

  // Split into lines and render
  const lines = content.split('\n').filter(l => l.trim());

  // If we detected cart data, show cart summary instead of plain text
  if (cartData && cartData.items.length > 1) {
    // Get the intro text (before the list)
    const introEnd = content.indexOf('\n1.');
    const intro = introEnd > 0 ? content.slice(0, introEnd).trim() : '';
    const outro = content.slice(content.lastIndexOf('₹') + 20).trim();

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {intro && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: '#1e293b' }}>{renderInline(intro)}</p>}
        <CartSummaryBlock items={cartData.items} total={cartData.total} />
        {outro && outro.length > 3 && outro.length < 200 && (
          <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{renderInline(outro)}</p>
        )}
      </div>
    );
  }

  // If order history detected
  if (orderData && orderData.length > 0) {
    const introIdx = content.indexOf('\n**ORD');
    const intro = introIdx > 0 ? content.slice(0, introIdx).trim() : '';
    const outroIdx = content.lastIndexOf('\n\n');
    const outro = outroIdx > 0 ? content.slice(outroIdx).trim() : '';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {intro && <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: '#1e293b' }}>{renderInline(intro)}</p>}
        <OrderHistoryBlock orders={orderData} />
        {outro && outro.length > 3 && outro.length < 200 && (
          <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>{renderInline(outro)}</p>
        )}
      </div>
    );
  }

  // Default: render line by line with markdown
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {lines.map((line, i) => {
        const trimmed = line.trim();

        // Numbered list item  "1. **Name** — ..."
        if (/^\d+\./.test(trimmed)) {
          const num = trimmed.match(/^(\d+)\./)[1];
          const rest = trimmed.replace(/^\d+\.\s*/, '');
          return (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ width: 22, height: 22, background: 'linear-gradient(135deg,#2dd4bf,#0d9488)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: 'white', flexShrink: 0, marginTop: 1 }}>{num}</span>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: '#1e293b' }}>{renderInline(rest)}</p>
            </div>
          );
        }

        // Bullet point  "• text" or "- text"
        if (/^[•\-\*]/.test(trimmed)) {
          const rest = trimmed.replace(/^[•\-\*]\s*/, '');
          return (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <span style={{ width: 6, height: 6, background: '#2dd4bf', borderRadius: '50%', flexShrink: 0, marginTop: 8 }} />
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: '#1e293b' }}>{renderInline(rest)}</p>
            </div>
          );
        }

        // Verdict/highlights line (starts with emoji)
        if (/^[💰⭐🏆⚠️✅❌🎉💳⏳🛒🔍📦🏠🛍️]/.test(trimmed)) {
          return (
            <div key={i} style={{ background: '#f0fdfa', border: '1px solid #ccfbf1', borderRadius: 10, padding: '8px 12px', fontSize: 13, lineHeight: 1.5, color: '#064e3b' }}>
              {renderInline(trimmed)}
            </div>
          );
        }

        // Section header (ends with :)
        if (trimmed.endsWith(':') && trimmed.length < 50 && /^\*\*/.test(trimmed)) {
          return <p key={i} style={{ margin: '6px 0 2px', fontSize: 13, fontWeight: 800, color: '#0d9488' }}>{renderInline(trimmed)}</p>;
        }

        // Regular paragraph
        return trimmed ? (
          <p key={i} style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: '#1e293b' }}>{renderInline(trimmed)}</p>
        ) : <div key={i} style={{ height: 4 }} />;
      })}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// TypingIndicator
// ─────────────────────────────────────────────────────────────────────────────
const TypingIndicator = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
    <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#2dd4bf,#0d9488)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 12px rgba(13,148,136,.3)', flexShrink: 0 }}>
      <Bot size={19} color="white" />
    </div>
    <div style={{ background: 'white', border: '1px solid #ccfbf1', borderRadius: '20px 20px 20px 4px', padding: '14px 18px', boxShadow: '0 2px 10px rgba(13,148,136,.08)', display: 'flex', gap: 5, alignItems: 'center' }}>
      {[0,1,2].map(i => (
        <div key={i} style={{ width: 9, height: 9, background: '#2dd4bf', borderRadius: '50%', animation: `dotPulse${i+1} 1.4s ease-in-out infinite` }} />
      ))}
      <span style={{ fontSize: 12, color: '#94a3b8', marginLeft: 4, fontStyle: 'italic' }}>ShopAI is thinking…</span>
    </div>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// FullPageChat — main chat overlay
// ─────────────────────────────────────────────────────────────────────────────
export const FullPageChat = ({ user, chatMessages = [], setChatMessages, onClose, addToCart, setError, setCurrentPage }) => {
  const [msg, setMsg] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const endRef   = useRef(null);
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
    setChatMessages(prev => [...prev, { role: 'user', content: t, ts: Date.now() }]);
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
        ts: Date.now(),
      }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting right now. Please try again.", ts: Date.now() }]);
    } finally { setIsTyping(false); }
  };

  const handleChatAdd = (product) => {
    addToCart(product, setError);
    setChatMessages(prev => [...prev, {
      role: 'assistant',
      content: `✅ **${product.name}** added to your cart!`,
      ts: Date.now(),
    }]);
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, display: 'flex', animation: 'chatOpen .28s ease', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      <style>{`
        @keyframes dotPulse1 { 0%,80%,100%{transform:scale(0);opacity:.3} 40%{transform:scale(1);opacity:1} }
        @keyframes dotPulse2 { 0%,20%,80%,100%{transform:scale(0);opacity:.3} 50%{transform:scale(1);opacity:1} }
        @keyframes dotPulse3 { 0%,40%,80%,100%{transform:scale(0);opacity:.3} 60%{transform:scale(1);opacity:1} }
        @keyframes slideInMsg { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes chatOpen { from{opacity:0;transform:scale(0.97)} to{opacity:1;transform:scale(1)} }
        @keyframes pulseRing { 0%,100%{box-shadow:0 0 0 0 rgba(56,189,248,.4)} 60%{box-shadow:0 0 0 10px rgba(56,189,248,0)} }
        @keyframes floatImg { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .chat-scroll::-webkit-scrollbar { width:4px; }
        .chat-scroll::-webkit-scrollbar-thumb { background:#99f6e4; border-radius:4px; }
        .quick-chip:hover { background:white !important; transform:translateX(4px) !important; box-shadow:0 4px 12px rgba(13,148,136,.15) !important; }
      `}</style>

      {/* ── LEFT SIDEBAR ── */}
      <div style={{ width: 280, background: 'linear-gradient(180deg,#ccfbf1 0%,#99f6e4 50%,#6ee7b7 100%)', display: 'flex', flexDirection: 'column', padding: '22px 16px', gap: 20, flexShrink: 0, boxShadow: '4px 0 24px rgba(13,148,136,.14)' }}>

        {/* Bot identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 50, height: 50, borderRadius: 16, background: 'linear-gradient(135deg,#2dd4bf,#0f766e)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(13,148,136,.4)', animation: 'floatImg 3s ease-in-out infinite', flexShrink: 0 }}>
            <Bot size={24} color="white" />
          </div>
          <div>
            <p style={{ fontSize: 18, fontWeight: 900, color: '#064e3b', margin: 0, letterSpacing: -.4 }}>ShopAI</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 7, height: 7, background: '#22c55e', borderRadius: '50%', animation: 'pulseRing 1.5s infinite' }} />
              <p style={{ fontSize: 11, color: '#065f46', fontWeight: 700, margin: 0 }}>Online · Always ready</p>
            </div>
          </div>
        </div>

        {/* Welcome card */}
        <div style={{ background: 'rgba(255,255,255,.72)', borderRadius: 16, padding: 14, backdropFilter: 'blur(6px)' }}>
          <p style={{ fontSize: 13, fontWeight: 800, color: '#064e3b', margin: '0 0 5px' }}>
            👋 Hi {user?.fullName?.split(' ')[0] || user?.name?.split(' ')[0] || 'there'}!
          </p>
          <p style={{ fontSize: 12, color: '#065f46', lineHeight: 1.7, margin: 0 }}>
            I can search products, manage your cart, compare items, and place orders.
          </p>
        </div>

        {/* Quick chips */}
        <div>
          <p style={{ fontSize: 10, fontWeight: 800, color: '#065f46', textTransform: 'uppercase', letterSpacing: 1.2, margin: '0 0 8px' }}>Quick Actions</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {QUICK_CHIPS.map((chip, i) => (
              <button key={i} onClick={() => sendMessage(chip.msg)} className="quick-chip"
                style={{ background: 'rgba(255,255,255,.62)', border: '1px solid rgba(255,255,255,.9)', borderRadius: 11, padding: '9px 13px', fontSize: 12, fontWeight: 600, color: '#064e3b', cursor: 'pointer', textAlign: 'left', transition: 'all .2s', fontFamily: 'inherit' }}>
                {chip.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
          {[
            { icon: <MessageSquare size={13} />, label: 'Messages', val: chatMessages.filter(m=>m.role==='user').length },
            { icon: <TrendingUp size={13} />, label: 'Actions', val: chatMessages.filter(m=>m.role==='assistant').length },
          ].map((s, i) => (
            <div key={i} style={{ flex: 1, background: 'rgba(255,255,255,.5)', borderRadius: 12, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ color: '#0d9488', marginBottom: 2 }}>{s.icon}</div>
              <p style={{ fontSize: 18, fontWeight: 900, color: '#064e3b', margin: 0 }}>{s.val}</p>
              <p style={{ fontSize: 10, color: '#065f46', margin: 0, fontWeight: 600 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── MAIN CHAT ── */}
      <div style={{ flex: 1, background: '#f0fdfa', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Top bar */}
        <div style={{ background: 'white', padding: '14px 28px', borderBottom: '1px solid #ccfbf1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 2px 10px rgba(13,148,136,.07)', flexShrink: 0 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 900, color: '#064e3b', margin: 0 }}>AI Shopping Assistant</h2>
            <p style={{ fontSize: 12, color: '#2dd4bf', margin: 0, fontWeight: 600 }}>
              {isTyping ? '✨ Thinking…' : 'Powered by AI · Ready to help'}
            </p>
          </div>
          <button onClick={onClose}
            style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#fef2f2', color: '#ef4444', border: '1.5px solid #fca5a5', borderRadius: 12, padding: '9px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 700, transition: 'all .2s', fontFamily: 'inherit' }}
            onMouseEnter={e => { e.currentTarget.style.background='#ef4444'; e.currentTarget.style.color='white'; e.currentTarget.style.borderColor='#ef4444'; }}
            onMouseLeave={e => { e.currentTarget.style.background='#fef2f2'; e.currentTarget.style.color='#ef4444'; e.currentTarget.style.borderColor='#fca5a5'; }}>
            <X size={15} /> Close Chat
          </button>
        </div>

        {/* Messages */}
        <div className="chat-scroll" style={{ flex: 1, overflowY: 'auto', padding: '28px 36px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Empty state */}
          {chatMessages.length === 0 && (
            <div style={{ textAlign: 'center', paddingTop: 60, animation: 'slideInMsg .5s ease' }}>
              <div style={{ width: 90, height: 90, background: 'linear-gradient(135deg,#ccfbf1,#99f6e4)', borderRadius: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 8px 28px rgba(13,148,136,.2)', animation: 'floatImg 3s ease-in-out infinite' }}>
                <Sparkles size={42} color="#0d9488" />
              </div>
              <h3 style={{ fontSize: 24, fontWeight: 900, color: '#064e3b', margin: '0 0 8px' }}>How can I help you today?</h3>
              <p style={{ fontSize: 14, color: '#64748b', lineHeight: 1.7, margin: 0 }}>
                Ask me to find products, compare prices,<br />check your orders, or get recommendations.
              </p>
            </div>
          )}

          {/* Message bubbles */}
          {chatMessages.map((m, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 12, animation: 'slideInMsg .28s ease both' }}>

              {/* Bot avatar */}
              {m.role === 'assistant' && (
                <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#2dd4bf,#0d9488)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 4, boxShadow: '0 4px 12px rgba(13,148,136,.3)' }}>
                  <Bot size={19} color="white" />
                </div>
              )}

              <div style={{ maxWidth: m.role === 'user' ? '55%' : '70%', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Bubble */}
                <div style={{
                  padding: '13px 17px',
                  borderRadius: m.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                  background: m.role === 'user' ? 'linear-gradient(135deg,#2dd4bf,#0d9488)' : 'white',
                  color: m.role === 'user' ? 'white' : '#1e293b',
                  boxShadow: m.role === 'user' ? '0 4px 16px rgba(13,148,136,.35)' : '0 2px 12px rgba(13,148,136,.1)',
                  border: m.role === 'assistant' ? '1px solid #e2f7f3' : 'none',
                }}>
                  {m.role === 'user'
                    ? <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, fontWeight: 500 }}>{m.content}</p>
                    : <RichMessage content={m.content} onViewOrders={() => { onClose(); if(setCurrentPage) setCurrentPage('orders'); }} />
                  }
                </div>

                {/* Timestamp */}
                {m.ts && (
                  <p style={{ fontSize: 10, color: '#cbd5e1', margin: 0, textAlign: m.role === 'user' ? 'right' : 'left', paddingLeft: m.role === 'assistant' ? 4 : 0, paddingRight: m.role === 'user' ? 4 : 0 }}>
                    {formatTime(m.ts)}
                  </p>
                )}

                {/* Product cards carousel */}
                {m.role === 'assistant' && m.products && m.products.length > 0 && (
                  <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 6, paddingTop: 2 }}>
                    {m.products.slice(0, 4).map((p, pi) => (
                      <ChatProductCard key={pi} product={p} onAddToCart={handleChatAdd} index={pi} />
                    ))}
                  </div>
                )}
              </div>

              {/* User avatar */}
              {m.role === 'user' && (
                <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#99f6e4,#5eead4)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 4, fontSize: 15, fontWeight: 900, color: '#065f46' }}>
                  {(user?.fullName?.[0] || user?.name?.[0] || 'U').toUpperCase()}
                </div>
              )}
            </div>
          ))}

          {isTyping && <TypingIndicator />}
          <div ref={endRef} />
        </div>

        {/* Input bar */}
        <div style={{ background: 'white', borderTop: '1px solid #ccfbf1', padding: '16px 36px', display: 'flex', gap: 12, alignItems: 'center', flexShrink: 0, boxShadow: '0 -4px 16px rgba(13,148,136,.05)' }}>
          <input ref={inputRef} type="text" value={msg}
            onChange={e => setMsg(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask about products, cart, orders…"
            disabled={isTyping}
            style={{ flex: 1, border: '1.5px solid #99f6e4', borderRadius: 16, padding: '14px 20px', fontSize: 14, outline: 'none', background: '#f8fffe', color: '#064e3b', fontFamily: 'inherit', transition: 'all .2s' }}
            onFocus={e => { e.currentTarget.style.borderColor='#2dd4bf'; e.currentTarget.style.background='white'; e.currentTarget.style.boxShadow='0 0 0 4px rgba(45,212,191,.12)'; }}
            onBlur={e => { e.currentTarget.style.borderColor='#99f6e4'; e.currentTarget.style.background='#f8fffe'; e.currentTarget.style.boxShadow='none'; }} />
          <button onClick={() => sendMessage()} disabled={!msg.trim() || isTyping}
            style={{ width: 52, height: 52, borderRadius: 16, border: 'none', background: !msg.trim() || isTyping ? '#e2f7f3' : 'linear-gradient(135deg,#2dd4bf,#0d9488)', color: !msg.trim() || isTyping ? '#94a3b8' : 'white', cursor: !msg.trim() || isTyping ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s', boxShadow: !msg.trim() || isTyping ? 'none' : '0 6px 18px rgba(13,148,136,.4)' }}
            onMouseEnter={e => { if (msg.trim() && !isTyping) e.currentTarget.style.transform='scale(1.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform='none'; }}>
            {isTyping ? <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FullPageChat;