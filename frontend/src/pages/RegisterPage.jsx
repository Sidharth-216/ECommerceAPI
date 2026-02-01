import React, { useState } from 'react';
import { ShoppingBag, User, Mail, Phone, Eye, EyeOff } from 'lucide-react';

const RegisterPage = ({ 
  setCurrentPage, 
  setUser,
  setProfileData,
  setError, 
  error, 
  loading, 
  setLoading 
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [registerData, setRegisterData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    password: '',
    confirmPassword: '',
    gender: ''
  });
  const [loginRole, setLoginRole] = useState('Customer');

  const handleRegister = async () => {
    const { fullName, email, mobile, password, confirmPassword, gender } = registerData;
    
    if (!fullName?.trim()) {
      setError('Full name is required');
      return;
    }
    
    if (!email?.trim()) {
      setError('Email is required');
      return;
    }
    
    if (!mobile?.trim()) {
      setError('Mobile number is required');
      return;
    }
    
    if (!password) {
      setError('Password is required');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const { mongoAuthAPI, getUserIdFromToken } = await import('../api');
      
      const response = await mongoAuthAPI.register(
        fullName.trim(),
        email.trim(),
        mobile.trim(),
        password,
        gender
      );
      
      const data = response.data;
      
      if (!data.token) {
        throw new Error('No token received from server');
      }

      if (!data.role) {
        throw new Error('No role returned from server');
      }

      sessionStorage.setItem('token', data.token);
      
      const userIdFromToken = getUserIdFromToken();
      const finalUserId = userIdFromToken || data.userId || data.id || data.mongoUserId || `user_${Date.now()}`;
      
      const userData = {
        ...data,
        userId: finalUserId,
        id: finalUserId
      };
      
      sessionStorage.setItem('user', JSON.stringify(userData));
      
      setUser({
        id: finalUserId,
        userId: finalUserId,
        email: data.email,
        role: data.role,
        name: data.fullName,
        mobile: data.mobile || mobile,
        gender: data.gender || gender
      });
      
      setProfileData({
        fullName: data.fullName || fullName,
        email: data.email || email,
        mobile: data.mobile || mobile,
        gender: data.gender || gender,
        addresses: []
      });
      
      setCurrentPage('products');
      
    } catch (err) {
      console.error('Registration error:', err);
      
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.title ||
                          err.response?.data?.errors?.Email?.[0] ||
                          err.message || 
                          'Registration failed. Please try again.';
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-200 sticky top-0 z-40 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <button 
            onClick={() => setCurrentPage('home')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <div className="bg-blue-600 text-white font-bold px-2 py-1 rounded text-sm">
              Shop
            </div>
            <span className="text-xl font-bold text-gray-900">AI</span>
          </button>
          <div className="text-sm text-gray-600">
            Already have an account?{' '}
            <button
              onClick={() => setCurrentPage('login')}
              className="text-blue-600 font-semibold hover:text-blue-700"
            >
              Sign in
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          {/* Left Column - Benefits */}
          <section className="space-y-8 hidden lg:block">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Create account</h1>
              <p className="text-gray-600">Join millions of shoppers and enjoy exclusive deals</p>
            </div>

            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="text-2xl">🚚</div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Fast & Free Shipping</h3>
                  <p className="text-sm text-gray-600">Get your orders delivered quickly at no extra cost</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-2xl">🔒</div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Secure Payments</h3>
                  <p className="text-sm text-gray-600">Your payment information is encrypted and safe</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-2xl">↩️</div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Easy Returns</h3>
                  <p className="text-sm text-gray-600">Return or exchange items within 7 days hassle-free</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-2xl">💳</div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Flexible Payment Options</h3>
                  <p className="text-sm text-gray-600">Pay with cards, UPI, wallets, or cash on delivery</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="text-2xl">⭐</div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Trusted Reviews</h3>
                  <p className="text-sm text-gray-600">Read verified reviews from real buyers like you</p>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-gray-200">
              <div>
                <p className="text-2xl font-bold text-gray-900">10M+</p>
                <p className="text-xs text-gray-600 mt-1">Happy Customers</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">50K+</p>
                <p className="text-xs text-gray-600 mt-1">Sellers</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">1M+</p>
                <p className="text-xs text-gray-600 mt-1">Products</p>
              </div>
            </div>
          </section>

          {/* Right Column - Form */}
          <section className="max-w-md w-full mx-auto lg:mx-0">
            <div className="bg-white">
              {/* Error Alert */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg mb-6 text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); handleRegister(); }} className="space-y-5">
                {/* Register As */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Register as
                  </label>
                  <select
                    value={loginRole}
                    onChange={(e) => setLoginRole(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Customer">Customer</option>
                    <option value="Admin">Admin (Seller)</option>
                  </select>
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={registerData.fullName}
                    onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="John Doe"
                    required
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Email address
                  </label>
                  <input
                    type="email"
                    value={registerData.email}
                    onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="you@example.com"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">We'll send you a confirmation link</p>
                </div>

                {/* Mobile */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Mobile number
                  </label>
                  <div className="flex gap-2">
                    <select className="w-16 px-2 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option>+91</option>
                    </select>
                    <input
                      type="tel"
                      value={registerData.mobile}
                      onChange={(e) => setRegisterData({ ...registerData, mobile: e.target.value })}
                      className="flex-1 px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="9876543210"
                      maxLength={10}
                      required
                    />
                  </div>
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Gender <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <select
                    value={registerData.gender}
                    onChange={(e) => setRegisterData({ ...registerData, gender: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={registerData.password}
                      onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="At least 8 characters"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <ul className="text-xs text-gray-600 mt-2 space-y-1">
                    <li>✓ At least 8 characters</li>
                    <li>✓ Mix of uppercase and lowercase letters</li>
                    <li>✓ At least one number</li>
                  </ul>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">
                    Confirm password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Re-enter your password"
                    required
                  />
                </div>

                {/* Terms & Conditions */}
                <div className="flex items-start gap-3 py-2">
                  <input
                    type="checkbox"
                    id="terms"
                    className="w-4 h-4 border border-gray-300 rounded mt-0.5 accent-blue-600 cursor-pointer"
                    required
                  />
                  <label htmlFor="terms" className="text-xs text-gray-600 cursor-pointer">
                    I agree to the{' '}
                    <button type="button" className="text-blue-600 hover:underline font-medium">
                      Terms of Use
                    </button>
                    {' '}and{' '}
                    <button type="button" className="text-blue-600 hover:underline font-medium">
                      Privacy Policy
                    </button>
                  </label>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2.5 rounded-lg font-semibold text-sm transition-colors mt-6"
                >
                  {loading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Creating account...
                    </div>
                  ) : (
                    'Create account'
                  )}
                </button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-6">
                <div className="flex-1 h-px bg-gray-200"></div>
                <span className="text-xs text-gray-500">or</span>
                <div className="flex-1 h-px bg-gray-200"></div>
              </div>

              {/* Social Sign Up */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
                >
                  Continue with Google
                </button>
                <button
                  type="button"
                  className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-900 hover:bg-gray-50 transition-colors"
                >
                  Continue with Apple
                </button>
              </div>

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <p className="text-xs text-gray-600 text-center">
                  By creating an account, you accept our Terms & Privacy Policy
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Mobile Benefits Section */}
      <section className="lg:hidden bg-gray-50 mt-12 py-8 px-6">
        <h2 className="font-bold text-gray-900 mb-6">Why shop with us?</h2>
        <div className="space-y-4">
          <div className="flex gap-3">
            <span className="text-lg">✓</span>
            <div>
              <p className="text-sm font-medium text-gray-900">Free shipping on all orders</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-lg">✓</span>
            <div>
              <p className="text-sm font-medium text-gray-900">7 days easy returns</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-lg">✓</span>
            <div>
              <p className="text-sm font-medium text-gray-900">Secure checkout</p>
            </div>
          </div>
          <div className="flex gap-3">
            <span className="text-lg">✓</span>
            <div>
              <p className="text-sm font-medium text-gray-900">24/7 customer support</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12 py-8 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-8">
            <div>
              <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-4">About</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><button className="hover:text-blue-600">About Us</button></li>
                <li><button className="hover:text-blue-600">Careers</button></li>
                <li><button className="hover:text-blue-600">Blog</button></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-4">Help</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><button className="hover:text-blue-600">Contact Us</button></li>
                <li><button className="hover:text-blue-600">Track Order</button></li>
                <li><button className="hover:text-blue-600">Returns</button></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-4">Policies</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><button className="hover:text-blue-600">Privacy Policy</button></li>
                <li><button className="hover:text-blue-600">Terms of Use</button></li>
                <li><button className="hover:text-blue-600">Cookies</button></li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900 uppercase tracking-wide mb-4">Follow Us</p>
              <ul className="space-y-2 text-sm text-gray-600">
                <li><button className="hover:text-blue-600">Twitter</button></li>
                <li><button className="hover:text-blue-600">Facebook</button></li>
                <li><button className="hover:text-blue-600">Instagram</button></li>
              </ul>
            </div>
          </div>
          <div className="pt-6 border-t border-gray-200 text-xs text-gray-600 text-center">
            <p>© 2024 ShopAI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default RegisterPage;