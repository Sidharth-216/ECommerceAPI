import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, Mail, Lock, Eye, EyeOff, 
  Smartphone, KeyRound, ArrowRight, ArrowLeft,
  User, ShieldCheck, CheckCircle2
} from 'lucide-react';
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

  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (otpTimer === 0 && (otpSent || emailOtpSent)) {
      setCanResend(true);
    }
  }, [otpTimer, otpSent, emailOtpSent]);

  const handleLogin = async () => {
    setError(''); setLoading(true);
    try {
      if (!loginData.email?.trim() || !loginData.password) throw new Error('All fields are required');
      const response = await mongoAuthAPI.login(loginData.email.trim(), loginData.password);
      const data = response?.data;
      if (!data?.token) throw new Error('Auth failed');
      const userRole = String(data.role || '').trim();
      if (userRole !== loginRole) throw new Error(`Login as ${userRole} instead.`);
      const userIdFromToken = getUserIdFromToken() || data.mongoUserId || data.userId || data.id;
      const userData = { ...data, role: userRole, userId: userIdFromToken };

      // ✅ localStorage — persists on refresh
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(userData));

      setUser(userData);
      setCurrentPage(userRole === 'Admin' ? 'admin' : 'products');
    } catch (err) { setError(err.response?.data?.message || err.message); } finally { setLoading(false); }
  };

  const handleRequestOTP = async () => {
    if (mobileNumber.length !== 10) { setError('Invalid mobile number'); return; }
    setLoading(true); setError('');
    try {
      const resp = await mongoAuthAPI.requestOtp(mobileNumber);
      if (resp.data.success) { setOtpSent(true); setOtpTimer(300); setCanResend(false); }
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleVerifyOTP = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) { setError('Enter 6-digit OTP'); return; }
    setLoading(true);
    try {
      const resp = await mongoAuthAPI.verifyOtp(mobileNumber, otpValue);
      const data = resp.data;

      // ✅ localStorage — persists on refresh
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data));

      setUser(data);
      setCurrentPage(data.role === 'Admin' ? 'admin' : 'products');
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleRequestEmailOTP = async () => {
    if (!emailForOtp.includes('@')) { setError('Invalid email'); return; }
    setLoading(true);
    try {
      const resp = await mongoAuthAPI.requestEmailOtp(emailForOtp);
      if (resp.data.success) { setEmailOtpSent(true); setOtpTimer(300); setCanResend(false); }
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleVerifyEmailOTP = async () => {
    const otpValue = emailOtp.join('');
    if (otpValue.length !== 6) { setError('Enter 6-digit OTP'); return; }
    setLoading(true);
    try {
      const resp = await mongoAuthAPI.verifyEmailOtp(emailForOtp, otpValue);
      const data = resp.data;

      // ✅ localStorage — persists on refresh
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data));

      setUser(data);
      setCurrentPage(data.role === 'Admin' ? 'admin' : 'products');
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleOtpChange = (index, value, isEmail) => {
    if (!/^\d*$/.test(value)) return;
    const currentOtp = isEmail ? [...emailOtp] : [...otp];
    currentOtp[index] = value;
    isEmail ? setEmailOtp(currentOtp) : setOtp(currentOtp);
    if (value && index < 5) {
      document.getElementById(`${isEmail ? 'email-otp' : 'otp'}-${index + 1}`)?.focus();
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] flex items-center justify-center p-4">
      <div className="max-w-5xl w-full flex bg-white rounded-[40px] shadow-2xl overflow-hidden border border-gray-100 min-h-[700px]">
        
        {/* Left Side: Branding */}
        <div className="hidden lg:flex w-5/12 bg-gradient-to-r from-teal-500 to-cyan-600 p-12 flex-col justify-between relative overflow-hidden">
          <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-cyan-500 rounded-full blur-3xl opacity-50 animate-pulse"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-16">
              <div className="bg-white p-2 rounded-xl">
                <ShoppingBag className="w-6 h-6 text-teal-600" />
              </div>
              <span className="text-white font-bold text-xl tracking-tight">ShopAI.</span>
            </div>
            
            <h2 className="text-5xl font-extrabold text-white leading-[1.1] mb-6">
              Style is a way to say <span className="text-cyan-200">who you are.</span>
            </h2>
            <p className="text-cyan-100 text-lg font-medium opacity-80">
              Access the world's most exclusive marketplace with just one click.
            </p>
          </div>

          <div className="relative z-10 bg-white/10 backdrop-blur-md border border-white/20 p-6 rounded-3xl">
            <div className="flex gap-4 items-center">
              <div className="flex -space-x-3">
                {[1,2,3].map(i => (
                  <div key={i} className="w-10 h-10 rounded-full bg-gray-300 border-2 border-teal-600" />
                ))}
              </div>
              <p className="text-white text-sm font-semibold">Joined by 20k+ shoppers this month</p>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <div className="w-full lg:w-7/12 p-8 md:p-14 flex flex-col justify-center">
          <div className="max-w-md mx-auto w-full">
            <div className="mb-8">
              <h1 className="text-4xl font-black text-gray-900 mb-2">Welcome Back</h1>
              <p className="text-gray-500 font-medium">Please sign in to your account</p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl flex items-center gap-3">
                <div className="bg-red-500 p-1 rounded-full">
                  <Lock className="w-3 h-3 text-white" />
                </div>
                <p className="text-red-700 text-sm font-bold">{error}</p>
              </div>
            )}

            {/* Method & Role Tabs */}
            <div className="space-y-6 mb-8">
              <div className="flex p-1 bg-gray-100 rounded-2xl">
                {['email', 'mobile', 'emailOtp'].map(m => (
                  <button
                    key={m}
                    onClick={() => { setLoginMethod(m); setError(''); }}
                    className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all duration-300 ${
                      loginMethod === m ? 'bg-white text-indigo-600 shadow-lg scale-[1.02]' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {m === 'email' ? 'Password' : m === 'mobile' ? 'Mobile' : 'Email OTP'}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  onClick={() => setLoginRole('Customer')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-2xl border-2 transition-all ${
                    loginRole === 'Customer' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-100 bg-white text-gray-400'
                  }`}
                >
                  <User size={18} /> <span className="font-bold">Customer</span>
                </button>
                <button 
                  onClick={() => setLoginRole('Admin')}
                  className={`flex items-center justify-center gap-2 py-3 rounded-2xl border-2 transition-all ${
                    loginRole === 'Admin' ? 'border-indigo-600 bg-indigo-50 text-indigo-700' : 'border-gray-100 bg-white text-gray-400'
                  }`}
                >
                  <ShieldCheck size={18} /> <span className="font-bold">Admin</span>
                </button>
              </div>
            </div>

            {/* Form Renderer */}
            <div className="transition-all duration-500">
              {loginMethod === 'email' && (
                <form onSubmit={(e) => { e.preventDefault(); handleLogin(); }} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                      <input 
                        type="email" required
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-600 outline-none transition-all font-medium"
                        placeholder="example@mail.com"
                        value={loginData.email}
                        onChange={(e) => setLoginData({...loginData, email: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                      <input 
                        type={showPassword ? "text" : "password"} required
                        className="w-full pl-12 pr-12 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-600 outline-none transition-all font-medium"
                        placeholder="••••••••"
                        value={loginData.password}
                        onChange={(e) => setLoginData({...loginData, password: e.target.value})}
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-600"
                      >
                        {showPassword ? <EyeOff size={20}/> : <Eye size={20}/>}
                      </button>
                    </div>
                  </div>
                  <button 
                    disabled={loading}
                    className="w-full py-4 bg-gray-900 hover:bg-black text-white rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 transform transition-all active:scale-95 disabled:opacity-70"
                  >
                    {loading ? "Authenticating..." : "Sign In Account"} <ArrowRight size={20} />
                  </button>
                </form>
              )}

              {(loginMethod === 'mobile' || loginMethod === 'emailOtp') && (
                <div className="space-y-5">
                  {!(loginMethod === 'mobile' ? otpSent : emailOtpSent) ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">
                          {loginMethod === 'mobile' ? 'Mobile Number' : 'Email for OTP'}
                        </label>
                        <div className="relative group">
                          {loginMethod === 'mobile'
                            ? <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
                            : <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20}/>
                          }
                          <input 
                            type={loginMethod === 'mobile' ? "tel" : "email"}
                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-indigo-600 outline-none transition-all font-medium"
                            placeholder={loginMethod === 'mobile' ? "Enter 10 digits" : "example@mail.com"}
                            value={loginMethod === 'mobile' ? mobileNumber : emailForOtp}
                            onChange={(e) => loginMethod === 'mobile'
                              ? setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))
                              : setEmailForOtp(e.target.value)
                            }
                          />
                        </div>
                      </div>
                      <button 
                        onClick={loginMethod === 'mobile' ? handleRequestOTP : handleRequestEmailOTP}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 transition-all active:scale-95"
                      >
                        Get Secure Code <KeyRound size={20} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-6 text-center">
                      <div className="bg-indigo-50 p-4 rounded-2xl flex items-center justify-center gap-2">
                        <CheckCircle2 className="text-indigo-600" size={18} />
                        <span className="text-sm font-bold text-indigo-800">
                          Code sent to {loginMethod === 'mobile' ? mobileNumber : emailForOtp}
                        </span>
                      </div>
                      <div className="flex gap-2 justify-center">
                        {(loginMethod === 'mobile' ? otp : emailOtp).map((digit, idx) => (
                          <input 
                            key={idx}
                            id={`${loginMethod === 'mobile' ? 'otp' : 'email-otp'}-${idx}`}
                            type="text" maxLength={1}
                            className="w-12 h-14 text-center text-xl font-black bg-gray-50 border-2 border-transparent rounded-xl focus:bg-white focus:border-indigo-600 outline-none transition-all"
                            value={digit}
                            onChange={(e) => handleOtpChange(idx, e.target.value, loginMethod === 'emailOtp')}
                          />
                        ))}
                      </div>
                      <button 
                        onClick={loginMethod === 'mobile' ? handleVerifyOTP : handleVerifyEmailOTP}
                        className="w-full py-4 bg-black text-white rounded-2xl font-bold transition-all active:scale-95"
                      >
                        Verify & Login
                      </button>
                      <button 
                        disabled={!canResend}
                        onClick={loginMethod === 'mobile' ? handleRequestOTP : handleRequestEmailOTP}
                        className="text-sm font-bold text-indigo-600 disabled:opacity-50"
                      >
                        {canResend ? "Resend Code" : `Resend in ${formatTime(otpTimer)}`}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Demo Credentials */}
            <div className="mt-10 p-4 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => { setLoginMethod('email'); setLoginRole('Admin'); setLoginData({email:'admin@ecommerce.com', password:'admin123'}); }}
                  className="text-[10px] text-left uppercase font-bold text-gray-400 hover:text-indigo-600"
                >
                  Quick Admin Access: admin@ecommerce.com
                </button>
                <button
                  onClick={() => { setLoginMethod('email'); setLoginRole('Customer'); setLoginData({email:'customer@test.com', password:'password123'}); }}
                  className="text-[10px] text-left uppercase font-bold text-gray-400 hover:text-indigo-600"
                >
                  Quick Customer Access: customer@test.com
                </button>
              </div>
            </div>

            <div className="mt-8 text-center">
              <p className="text-gray-500 font-medium">New Shopper? 
                <button onClick={() => setCurrentPage('register')} className="ml-2 text-indigo-600 font-black hover:underline">
                  Create Account
                </button>
              </p>
            </div>
            
            <button 
              onClick={() => setCurrentPage('home')}
              className="mt-6 mx-auto flex items-center gap-2 text-sm font-bold text-gray-400 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft size={16}/> Back to Catalog
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;