import React, { useState } from 'react';
import { ArrowLeft, ShoppingCart, Star, CheckCircle, MessageSquare } from 'lucide-react';

const REVIEWS_STORAGE_KEY = 'shopai_product_reviews_v1';

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

const getProductId = (product) =>
  product?.id || product?._id?.$oid || product?._id || product?.Id || null;

const readAllReviews = () => {
  try {
    const raw = localStorage.getItem(REVIEWS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
};

const readProductReviews = (productId) => {
  if (!productId) return [];
  const all = readAllReviews();
  const list = Array.isArray(all[productId]) ? all[productId] : [];
  return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
};

const saveProductReview = (productId, review) => {
  if (!productId) return;
  const all = readAllReviews();
  const current = Array.isArray(all[productId]) ? all[productId] : [];
  all[productId] = [review, ...current];
  localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(all));
};

const RatingStars = ({ value, interactive = false, onChange }) => {
  const safe = Number.isFinite(Number(value)) ? Number(value) : 0;

  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1, 2, 3, 4, 5].map((num) => {
        const active = num <= safe;
        return (
          <button
            key={num}
            type="button"
            onClick={() => interactive && onChange?.(num)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: interactive ? 'pointer' : 'default',
              display: 'flex'
            }}
            aria-label={`Rate ${num} star`}
          >
            <Star
              size={18}
              style={{
                color: active ? '#f59e0b' : '#cbd5e1',
                fill: active ? '#f59e0b' : '#cbd5e1',
                transition: 'all .15s ease'
              }}
            />
          </button>
        );
      })}
    </div>
  );
};

