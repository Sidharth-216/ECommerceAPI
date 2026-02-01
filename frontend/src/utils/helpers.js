import {
  adminAPI,
  authAPI,
  productsAPI,
  cartAPI,
  ordersAPI,
  recommendationsAPI,
  addressAPI,
  paymentAPI
} from '../api';

// Setup interceptors for all API instances
export const setupInterceptors = () => {
  const apis = [authAPI, productsAPI, cartAPI, ordersAPI, recommendationsAPI, adminAPI, addressAPI, paymentAPI];
  
  apis.forEach(api => {
    if (api && api.interceptors) {
      // Request interceptor to add token
      api.interceptors.request.use(
        config => {
          const token = sessionStorage.getItem('token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
          return config;
        },
        error => Promise.reject(error)
      );
      
      // Response interceptor for 401 handling
      api.interceptors.response.use(
        response => response,
        error => {
          if (error.response?.status === 401 && error.response?.data?.message?.includes('authentication')) {
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            window.location.href = '/';
          }
          return Promise.reject(error);
        }
      );
    }
  });
};

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
    alert('Failed to load Razorpay SDK');
    return;
  }

  // Create Razorpay order
  const res = await fetch('http://localhost:5033/api/payment/initiate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({
      orderId,
      paymentMethod: 'Online'
    })
  });

  const data = await res.json();

  // Razorpay options
  const options = {
    key: data.razorpayKeyId,
    amount: data.amount * 100,
    currency: data.currency,
    name: 'Your E-Commerce Store',
    description: `Order #${orderId}`,
    order_id: data.razorpayOrderId,
    prefill: {
      name: user?.fullName,
      email: user?.email,
      contact: user?.mobile
    },
    theme: { color: '#3B82F6' },

    handler: async function (response) {
      // Verify payment
      const verifyRes = await fetch(
        'http://localhost:5033/api/payment/verify',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            razorpayOrderId: response.razorpay_order_id,
            razorpayPaymentId: response.razorpay_payment_id,
            razorpaySignature: response.razorpay_signature,
            orderId
          })
        }
      );

      const verifyData = await verifyRes.json();

      if (verifyData.success) {
        alert('✅ Payment successful!');
        return true;
      } else {
        alert('❌ Payment verification failed');
        return false;
      }
    },

    modal: {
      ondismiss: () => {}
    }
  };

  const rzp = new window.Razorpay(options);
  rzp.open();
};

// Format time for OTP timer
export const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Sample products fallback
export const getSampleProducts = () => [
  {
    id: 1,
    name: 'Premium Smartphone X1',
    brand: 'TechBrand',
    price: 9999,
    rating: 4.5,
    reviewCount: 1250,
    image: 'https://via.placeholder.com/300x300/3b82f6/ffffff?text=Smartphone',
    category: 'Electronics',
    description: 'Powerful processor, stunning camera, all-day battery',
    specs: '6GB RAM, 128GB Storage, 48MP Camera'
  },
  {
    id: 2,
    name: 'Wireless Earbuds Pro',
    brand: 'AudioMax',
    price: 2999,
    rating: 4.7,
    reviewCount: 890,
    image: 'https://via.placeholder.com/300x300/8b5cf6/ffffff?text=Earbuds',
    category: 'Audio',
    description: 'Active noise cancellation, 30hr battery life',
    specs: 'Bluetooth 5.2, IPX4 Water Resistant'
  },
  {
    id: 3,
    name: 'Smart Watch Ultra',
    brand: 'FitTech',
    price: 4999,
    rating: 4.3,
    reviewCount: 567,
    image: 'https://via.placeholder.com/300x300/10b981/ffffff?text=Watch',
    category: 'Wearables',
    description: 'Health tracking, GPS, always-on display',
    specs: 'Heart Rate Monitor, Sleep Tracking, 7-day Battery'
  },
  {
    id: 4,
    name: 'Gaming Laptop Z9',
    brand: 'GameForce',
    price: 59999,
    rating: 4.8,
    reviewCount: 432,
    image: 'https://via.placeholder.com/300x300/ef4444/ffffff?text=Laptop',
    category: 'Computers',
    description: 'High-performance gaming, RGB keyboard',
    specs: 'RTX 3060, 16GB RAM, 512GB SSD, 144Hz Display'
  },
  {
    id: 5,
    name: 'Camera DSLR Pro',
    brand: 'PhotoMax',
    price: 45999,
    rating: 4.6,
    reviewCount: 289,
    image: 'https://via.placeholder.com/300x300/f59e0b/ffffff?text=Camera',
    category: 'Photography',
    description: 'Professional photography, 4K video',
    specs: '24MP Sensor, Dual Card Slots, Weather Sealed'
  },
  {
    id: 6,
    name: 'Tablet Pro 11',
    brand: 'TechBrand',
    price: 34999,
    rating: 4.4,
    reviewCount: 678,
    image: 'https://via.placeholder.com/300x300/06b6d4/ffffff?text=Tablet',
    category: 'Electronics',
    description: 'Stunning display, all-day battery, perfect for work',
    specs: '11-inch Display, 128GB Storage, Stylus Support'
  }
];