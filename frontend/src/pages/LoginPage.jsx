import React, { useState, useEffect } from 'react';
import { ShoppingBag, Mail, Lock, Eye, EyeOff, Smartphone, KeyRound } from 'lucide-react';
import { mongoAuthAPI, getUserIdFromToken } from '../api';
import { formatTime } from '../utils/helpers';

const LoginPage = ({ 
  setCurrentPage, 
  setUser, 
  setError, 
  error, 
  loading, 
  setLoading 
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ email: '', password: '' });
  const [loginRole, setLoginRole] = useState('Customer');
  const [loginMethod, setLoginMethod] = useState('email');
  
  // Mobile OTP state
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);
  
  // Email OTP state
  const [emailForOtp, setEmailForOtp] = useState('');
  const [emailOtp, setEmailOtp] = useState(['', '', '', '', '', '']);
  const [emailOtpSent, setEmailOtpSent] = useState(false);

  // OTP Timer countdown
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (otpTimer === 0 && (otpSent || emailOtpSent)) {
      setCanResend(true);
    }
  }, [otpTimer, otpSent, emailOtpSent]);

  const handleLogin = async () => {
    setError('');
    setLoading(true);

    try {
      if (!loginData.email?.trim()) {
        throw new Error('Email is required');
      }
      if (!loginData.password) {
        throw new Error('Password is required');
      }

      const response = await mongoAuthAPI.login(
        loginData.email.trim(),
        loginData.password
      );

      const data = response?.data;

      if (!data || !data.token) {
        throw new Error('Authentication token not received from server');
      }

      const userRole = String(data.role || '').trim();

      if (!userRole || (userRole !== 'Customer' && userRole !== 'Admin')) {
        throw new Error('Invalid user role received from server');
      }

      if (userRole !== loginRole) {
        throw new Error(
          `This account is registered as ${userRole}. Please select ${userRole} login.`
        );
      }

      const userIdFromToken = getUserIdFromToken();
      const finalUserId = userIdFromToken || data.mongoUserId || data.userId || data.id;
      
      if (!finalUserId) {
        throw new Error('User ID not found. Please contact support.');
      }

      const userData = { 
        ...data, 
        role: userRole, 
        userId: finalUserId,
        id: finalUserId,
        email: data.email
      };
      
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('user', JSON.stringify(userData));

      setUser({
        id: finalUserId,
        userId: finalUserId,
        email: data.email || '',
        role: userRole,
        name: data.fullName || data.name || '',
        mobile: data.mobile || '',
        gender: data.gender || ''
      });

      if (userRole === 'Admin') {
        setCurrentPage('admin');
      } else {
        setCurrentPage('products');
      }

    } catch (err) {
      console.error('Login error details:', err);
      setError(
        err.response?.data?.message ||
        err.response?.data?.title ||
        err.message ||
        'Login failed. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async () => {
    if (mobileNumber.length !== 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await mongoAuthAPI.requestOtp(mobileNumber);
      
      if (response.data.success) {
        setOtpSent(true);
        setOtpTimer(300);
        setCanResend(false);
        
        setTimeout(() => {
          document.getElementById('otp-0')?.focus();
        }, 100);
      }
    } catch (err) {
      console.error('OTP request error:', err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'Failed to send OTP. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otpValue = otp.join('');
    
    if (otpValue.length !== 6) {
      setError('Please enter complete 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await mongoAuthAPI.verifyOtp(mobileNumber, otpValue);
      const data = response.data;

      if (!data.token) {
        throw new Error('No token received');
      }

      sessionStorage.setItem('token', data.token);
      const userIdFromToken = getUserIdFromToken();

      const userData = {
        ...data,
        userId: userIdFromToken,
        id: userIdFromToken
      };

      sessionStorage.setItem('user', JSON.stringify(userData));

      setUser({
        id: userIdFromToken,
        userId: userIdFromToken,
        email: data.email,
        role: data.role,
        name: data.fullName,
        mobile: data.mobile
      });

      if (data.role === 'Admin') {
        setCurrentPage('admin');
      } else {
        setCurrentPage('products');
      }

    } catch (err) {
      console.error('OTP verification error:', err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'Invalid OTP. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRequestEmailOTP = async () => {
    if (!emailForOtp.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await mongoAuthAPI.requestEmailOtp(emailForOtp);
      
      if (response.data.success) {
        setEmailOtpSent(true);
        setOtpTimer(300);
        setCanResend(false);
        
        setTimeout(() => {
          document.getElementById('email-otp-0')?.focus();
        }, 100);
      }
    } catch (err) {
      console.error('Email OTP request error:', err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'Failed to send OTP. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOTP = async () => {
    const otpValue = emailOtp.join('');
    
    if (otpValue.length !== 6) {
      setError('Please enter complete 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await mongoAuthAPI.verifyEmailOtp(emailForOtp, otpValue);
      const data = response.data;

      if (!data.token) {
        throw new Error('No token received');
      }

      sessionStorage.setItem('token', data.token);
      const userIdFromToken = getUserIdFromToken();

      const userData = {
        ...data,
        userId: userIdFromToken,
        id: userIdFromToken
      };

      sessionStorage.setItem('user', JSON.stringify(userData));

      setUser({
        id: userIdFromToken,
        userId: userIdFromToken,
        email: data.email,
        role: data.role,
        name: data.fullName,
        mobile: data.mobile
      });

      if (data.role === 'Admin') {
        setCurrentPage('admin');
      } else {
        setCurrentPage('products');
      }

    } catch (err) {
      console.error('Email OTP verification error:', err);
      setError(
        err.response?.data?.message || 
        err.message || 
        'Invalid OTP. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-400 to-purple-500 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      
      <div className="max-w-xl w-full relative z-10">
        {/* Brand & Intro */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-4 bg-white/20 backdrop-blur-md px-6 py-3 rounded-full border border-white/30">
            <ShoppingBag className="w-8 h-8 text-white" />
            <h1 className="text-2xl font-bold text-white">ShopAI</h1>
          </div>
          <p className="text-white/90 text-lg font-medium">Welcome back — sign in to continue</p>
          <p className="text-white/70 text-sm mt-1">Choose a login method that suits you</p>
        </div>

        {/* Card */}
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Sign In</h2>
              <p className="text-sm text-gray-600 mt-2">Access your ShopAI account securely</p>
            </div>
            <div className="text-sm text-gray-600">
              New here?{' '}
              <button
                onClick={() => setCurrentPage('register')}
                className="text-blue-600 font-semibold hover:text-blue-700 transition-colors"
              >
                Create account
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-5 py-4 rounded-lg mb-6 flex items-start gap-3 animate-pulse">
              <div className="w-1 h-1 bg-red-500 rounded-full mt-2.5"></div>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          {/* Login Method Tabs */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Select Login Method</label>
            <div className="grid grid-cols-3 gap-2 bg-gray-100 rounded-xl p-1.5">
              <button
                onClick={() => {
                  setLoginMethod('email');
                  setError('');
                  setOtpSent(false);
                  setEmailOtpSent(false);
                  setLoginData({ email: '', password: '' });
                }}
                className={`py-2.5 px-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                  loginMethod === 'email'
                    ? 'bg-white shadow-md text-blue-600 scale-105'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span className="hidden sm:inline">Password</span>
              </button>

              <button
                onClick={() => {
                  setLoginMethod('mobile');
                  setError('');
                  setOtpSent(false);
                  setEmailOtpSent(false);
                  setMobileNumber('');
                  setOtp(['', '', '', '', '', '']);
                }}
                className={`py-2.5 px-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                  loginMethod === 'mobile'
                    ? 'bg-white shadow-md text-blue-600 scale-105'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span className="hidden sm:inline">Mobile</span>
              </button>

              <button
                onClick={() => {
                  setLoginMethod('emailOtp');
                  setError('');
                  setOtpSent(false);
                  setEmailOtpSent(false);
                  setEmailForOtp('');
                  setEmailOtp(['', '', '', '', '', '']);
                }}
                className={`py-2.5 px-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                  loginMethod === 'emailOtp'
                    ? 'bg-white shadow-md text-blue-600 scale-105'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Mail className="w-4 h-4" />
                <span className="hidden sm:inline">Email</span>
              </button>
            </div>
          </div>

          {/* Role Selector */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-3">Login As</label>
            <div className="relative">
              <select
                value={loginRole}
                onChange={(e) => setLoginRole(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 bg-white hover:bg-gray-50 cursor-pointer text-gray-700 font-medium appearance-none"
              >
                <option value="Customer">👤 Customer</option>
                <option value="Admin">🏢 Admin</option>
              </select>
              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                </svg>
              </div>
            </div>
          </div>

          {/* EMAIL + PASSWORD LOGIN */}
          {loginMethod === 'email' && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLogin();
              }}
              className="space-y-5"
            >
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Email Address</label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type="email"
                    value={loginData.email}
                    onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 bg-gray-50 focus:bg-white placeholder-gray-400"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 bg-gray-50 focus:bg-white placeholder-gray-400"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Signing in...
                  </>
                ) : (
                  <>
                    <span>Sign In</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          )}

          {/* MOBILE OTP LOGIN */}
          {loginMethod === 'mobile' && (
            <div className="space-y-5">
              {!otpSent ? (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Mobile Number</label>
                    <div className="relative group">
                      <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
                      <input
                        type="tel"
                        value={mobileNumber}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setMobileNumber(val);
                        }}
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 bg-gray-50 focus:bg-white placeholder-gray-400"
                        placeholder="9876543210"
                        maxLength={10}
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">📱 We'll send a 6-digit OTP to this number</p>
                  </div>

                  <button
                    onClick={handleRequestOTP}
                    disabled={loading || mobileNumber.length !== 10}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Sending OTP...
                      </>
                    ) : (
                      <>
                        <span>Send OTP</span>
                        <KeyRound className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Enter 6-Digit OTP</label>
                    <p className="text-xs text-gray-500 mb-4">
                      ⏱️ Sent to {mobileNumber} • Expires in{' '}
                      <span className="font-bold text-red-600">{formatTime(otpTimer)}</span>
                    </p>
                    <div className="flex gap-2 justify-center mb-4">
                      {otp.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`otp-${idx}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(idx, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                          className="w-12 h-12 text-center text-2xl font-bold border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleVerifyOTP}
                      disabled={loading || otp.join('').length !== 6}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Verifying...
                        </>
                      ) : (
                        <>
                          <span>Verify & Sign In</span>
                          <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" />
                          </svg>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setOtpSent(false);
                        setOtp(['', '', '', '', '', '']);
                        setError('');
                      }}
                      className="px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-blue-300 hover:bg-blue-50 transition-all"
                    >
                      Change Number
                    </button>
                  </div>

                  <div className="text-sm text-center text-gray-500 mt-3">
                    <button
                      onClick={handleRequestOTP}
                      disabled={!canResend || loading}
                      className="text-blue-600 hover:text-blue-700 font-semibold disabled:opacity-50 transition-colors"
                    >
                      {canResend ? '🔄 Resend OTP' : `Resend in ${formatTime(otpTimer)}`}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* EMAIL OTP LOGIN */}
          {loginMethod === 'emailOtp' && (
            <div className="space-y-5">
              {!emailOtpSent ? (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-3">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
                      <input
                        type="email"
                        value={emailForOtp}
                        onChange={(e) => setEmailForOtp(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 bg-gray-50 focus:bg-white placeholder-gray-400"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-2">📧 We'll send a 6-digit code to your email</p>
                  </div>

                  <button
                    onClick={handleRequestEmailOTP}
                    disabled={loading || !emailForOtp.includes('@')}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Sending OTP...
                      </>
                    ) : (
                      <>
                        <span>Send OTP to Email</span>
                        <KeyRound className="w-5 h-5 group-hover:rotate-12 transition-transform" />
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Enter 6-Digit OTP</label>
                    <p className="text-xs text-gray-500 mb-4">
                      ⏱️ Sent to {emailForOtp} • Expires in{' '}
                      <span className="font-bold text-red-600">{formatTime(otpTimer)}</span>
                    </p>
                    <div className="flex gap-2 justify-center mb-4">
                      {emailOtp.map((digit, idx) => (
                        <input
                          key={idx}
                          id={`email-otp-${idx}`}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (!/^\d*$/.test(val)) return;
                            const newOtp = [...emailOtp];
                            newOtp[idx] = val;
                            setEmailOtp(newOtp);
                            if (val && idx < 5) {
                              document.getElementById(`email-otp-${idx + 1}`)?.focus();
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Backspace' && !emailOtp[idx] && idx > 0) {
                              document.getElementById(`email-otp-${idx - 1}`)?.focus();
                            }
                          }}
                          className="w-12 h-12 text-center text-2xl font-bold border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300"
                        />
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleVerifyEmailOTP}
                      disabled={loading || emailOtp.join('').length !== 6}
                      className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 rounded-xl font-bold transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Verifying...
                        </>
                      ) : (
                        <>
                          <span>Verify & Sign In</span>
                          <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" />
                          </svg>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setEmailOtpSent(false);
                        setEmailOtp(['', '', '', '', '', '']);
                        setError('');
                      }}
                      className="px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:border-blue-300 hover:bg-blue-50 transition-all"
                    >
                      Change Email
                    </button>
                  </div>

                  <div className="text-sm text-center text-gray-500 mt-3">
                    <button
                      onClick={handleRequestEmailOTP}
                      disabled={!canResend || loading}
                      className="text-blue-600 hover:text-blue-700 font-semibold disabled:opacity-50 transition-colors"
                    >
                      {canResend ? '🔄 Resend OTP' : `Resend in ${formatTime(otpTimer)}`}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Demo Credentials */}
          <div className="mt-6 bg-white/20 backdrop-blur-md rounded-lg p-4 border border-white/30">
            <p className="text-xs text-gray-700 mb-2">Demo credentials</p>
            <div className="flex gap-2">
              <button
                onClick={() => { 
                  setLoginRole('Admin'); 
                  setLoginData({ email: 'admin@ecommerce.com', password: 'admin123' }); 
                  setLoginMethod('email'); 
                }}
                className="flex-1 text-sm px-3 py-2 bg-gray-50 rounded-lg"
              >
                Admin — admin@ecommerce.com / admin123
              </button>
              <button
                onClick={() => { 
                  setLoginRole('Customer'); 
                  setLoginData({ email: 'customer@test.com', password: 'password123' }); 
                  setLoginMethod('email'); 
                }}
                className="flex-1 text-sm px-3 py-2 bg-gray-50 rounded-lg"
              >
                Customer — customer@test.com / password123
              </button>
            </div>
          </div>

          {/* Back to Home */}
          <div className="mt-5 text-center">
            <button 
              onClick={() => setCurrentPage('home')} 
              className="text-gray-600 text-sm hover:text-gray-800"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;