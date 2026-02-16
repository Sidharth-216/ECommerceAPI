import React, { useState } from 'react';
import { 
  ShoppingBag, User, Mail, Phone, Eye, EyeOff, 
  ArrowRight, CheckCircle2, ShieldCheck, 
  Globe, Truck, CreditCard, ChevronLeft 
} from 'lucide-react';

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

  // Theme Constants
  const primaryGradient = "bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700";
  const inputStyle = "w-full pl-11 pr-4 py-3 bg-gray-50 border-2 border-transparent rounded-2xl focus:bg-white focus:border-teal-500 outline-none transition-all font-medium text-sm";

  const handleRegister = async () => {
    const { fullName, email, mobile, password, confirmPassword, gender } = registerData;
    
    if (!fullName?.trim() || !email?.trim() || !mobile?.trim() || !password) {
      setError('Please fill in all required fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const { mongoAuthAPI, getUserIdFromToken } = await import('../api');
      const response = await mongoAuthAPI.register(fullName.trim(), email.trim(), mobile.trim(), password, gender);
      const data = response.data;
      
      sessionStorage.setItem('token', data.token);
      const userId = getUserIdFromToken() || data.userId || data.id;
      
      const userData = { ...data, userId, id: userId };
      sessionStorage.setItem('user', JSON.stringify(userData));
      
      setUser(userData);
      setProfileData({ ...userData, addresses: [] });
      setCurrentPage('products');
      
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF] flex flex-col lg:flex-row">
      
      {/* --- Left Column: Brand & Benefits --- */}
      <section className="lg:w-[40%] bg-slate-900 lg:fixed lg:h-full p-8 lg:p-16 flex flex-col justify-between overflow-hidden">
        {/* Abstract Background Element */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        
        <div className="relative z-10">
          <button 
            onClick={() => setCurrentPage('home')}
            className="flex items-center gap-2 group mb-12"
          >
            <div className={`${primaryGradient} p-2 rounded-xl`}>
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black text-white tracking-tight">ShopAI</span>
          </button>

          <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight mb-6">
            Start your <span className="text-teal-400">journey</span> with us today.
          </h1>
          <p className="text-slate-400 text-lg mb-12">Join over 10 million shoppers worldwide.</p>

          <div className="space-y-8">
            {[
              { icon: <Truck className="text-teal-400" />, title: "Free Express Shipping", desc: "On all orders above ₹999" },
              { icon: <ShieldCheck className="text-cyan-400" />, title: "Secure Transactions", desc: "100% payment protection" },
              { icon: <Globe className="text-teal-400" />, title: "Exclusive Rewards", desc: "Earn points on every purchase" }
            ].map((benefit, i) => (
              <div key={i} className="flex gap-4 group">
                <div className="bg-white/5 p-3 rounded-2xl group-hover:bg-teal-500/20 transition-colors">
                  {benefit.icon}
                </div>
                <div>
                  <h3 className="font-bold text-white">{benefit.title}</h3>
                  <p className="text-sm text-slate-500">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 pt-12 border-t border-white/5">
          <p className="text-slate-500 text-sm">© 2026 ShopAI Global Marketplace</p>
        </div>
      </section>

      {/* --- Right Column: Registration Form --- */}
      <section className="lg:w-[60%] lg:ml-[40%] min-h-screen p-6 lg:p-20 flex flex-col justify-center">
        <div className="max-w-xl mx-auto w-full">
          
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-black text-slate-900">Create Account</h2>
              <p className="text-slate-500 font-medium mt-1">Fill in the details to get started</p>
            </div>
            <button 
              onClick={() => setCurrentPage('login')}
              className="text-sm font-bold text-teal-600 hover:text-teal-700"
            >
              Sign in instead
            </button>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 text-sm font-bold rounded-r-xl animate-pulse">
              {error}
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleRegister(); }} className="space-y-5">
            
            {/* Role Toggle */}
            <div className="flex p-1 bg-gray-100 rounded-2xl mb-8">
              <button
                type="button"
                onClick={() => setLoginRole('Customer')}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${loginRole === 'Customer' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500'}`}
              >
                Shopping Account
              </button>
              <button
                type="button"
                onClick={() => setLoginRole('Admin')}
                className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${loginRole === 'Admin' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500'}`}
              >
                Seller Account
              </button>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {/* Full Name */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-500 transition-colors" size={18} />
                  <input 
                    type="text" required className={inputStyle} placeholder="John Doe"
                    value={registerData.fullName}
                    onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}
                  />
                </div>
              </div>

              {/* Mobile */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Mobile Number</label>
                <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-500 transition-colors" size={18} />
                  <input 
                    type="tel" required className={inputStyle} placeholder="9876543210" maxLength={10}
                    value={registerData.mobile}
                    onChange={(e) => setRegisterData({ ...registerData, mobile: e.target.value.replace(/\D/g, '') })}
                  />
                </div>
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-500 transition-colors" size={18} />
                <input 
                  type="email" required className={inputStyle} placeholder="john@example.com"
                  value={registerData.email}
                  onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              {/* Password */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Password</label>
                <div className="relative group">
                  <Eye className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-500 transition-colors" size={18} />
                  <input 
                    type={showPassword ? "text" : "password"} required className={inputStyle} placeholder="••••••••"
                    value={registerData.password}
                    onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Confirm</label>
                <div className="relative group">
                  <CheckCircle2 className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-teal-500 transition-colors" size={18} />
                  <input 
                    type={showPassword ? "text" : "password"} required className={inputStyle} placeholder="••••••••"
                    value={registerData.confirmPassword}
                    onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Gender Selection */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Gender (Optional)</label>
              <div className="flex gap-3">
                {['Male', 'Female', 'Other'].map((g) => (
                  <button
                    key={g} type="button"
                    onClick={() => setRegisterData({...registerData, gender: g})}
                    className={`flex-1 py-2.5 rounded-xl border-2 font-bold text-sm transition-all ${registerData.gender === g ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-100 text-gray-400'}`}
                  >
                    {g}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 rounded-2xl text-white font-bold shadow-xl shadow-teal-200/50 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 ${primaryGradient}`}
              >
                {loading ? "Creating your account..." : "Create My Account"} <ArrowRight size={20} />
              </button>
            </div>
          </form>

          <p className="mt-8 text-center text-slate-400 text-xs leading-relaxed">
            By clicking "Create My Account", you agree to our <br />
            <span className="text-slate-900 font-bold cursor-pointer">Terms of Service</span> and <span className="text-slate-900 font-bold cursor-pointer">Privacy Policy</span>.
          </p>
        </div>
      </section>

      {/* Floating Back Button (Mobile) */}
      <button 
        onClick={() => setCurrentPage('home')}
        className="fixed bottom-6 right-6 lg:hidden w-12 h-12 bg-white shadow-2xl rounded-full flex items-center justify-center text-slate-900 border border-gray-100"
      >
        <ChevronLeft size={24} />
      </button>

    </div>
  );
};

export default RegisterPage;