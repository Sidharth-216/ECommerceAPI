import { paymentAPI } from '../api';

// Load Razorpay script
export const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

// Open Razorpay Checkout
export const openRazorpay = async ({ orderId, amount, user }) => {
  const loaded = await loadRazorpayScript();
  
  if (!loaded) {
    alert('❌ Failed to load Razorpay SDK. Please try again.');
    return false;
  }

  try {
    console.log('💳 Initiating Razorpay payment for order:', orderId);

    // Initiate payment through API
    const initiateRes = await paymentAPI.initiate(orderId, 'Online');
    const data = initiateRes?.data;

    if (!data || !data.razorpayOrderId) {
      throw new Error('Failed to create Razorpay order');
    }

    console.log('✅ Razorpay order created:', data.razorpayOrderId);

    // Razorpay options
    const options = {
      key: data.razorpayKeyId || process.env.REACT_APP_RAZORPAY_KEY_ID,
      amount: data.amount * 100, // Amount in paise
      currency: data.currency || 'INR',
      name: 'ShopAI',
      description: `Order #${orderId}`,
      order_id: data.razorpayOrderId,
      prefill: {
        name: user?.name || user?.fullName || '',
        email: user?.email || '',
        contact: user?.mobile || ''
      },
      theme: { 
        color: '#3B82F6' 
      },
      handler: async function (response) {
        try {
          console.log('✅ Payment successful, verifying...');

          // Verify payment
          const verifyRes = await paymentAPI.verify(
            response.razorpay_order_id,
            response.razorpay_payment_id,
            response.razorpay_signature,
            orderId
          );

          const verifyData = verifyRes?.data;

          if (verifyData?.success) {
            alert('✅ Payment successful! Your order has been placed.');
            
            // Clear cart
            localStorage.removeItem('cart');
            sessionStorage.removeItem('cart');
            
            // Redirect to orders page
            window.location.reload();
            return true;
          } else {
            alert('❌ Payment verification failed. Please contact support.');
            return false;
          }
        } catch (err) {
          console.error('❌ Payment verification error:', err);
          alert('❌ Payment verification failed. Please contact support.');
          return false;
        }
      },
      modal: {
        ondismiss: function() {
          console.log('⚠️ Payment cancelled by user');
          alert('Payment cancelled. You can retry anytime from your orders page.');
        }
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
    
  } catch (err) {
    console.error('❌ Razorpay error:', err);
    alert('Failed to initiate payment. Please try again.');
    return false;
  }
};

// Format time for OTP timer (MM:SS)
export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Sample products fallback (for demo/testing)
export const getSampleProducts = () => [
  {
    id: 'sample_1',
    _id: 'sample_1',
    name: 'Premium Smartphone X1',
    brand: 'TechBrand',
    price: 9999,
    stockQuantity: 50,
    rating: 4.5,
    reviewCount: 1250,
    imageUrl: 'smartphone.jpg',
    category: 'Electronics',
    description: 'Powerful processor, stunning camera, all-day battery',
    specs: '6GB RAM, 128GB Storage, 48MP Camera'
  },
  {
    id: 'sample_2',
    _id: 'sample_2',
    name: 'Wireless Earbuds Pro',
    brand: 'AudioMax',
    price: 2999,
    stockQuantity: 100,
    rating: 4.7,
    reviewCount: 890,
    imageUrl: 'earbuds.jpg',
    category: 'Audio',
    description: 'Active noise cancellation, 30hr battery life',
    specs: 'Bluetooth 5.2, IPX4 Water Resistant'
  },
  {
    id: 'sample_3',
    _id: 'sample_3',
    name: 'Smart Watch Ultra',
    brand: 'FitTech',
    price: 4999,
    stockQuantity: 75,
    rating: 4.3,
    reviewCount: 567,
    imageUrl: 'watch.jpg',
    category: 'Wearables',
    description: 'Health tracking, GPS, always-on display',
    specs: 'Heart Rate Monitor, Sleep Tracking, 7-day Battery'
  },
  {
    id: 'sample_4',
    _id: 'sample_4',
    name: 'Gaming Laptop Z9',
    brand: 'GameForce',
    price: 59999,
    stockQuantity: 25,
    rating: 4.8,
    reviewCount: 432,
    imageUrl: 'laptop.jpg',
    category: 'Computers',
    description: 'High-performance gaming, RGB keyboard',
    specs: 'RTX 3060, 16GB RAM, 512GB SSD, 144Hz Display'
  },
  {
    id: 'sample_5',
    _id: 'sample_5',
    name: 'Camera DSLR Pro',
    brand: 'PhotoMax',
    price: 45999,
    stockQuantity: 15,
    rating: 4.6,
    reviewCount: 289,
    imageUrl: 'camera.jpg',
    category: 'Photography',
    description: 'Professional photography, 4K video',
    specs: '24MP Sensor, Dual Card Slots, Weather Sealed'
  },
  {
    id: 'sample_6',
    _id: 'sample_6',
    name: 'Tablet Pro 11',
    brand: 'TechBrand',
    price: 34999,
    stockQuantity: 40,
    rating: 4.4,
    reviewCount: 678,
    imageUrl: 'tablet.jpg',
    category: 'Electronics',
    description: 'Stunning display, all-day battery, perfect for work',
    specs: '11-inch Display, 128GB Storage, Stylus Support'
  }
];

// Validate email format
export const validateEmail = (email) => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

// Validate mobile number (10 digits)
export const validateMobile = (mobile) => {
  const regex = /^\d{10}$/;
  return regex.test(mobile);
};

// Format currency
export const formatCurrency = (amount) => {
  return `₹${Number(amount || 0).toLocaleString('en-IN')}`;
};

// Format date
export const formatDate = (date, format = 'short') => {
  if (!date) return 'N/A';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const options = format === 'short' 
    ? { year: 'numeric', month: 'short', day: 'numeric' }
    : { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  
  return dateObj.toLocaleDateString('en-IN', options);
};

// Get stock status
export const getStockStatus = (quantity) => {
  if (quantity === 0 || quantity === null || quantity === undefined) {
    return { status: 'out_of_stock', label: 'Out of Stock', color: 'red' };
  }
  if (quantity < 10) {
    return { status: 'low_stock', label: 'Low Stock', color: 'orange' };
  }
  return { status: 'in_stock', label: 'In Stock', color: 'green' };
};

// Debounce function for search
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};