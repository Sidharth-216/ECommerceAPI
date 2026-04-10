import { useState, useEffect, useCallback } from 'react';
import { cartAPI, getUserIdFromToken, getMongoId } from '../api';

/**
 * CART ISOLATION FIX
 * ─────────────────────────────────────────────────────────────────────────────
 * ROOT PROBLEM: Every cart operation was calling
 *   localStorage.setItem('cart', ...)
 * localStorage is shared across ALL tabs. So when Tab B (User B) fetched their
 * cart, it overwrote the cart that Tab A (User A) had stored. On any re-render
 * or refresh, Tab A would call loadGuestCart() which reads localStorage and
 * display User B's cart items.
 *
 * FIX: Use sessionStorage for cart caching. sessionStorage is tab-scoped —
 * each tab has its own completely independent copy.
 *
 * Rules:
 *   - Authenticated user  → fetch from backend API, cache in sessionStorage
 *   - Guest (no user)     → read/write sessionStorage only
 *   - localStorage.cart   → never written, never read (breaking change is safe
 *                           because the backend is the source of truth for
 *                           authenticated users, and guests don't switch tabs)
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Storage helpers (sessionStorage only for cart) ───────────────────────────

const saveCartToSession = (cartItems) => {
  try {
    sessionStorage.setItem('cart', JSON.stringify(cartItems));
  } catch (e) {
    console.warn('⚠️ Could not save cart to sessionStorage:', e);
  }
};

const loadCartFromSession = () => {
  try {
    const stored = sessionStorage.getItem('cart');
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.warn('⚠️ Could not read cart from sessionStorage:', e);
    return [];
  }
};

// ── Hook ─────────────────────────────────────────────────────────────────────

export const useCart = (user) => {
  const [cart, setCart] = useState([]);

  // ── Guest cart (tab-scoped) ───────────────────────────────────────────
  const loadGuestCart = () => {
    const items = loadCartFromSession();
    setCart(items);
  };

  // ── Authenticated cart ────────────────────────────────────────────────
  const fetchCart = useCallback(async () => {
    if (!user) {
      loadGuestCart();
      return;
    }

    try {
      const userId = getUserIdFromToken();

      if (!userId) {
        console.error('❌ No user ID found in token');
        setCart([]);
        return;
      }

      console.log('🛒 Fetching cart for user:', userId);

      const response = await cartAPI.view(userId);
      const backendCart = response.data?.items || response.data || [];

      console.log('✅ Cart fetched:', backendCart.length, 'items');

      setCart(backendCart);
      // Cache in THIS tab's sessionStorage only — never localStorage
      saveCartToSession(backendCart);
    } catch (err) {
      console.error('❌ Error fetching cart:', err);
      // Fallback to whatever this tab cached — don't touch other tabs
      const cached = loadCartFromSession();
      setCart(cached);
    }
  }, [user]);

  // Fetch cart whenever the user changes (login, logout, rehydration)
  useEffect(() => {
    if (user) {
      fetchCart();
    } else {
      // Guest — load from this tab's sessionStorage only
      loadGuestCart();
    }
  }, [user, fetchCart]);

  const loadCart = async () => {
    await fetchCart();
  };

  // ── Add to cart ───────────────────────────────────────────────────────
  const addToCart = async (product, setError) => {
    console.group('➕ Add to Cart');
    console.log('Product object:', product);

    const productId = getMongoId(product);
    console.log('Extracted product ID:', productId);

    if (!productId) {
      console.error('❌ Could not extract product ID from:', product);
      console.groupEnd();
      setError && setError('Product ID not found. Please try again.');
      return;
    }

    const normalizedProduct = {
      productId,
      productIdString: productId,
      productName: product.name || product.productName || 'Unknown Product',
      price:       product.price    || 0,
      quantity:    1,
      imageUrl:    product.imageUrl || product.image || '',
      brand:       product.brand    || '',
      category:    product.category || product.categoryName || ''
    };

    if (!normalizedProduct.productName) {
      console.error('❌ Product name missing');
      console.groupEnd();
      setError && setError('Product information incomplete.');
      return;
    }

    if (user) {
      try {
        const userId = getUserIdFromToken();

        if (!userId) {
          console.error('❌ No user ID found');
          console.groupEnd();
          setError && setError('User ID not found. Please login again.');
          return;
        }

        const response = await cartAPI.add(userId, { productId, quantity: 1 });
        console.log('API response:', response.data);

        const cartData    = response.data;
        const updatedCart = Array.isArray(cartData?.items)
          ? cartData.items
          : Array.isArray(cartData)
          ? cartData
          : [];

        setCart(updatedCart);
        saveCartToSession(updatedCart); // tab-scoped only
        setError && setError('');

        console.log('✅ Item added to cart successfully');
        console.groupEnd();

      } catch (err) {
        console.error('❌ Error adding to cart:', err);
        console.groupEnd();

        if (err.response?.status === 404) {
          setError && setError('Product not found in catalog.');
        } else if (err.response?.status === 400) {
          setError && setError(err.response?.data?.message || 'Invalid request.');
        } else {
          setError && setError(err.response?.data?.message || err.message || 'Failed to add item to cart.');
        }
      }

    } else {
      // Guest cart — tab-scoped sessionStorage only
      const updatedCart = [...cart];
      const existing    = updatedCart.find(item =>
        String(item.productId) === String(productId)
      );

      if (existing) {
        existing.quantity += 1;
      } else {
        updatedCart.push(normalizedProduct);
      }

      setCart(updatedCart);
      saveCartToSession(updatedCart);
      setError && setError('');
      console.log('✅ Guest cart updated');
      console.groupEnd();
    }
  };

  // ── Update quantity ───────────────────────────────────────────────────
  const updateCartQuantity = async (productId, quantity, setError) => {
    if (quantity <= 0) {
      await removeFromCart(productId, setError);
      return;
    }

    if (user) {
      try {
        const userId = getUserIdFromToken();

        if (!userId) {
          setError && setError('User session invalid. Please login again.');
          return;
        }

        const productIdString = String(productId);
        await cartAPI.update(userId, productIdString, quantity);

        setCart(prev => {
          const updatedCart = prev.map(item => {
            const itemId = String(item.productIdString || item.productId);
            return itemId === productIdString ? { ...item, quantity } : item;
          });
          saveCartToSession(updatedCart);
          return updatedCart;
        });

        setError && setError('');
        console.log('✅ Cart quantity updated');

      } catch (err) {
        console.error('❌ Error updating cart:', err);
        setError && setError(err.response?.data?.message || 'Failed to update cart');
      }

    } else {
      setCart(prev => {
        const updatedCart = prev.map(item =>
          String(item.productId) === String(productId)
            ? { ...item, quantity }
            : item
        );
        saveCartToSession(updatedCart);
        return updatedCart;
      });
    }
  };

  // ── Remove item ───────────────────────────────────────────────────────
  const removeFromCart = async (productId, setError) => {
    if (user) {
      try {
        const userId = getUserIdFromToken();

        if (!userId) {
          setError && setError('User session invalid. Please login again.');
          return;
        }

        const productIdString = String(productId);
        await cartAPI.remove(userId, productIdString);

        setCart(prev => {
          const updatedCart = prev.filter(item => {
            const itemId = String(item.productIdString || item.productId);
            return itemId !== productIdString;
          });
          saveCartToSession(updatedCart);
          return updatedCart;
        });

        setError && setError('');
        console.log('✅ Item removed from cart');

      } catch (err) {
        console.error('❌ Error removing from cart:', err);
        setError && setError(err.response?.data?.message || 'Failed to remove item');
      }

    } else {
      setCart(prev => {
        const updatedCart = prev.filter(item =>
          String(item.productId) !== String(productId)
        );
        saveCartToSession(updatedCart);
        return updatedCart;
      });
    }
  };

  // ── Clear cart ────────────────────────────────────────────────────────
  const clearCart = async (setError) => {
    if (user) {
      try {
        const userId = getUserIdFromToken();

        if (!userId) {
          setError && setError('User session invalid. Please login again.');
          return;
        }

        await cartAPI.clear(userId);

        setCart([]);
        sessionStorage.removeItem('cart'); // clear this tab's cache only
        setError && setError('');
        console.log('✅ Cart cleared');

      } catch (err) {
        console.error('❌ Error clearing cart:', err);
        setError && setError(err.response?.data?.message || 'Failed to clear cart');
      }

    } else {
      setCart([]);
      sessionStorage.removeItem('cart');
      setError && setError('');
    }
  };

  return {
    cart,
    setCart,
    loadCart,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart
  };
};