const ProductDetailPage = ({
  selectedProduct,
  setCurrentPage,
  addToCart,
  setError,
  user
}) => {
  const product = selectedProduct || null;
  const productId = getProductId(product);
  const [qty, setQty] = useState(1);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [reviews, setReviews] = useState(() => readProductReviews(productId));

  if (!product) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <button
          onClick={() => setCurrentPage('products')}
          style={{ border: 'none', background: '#0d9488', color: 'white', borderRadius: 10, padding: '10px 16px', cursor: 'pointer' }}
        >
          Back To Products
        </button>
      </div>
    );
  }

  const basePrice = getPrice(product);
  const category = getCategoryName(product);

  const userReviewsCount = reviews.length;
  const userAverageRating = userReviewsCount
    ? (reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / userReviewsCount)
    : 0;

  const apiRating = getRating(product);
  const apiReviewCount = Number(product.reviewCount || 0);

  const combinedReviewCount = apiReviewCount + userReviewsCount;
  const combinedRating = combinedReviewCount === 0
    ? null
    : (((apiRating || 0) * apiReviewCount) + (userAverageRating * userReviewsCount)) / combinedReviewCount;

  const onAddQtyToCart = () => {
    for (let i = 0; i < qty; i += 1) {
      addToCart(product, setError);
    }
  };

  const submitReview = (e) => {
    e.preventDefault();
    const comment = newComment.trim();

    if (!productId) {
      setError?.('Cannot add review: product id missing.');
      return;
    }

    if (!comment) {
      setError?.('Please write a review comment.');
      return;
    }

    const review = {
      id: `${productId}-${Date.now()}`,
      userName: user?.name || user?.fullName || 'Customer',
      rating: newRating,
      comment,
      createdAt: new Date().toISOString()
    };

    saveProductReview(productId, review);
    const updated = readProductReviews(productId);
    setReviews(updated);
    setNewComment('');
    setNewRating(5);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#ecfeff 0%,#f8fafc 45%,#ffffff 100%)' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '16px' }}>
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => setCurrentPage('products')}
            style={{
              border: '1.5px solid #99f6e4',
              color: '#0d9488',
              background: 'white',
              borderRadius: 999,
              padding: '10px 14px',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              cursor: 'pointer'
            }}
          >
            <ArrowLeft size={16} /> Back To Products
          </button>

          <div style={{ color: '#0f766e', fontSize: 13, fontWeight: 700 }}>
            {category}
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr)',
          gap: 18
        }}>
          <div className="product-detail-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 420px) minmax(0, 1fr)',
            gap: 18,
            background: 'white',
            border: '1px solid #ccfbf1',
            borderRadius: 20,
            overflow: 'hidden'
          }}>
            <div style={{ padding: 18, background: 'linear-gradient(140deg,#f0fdfa,#ccfbf1)' }}>
              <div style={{ borderRadius: 18, background: 'white', minHeight: 360, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={product.imageUrl || 'https://via.placeholder.com/380/ccfbf1/0d9488?text=Product'}
                  alt={product.name}
                  style={{ width: '88%', height: '88%', objectFit: 'contain' }}
                  onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/380/ccfbf1/0d9488?text=Product'; }}
                />
              </div>
            </div>

            <div style={{ padding: 20 }}>
              <h1 style={{ margin: 0, fontSize: 30, color: '#064e3b', lineHeight: 1.2 }}>{product.name}</h1>
              <p style={{ margin: '8px 0 0', color: '#64748b', fontWeight: 600 }}>{product.brand || 'ShopAI'}</p>

              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <RatingStars value={combinedRating ? Number(combinedRating.toFixed(1)) : 0} />
                <span style={{ color: '#f59e0b', fontWeight: 800 }}>
                  {combinedRating ? combinedRating.toFixed(1) : 'No rating yet'}
                </span>
                <span style={{ color: '#94a3b8', fontSize: 13 }}>
                  ({combinedReviewCount} reviews)
                </span>
              </div>

              <div style={{ marginTop: 14, display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 34, fontWeight: 900, color: '#0d9488' }}>₹{basePrice.toLocaleString()}</span>
                <span style={{ color: '#94a3b8', textDecoration: 'line-through' }}>
                  ₹{Math.round(basePrice * 1.2).toLocaleString()}
                </span>
                <span style={{ background: '#fef3c7', color: '#d97706', borderRadius: 999, padding: '4px 10px', fontWeight: 800, fontSize: 12 }}>
                  20% OFF
                </span>
              </div>

              <div style={{ marginTop: 16, color: '#475569', lineHeight: 1.7 }}>
                {product.description || 'No detailed description available for this product yet.'}
              </div>

              <div style={{
                marginTop: 18,
                padding: 14,
                borderRadius: 14,
                border: '1px solid #ccfbf1',
                background: '#f8fffe',
                display: 'grid',
                gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                gap: 10
              }}>
                <div style={{ fontSize: 13 }}><strong style={{ color: '#0f766e' }}>Category:</strong> {category}</div>
                <div style={{ fontSize: 13 }}><strong style={{ color: '#0f766e' }}>Stock:</strong> {product.stockQuantity > 0 ? `${product.stockQuantity} available` : 'Out of stock'}</div>
                <div style={{ fontSize: 13 }}><strong style={{ color: '#0f766e' }}>Delivery:</strong> Free above ₹499</div>
                <div style={{ fontSize: 13 }}><strong style={{ color: '#0f766e' }}>Return:</strong> 7-day policy</div>
              </div>

              <div style={{ marginTop: 18, display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', border: '1px solid #99f6e4', borderRadius: 999, overflow: 'hidden' }}>
                  <button type="button" onClick={() => setQty((p) => Math.max(1, p - 1))} style={{ border: 'none', background: '#f0fdfa', padding: '10px 14px', cursor: 'pointer', fontWeight: 800 }}>-</button>
                  <div style={{ minWidth: 42, textAlign: 'center', fontWeight: 800, color: '#064e3b' }}>{qty}</div>
                  <button type="button" onClick={() => setQty((p) => p + 1)} style={{ border: 'none', background: '#f0fdfa', padding: '10px 14px', cursor: 'pointer', fontWeight: 800 }}>+</button>
                </div>

                <button
                  type="button"
                  onClick={onAddQtyToCart}
                  disabled={product.stockQuantity === 0}
                  style={{
                    border: 'none',
                    borderRadius: 999,
                    padding: '12px 20px',
                    background: product.stockQuantity === 0 ? '#e2e8f0' : 'linear-gradient(135deg,#2dd4bf,#0d9488)',
                    color: product.stockQuantity === 0 ? '#64748b' : 'white',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    cursor: product.stockQuantity === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  <ShoppingCart size={16} />
                  {product.stockQuantity === 0 ? 'Out of Stock' : `Add ${qty > 1 ? `${qty}x ` : ''}To Cart`}
                </button>
              </div>
            </div>
          </div>

          <div style={{
            background: 'white',
            border: '1px solid #ccfbf1',
            borderRadius: 20,
            padding: 18
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <MessageSquare size={18} color="#0d9488" />
              <h2 style={{ margin: 0, fontSize: 20, color: '#064e3b' }}>Ratings & Reviews</h2>
            </div>

            <form onSubmit={submitReview} style={{
              border: '1px solid #ccfbf1',
              borderRadius: 14,
              background: '#f8fffe',
              padding: 14,
              marginBottom: 16
            }}>
              <p style={{ margin: '0 0 8px', fontSize: 13, color: '#475569', fontWeight: 700 }}>
                Add your review
              </p>
              <RatingStars value={newRating} interactive onChange={setNewRating} />
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={4}
                placeholder="How was this product for you?"
                style={{
                  width: '100%',
                  marginTop: 10,
                  border: '1.5px solid #99f6e4',
                  borderRadius: 10,
                  padding: 10,
                  resize: 'vertical',
                  fontFamily: 'inherit'
                }}
              />
              <button
                type="submit"
                style={{
                  marginTop: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg,#2dd4bf,#0d9488)',
                  color: 'white',
                  padding: '10px 14px',
                  borderRadius: 10,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <CheckCircle size={16} /> Submit Review
              </button>
            </form>

            {reviews.length === 0 ? (
              <div style={{ color: '#94a3b8', fontSize: 14 }}>No user reviews yet. Be the first to review this product.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {reviews.map((rev) => (
                  <div key={rev.id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <strong style={{ color: '#064e3b' }}>{rev.userName}</strong>
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>{new Date(rev.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div style={{ marginTop: 6 }}>
                      <RatingStars value={rev.rating} />
                    </div>
                    <p style={{ margin: '8px 0 0', color: '#475569', lineHeight: 1.5 }}>{rev.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 980px) {
          .product-detail-grid {
            grid-template-columns: minmax(0, 1fr);
          }
        }
      `}</style>
    </div>
  );
};

export default ProductDetailPage;
