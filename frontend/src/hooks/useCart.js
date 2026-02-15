import { useState, useEffect } from 'react';
import { cartAPI, getUserIdFromToken, getMongoId } from '../api';

export const useCart = (user) => {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    if (user) {
      fetchCart();
    } else {
      // Load guest cart from localStorage
      loadGuestCart();
    }
  }, [user]);

  const loadGuestCart = () => {
    const storedCart = localStorage.getItem('cart');
    if (storedCart) {
      try {
        setCart(JSON.parse(storedCart));
      } catch (e) {
        console.error('Error parsing cart from localStorage:', e);
        setCart([]);
      }
    }
  };

  const fetchCart = async () => {
    if (!user) {
      loadGuestCart();
      return;
    }

    try {
      const userId = getUserIdFromToken();
      
      if (!userId) {
        console.error('❌ No user ID found in token');
        loadGuestCart();
        return;
      }

      console.log('🛒 Fetching cart for user:', userId);

      const response = await cartAPI.view(userId);
      const backendCart = response.data?.items || response.data || [];
      
      console.log('✅ Cart fetched:', backendCart.length, 'items');
      
      setCart(backendCart);
      localStorage.setItem('cart', JSON.stringify(backendCart));
    } catch (err) {
      console.error('❌ Error fetching cart:', err);
      
      // Fallback to localStorage on error
      loadGuestCart();
    }
  };

  const loadCart = async () => {
    await fetchCart();
  };

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

    // Normalize product data
    const normalizedProduct = {
      productId: productId,
      productIdString: productId, // For cart display
      productName: product.name || product.productName || 'Unknown Product',
      price: product.price || 0,
      quantity: 1,
      imageUrl: product.imageUrl || product.image || '',
      brand: product.brand || '',
      category: product.category || product.categoryName || ''
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

        console.log('API call params:', {
          userId: userId,
          productId: productId,
          quantity: 1
        });

        const response = await cartAPI.add(userId, { 
          productId: productId,
          quantity: 1 
        });

        console.log('API response:', response.data);

        // Update cart from response
        const cartData = response.data;
        const updatedCart = Array.isArray(cartData?.items) 
          ? cartData.items 
          : Array.isArray(cartData) 
          ? cartData 
          : [];
        
        setCart(updatedCart);
        localStorage.setItem('cart', JSON.stringify(updatedCart));
        setError && setError('');
        
        console.log('✅ Item added to cart successfully');
        console.groupEnd();
        
      } catch (err) {
        console.error('❌ Error adding to cart:', err);
        console.error('Error response:', err.response?.data);
        console.groupEnd();
        
        if (err.response?.status === 404) {
          setError && setError('Product not found in catalog.');
        } else if (err.response?.status === 400) {
          const errorMsg = err.response?.data?.message || 'Invalid request. Check product details.';
          setError && setError(errorMsg);
        } else {
          setError && setError(err.response?.data?.message || err.message || 'Failed to add item to cart.');
        }
      }
    } else {
      // Guest cart - localStorage only
      console.log('Guest user - updating localStorage');
      
      const updatedCart = [...cart];
      const existing = updatedCart.find(item => 
        String(item.productId) === String(productId)
      );
      
      if (existing) {
        existing.quantity += 1;
        console.log('✅ Quantity increased for existing item');
      } else {
        updatedCart.push(normalizedProduct);
        console.log('✅ New item added to cart');
      }
      
      setCart(updatedCart);
      localStorage.setItem('cart', JSON.stringify(updatedCart));
      setError && setError('');
      console.groupEnd();
    }
  };

  const updateCartQuantity = async (productId, quantity, setError) => {
    console.group('🔄 Update Cart Quantity');
    console.log('Product ID:', productId);
    console.log('New Quantity:', quantity);
    
    if (quantity <= 0) {
      console.log('Quantity is 0 or less, removing item');
      console.groupEnd();
      await removeFromCart(productId, setError);
      return;
    }

    if (user) {
      try {
        const userId = getUserIdFromToken();
        
        if (!userId) {
          console.error('❌ No user ID found');
          console.groupEnd();
          setError && setError('User session invalid. Please login again.');
          return;
        }

        const productIdString = String(productId);

        console.log('API call:', {
          userId: userId,
          productId: productIdString,
          quantity: quantity
        });

        await cartAPI.update(userId, productIdString, quantity);
        
        console.log('✅ API call successful');
        
        // Update local state
        setCart(prev => {
          const updatedCart = prev.map(item => {
            const itemId = String(item.productIdString || item.productId);
            return itemId === productIdString ? { ...item, quantity } : item;
          });
          
          console.log('Updated cart:', updatedCart);
          localStorage.setItem('cart', JSON.stringify(updatedCart));
          return updatedCart;
        });
        
        setError && setError('');
        console.log('✅ Cart updated successfully');
        console.groupEnd();
        
      } catch (err) {
        console.error('❌ Error updating cart:', err);
        console.groupEnd();
        setError && setError(err.response?.data?.message || 'Failed to update cart');
      }
    } else {
      // Guest cart
      console.log('Guest user - updating localStorage');
      setCart(prev => {
        const updatedCart = prev.map(item =>
          String(item.productId) === String(productId)
            ? { ...item, quantity }
            : item
        );
        localStorage.setItem('cart', JSON.stringify(updatedCart));
        return updatedCart;
      });
      console.log('✅ Guest cart updated');
      console.groupEnd();
    }
  };

  const removeFromCart = async (productId, setError) => {
    console.group('🗑️ Remove from Cart');
    console.log('Product ID to remove:', productId);
    
    if (user) {
      try {
        const userId = getUserIdFromToken();
        
        if (!userId) {
          console.error('❌ No user ID found');
          console.groupEnd();
          setError && setError('User session invalid. Please login again.');
          return;
        }

        const productIdString = String(productId);

        console.log('API call:', {
          userId: userId,
          productId: productIdString
        });

        await cartAPI.remove(userId, productIdString);
        
        console.log('✅ API call successful');
        
        // Update local state
        setCart(prev => {
          const updatedCart = prev.filter(item => {
            const itemId = String(item.productIdString || item.productId);
            return itemId !== productIdString;
          });
          
          console.log('Updated cart after removal:', updatedCart);
          localStorage.setItem('cart', JSON.stringify(updatedCart));
          return updatedCart;
        });
        
        setError && setError('');
        console.log('✅ Item removed successfully');
        console.groupEnd();
        
      } catch (err) {
        console.error('❌ Error removing from cart:', err);
        console.groupEnd();
        setError && setError(err.response?.data?.message || 'Failed to remove item');
      }
    } else {
      // Guest cart
      console.log('Guest user - updating localStorage');
      setCart(prev => {
        const updatedCart = prev.filter(item => 
          String(item.productId) !== String(productId)
        );
        localStorage.setItem('cart', JSON.stringify(updatedCart));
        return updatedCart;
      });
      console.log('✅ Guest cart item removed');
      console.groupEnd();
    }
  };

  const clearCart = async (setError) => {
    if (user) {
      try {
        const userId = getUserIdFromToken();
        if (!userId) {
          setError && setError('User session invalid. Please login again.');
          return;
        }

        console.log('🧹 Clearing cart for user:', userId);

        await cartAPI.clear(userId);

        setCart([]);
        localStorage.removeItem('cart');
        setError && setError('');
        console.log('✅ Cart cleared successfully');

      } catch (err) {
        console.error('❌ Error clearing cart:', err);
        setError && setError(err.response?.data?.message || 'Failed to clear cart');
      }
    } else {
      // Guest cart
      setCart([]);
      localStorage.removeItem('cart');
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