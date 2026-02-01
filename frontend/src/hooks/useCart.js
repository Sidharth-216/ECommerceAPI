import { useState, useEffect } from 'react';
import { cartAPI, getUserIdFromToken } from '../api';

// Helper function to extract MongoDB ObjectId
const getMongoId = (obj) => {
  if (!obj) return null;
  
  if (obj._id && obj._id.$oid) {
    return obj._id.$oid;
  }
  
  if (typeof obj._id === 'string') {
    return obj._id;
  }
  
  if (typeof obj.id === 'string') {
    return obj.id;
  }
  
  if (typeof obj.mongoId === 'string') {
    return obj.mongoId;
  }
  
  return null;
};

export const useCart = (user) => {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    fetchCart();
  }, [user]);

  const fetchCart = async () => {
    if (!user) {
      const storedCart = localStorage.getItem('cart');
      if (storedCart) {
        try {
          setCart(JSON.parse(storedCart));
        } catch (e) {
          console.error('Error parsing cart from localStorage:', e);
          setCart([]);
        }
      }
      return;
    }

    try {
      const userId = getUserIdFromToken();
      
      if (!userId) {
        console.error('No user ID found in token');
        return;
      }

      const response = await cartAPI.view(userId);
      const backendCart = response.data?.items || response.data || [];
      setCart(backendCart);
      
      localStorage.setItem('cart', JSON.stringify(backendCart));
    } catch (err) {
      console.error('Error fetching cart:', err);
      
      const storedCart = localStorage.getItem('cart');
      if (storedCart) {
        try {
          setCart(JSON.parse(storedCart));
        } catch (e) {
          setCart([]);
        }
      }
    }
  };

  const loadCart = async () => {
    if (!user) return;
    
    try {
      const userId = getUserIdFromToken();
      
      if (!userId) {
        console.error('No user ID found in token');
        return;
      }

      const response = await cartAPI.view(userId);
      setCart(response.data.items || []);
    } catch (err) {
      console.error('Error loading cart:', err);
    }
  };

  const addToCart = async (product, setError) => {
    console.log('Raw product object:', product);
    
    const productId = getMongoId(product);
    
    console.log('Extracted product ID:', productId);
    
    if (!productId) {
      console.error('Could not extract product ID from:', product);
      setError && setError('Product ID not found. Please try again.');
      return;
    }

    const normalizedProduct = {
      productId: productId,
      productName: product.name || product.productName || 'Unknown Product',
      price: product.price || 0,
      imageUrl: product.imageUrl || product.image || 'https://via.placeholder.com/300x300',
      brand: product.brand || '',
      ...product
    };

    if (!normalizedProduct.productName) {
      setError && setError('Product information incomplete.');
      return;
    }

    if (user) {
      try {
        const userId = getUserIdFromToken();
        
        if (!userId) {
          console.error('User object:', user);
          setError && setError('User ID not found. Please login again.');
          return;
        }

        console.log('Adding to cart with:', {
          userId: userId,
          productId: productId,
          quantity: 1
        });

        const response = await cartAPI.add(userId, { 
          productId: productId,
          quantity: 1 
        });

        console.log('Cart API response:', response.data);

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
        
      } catch (err) {
        console.error('Error adding to cart:', err);
        console.error('Error response:', err.response?.data);
        console.error('Error status:', err.response?.status);
        
        if (err.response?.status === 404) {
          setError && setError('Product not found in catalog.');
        } else if (err.response?.status === 400) {
          const errorMsg = err.response?.data?.message || 'Invalid request. Check product details.';
          setError && setError(errorMsg);
        } else if (err.response?.status === 500) {
          setError && setError('Server error. Please try again later.');
        } else {
          setError && setError(err.response?.data?.message || err.message || 'Failed to add item to cart.');
        }
      }
    } else {
      const updatedCart = [...cart];
      const existing = updatedCart.find(item => 
        String(item.productId) === String(productId)
      );
      
      if (existing) {
        existing.quantity += 1;
      } else {
        updatedCart.push({
          productId: productId,
          productName: normalizedProduct.productName,
          price: normalizedProduct.price,
          quantity: 1,
          imageUrl: normalizedProduct.imageUrl,
          brand: normalizedProduct.brand
        });
      }
      
      setCart(updatedCart);
      localStorage.setItem('cart', JSON.stringify(updatedCart));
      setError && setError('');
      console.log('✅ Item added to guest cart');
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

        console.log('Making API call:', {
          userId: userId,
          productId: productIdString,
          quantity: quantity
        });

        await cartAPI.update(userId, productIdString, quantity);
        
        console.log('✅ API call successful');
        
        setCart(prev => {
          const updatedCart = prev.map(item => {
            const itemId = String(item.productIdString || item.productId);
            const matches = itemId === productIdString;
            
            console.log('Checking item:', {
              itemId: itemId,
              productIdString: productIdString,
              matches: matches
            });
            
            return matches ? { ...item, quantity } : item;
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
        console.error('Error response:', err.response?.data);
        console.groupEnd();
        setError && setError(err.response?.data?.message || 'Failed to update cart');
      }
    } else {
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

        console.log('Making API call:', {
          userId: userId,
          productId: productIdString
        });

        await cartAPI.remove(userId, productIdString);
        
        console.log('✅ API call successful');
        
        setCart(prev => {
          const updatedCart = prev.filter(item => {
            const itemId = String(item.productIdString || item.productId);
            const keep = itemId !== productIdString;
            
            console.log('Checking item:', {
              itemId: itemId,
              productIdString: productIdString,
              keep: keep
            });
            
            return keep;
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
        console.error('Error response:', err.response?.data);
        console.groupEnd();
        setError && setError(err.response?.data?.message || 'Failed to remove item');
      }
    } else {
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

        console.log(`Clearing cart: userId=${userId}`);

        await cartAPI.clear(userId);

        setCart([]);
        localStorage.removeItem('cart');
        setError && setError('');
        console.log('✅ Cart cleared successfully');

      } catch (err) {
        console.error('Error clearing cart:', err);
        setError && setError(err.response?.data?.message || 'Failed to clear cart');
      }
    } else {
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