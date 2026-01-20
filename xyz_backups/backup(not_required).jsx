
// OTP Login Page Component
const OTPLoginPage = () => {
  const [loginMethod, setLoginMethod] = useState('email'); // 'email' or 'mobile'
  const [showPassword, setShowPassword] = useState(false);
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [otpSent, setOtpSent] = useState(false);
  const [otpTimer, setOtpTimer] = useState(0);
  const [canResend, setCanResend] = useState(false);

  // OTP Timer countdown
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else if (otpTimer === 0 && otpSent) {
      setCanResend(true);
    }
  }, [otpTimer, otpSent]);

  const handleEmailLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const response = await authAPI.login(loginData.email.trim(), loginData.password);
      const data = response.data;
      const roleMap = { 0: 'Customer', 1: 'Admin' };
      const userRole = typeof data.role === 'number' ? roleMap[data.role] : data.role;
      
      if (userRole !== loginRole) {
        throw new Error(`This account is registered as ${userRole}. Please select ${userRole} login.`);
      }
      
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('user', JSON.stringify({ ...data, role: userRole }));
      setUser({ email: data.email, role: userRole, name: data.fullName, mobile: data.mobile || '' });
      setCurrentPage(userRole === 'Admin' ? 'admin' : 'products');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestOTP = async () => {
    if (!mobileNumber || mobileNumber.length < 10) {
      setError('Please enter a valid 10-digit mobile number');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await authAPI.requestOTP(mobileNumber);
      setOtpSent(true);
      setOtpTimer(300);
      setCanResend(false);
      alert('✅ OTP sent successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter complete 6-digit OTP');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const response = await authAPI.verifyOTP(mobileNumber, otpCode);
      const data = response.data;
      const roleMap = { 0: 'Customer', 1: 'Admin' };
      const userRole = typeof data.role === 'number' ? roleMap[data.role] : data.role;
      
      if (userRole !== loginRole) {
        throw new Error(`This account is registered as ${userRole}. Please select ${userRole} login.`);
      }
      
      sessionStorage.setItem('token', data.token);
      sessionStorage.setItem('user', JSON.stringify({ ...data, role: userRole }));
      setUser({ email: data.email, role: userRole, name: data.fullName, mobile: data.mobile || mobileNumber });
      setCurrentPage(userRole === 'Admin' ? 'admin' : 'products');
    } catch (err) {
      setError(err.response?.data?.message || 'OTP verification failed');
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

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-400 to-purple-500 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl translate-x-1/2 translate-y-1/2"></div>
      <div className="absolute top-1/2 right-1/4 w-72 h-72 bg-purple-400/10 rounded-full blur-3xl"></div>

      <div className="max-w-md w-full relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 mb-4 bg-white/20 backdrop-blur-md px-6 py-3 rounded-full border border-white/30 hover:bg-white/30 transition-all duration-300">
            <ShoppingBag className="w-8 h-8 text-white animate-bounce" />
            <h1 className="text-2xl font-bold text-white">ShopAI</h1>
          </div>
          <p className="text-white/90 text-lg font-medium">Welcome Back</p>
          <p className="text-white/70 text-sm mt-2">Choose your preferred login method</p>
        </div>

        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl p-8 border border-white/20">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-1">Sign In</h2>
            <div className="h-1 w-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full"></div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-4 rounded-lg mb-6 flex items-start gap-3">
              <div className="w-1 h-1 bg-red-500 rounded-full mt-2"></div>
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-xl">
            <button
              onClick={() => {
                setLoginMethod('email');
                setError('');
                setOtpSent(false);
              }}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                loginMethod === 'email' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Mail className="w-5 h-5" />
              Email
            </button>
            <button
              onClick={() => {
                setLoginMethod('mobile');
                setError('');
              }}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 ${
                loginMethod === 'mobile' ? 'bg-white text-blue-600 shadow-md' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Smartphone className="w-5 h-5" />
              Mobile OTP
            </button>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">Login As</label>
              <select
                value={loginRole}
                onChange={(e) => setLoginRole(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 bg-gray-50 hover:bg-white cursor-pointer text-gray-700 font-medium appearance-none"
              >
                <option value="Customer">👤 Customer</option>
                <option value="Admin">🏢 Admin</option>
              </select>
            </div>

            {loginMethod === 'email' && (
              <>
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
                      onKeyDown={(e) => e.key === 'Enter' && handleEmailLogin()}
                      className="w-full pl-12 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 bg-gray-50 focus:bg-white placeholder-gray-400"
                      placeholder="••••••••"
                    />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleEmailLogin}
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white py-3 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2 group"
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Signing In...
                    </>
                  ) : (
                    <>
                      <span>Sign In with Email</span>
                      <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </>
                  )}
                </button>
              </>
            )}

            {loginMethod === 'mobile' && (
              <>
                {!otpSent ? (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">Mobile Number</label>
                      <div className="relative group">
                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 w-5 h-5 group-focus-within:text-blue-600 transition-colors" />
                        <input
                          type="tel"
                          value={mobileNumber}
                          onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 bg-gray-50 focus:bg-white placeholder-gray-400"
                          placeholder="9876543210"
                          maxLength="10"
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Enter your registered mobile number</p>
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
                          <KeyRound className="w-5 h-5" />
                          Send OTP
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-3">Enter 6-Digit OTP</label>
                      <p className="text-xs text-gray-500 mb-4">
                        OTP sent to {mobileNumber} • {formatTime(otpTimer)} remaining
                      </p>
                      <div className="flex gap-2 justify-center mb-4">
                        {otp.map((digit, index) => (
                          <input
                            key={index}
                            id={`otp-${index}`}
                            type="text"
                            maxLength="1"
                            value={digit}
                            onChange={(e) => handleOtpChange(index, e.target.value)}
                            onKeyDown={(e) => handleOtpKeyDown(index, e)}
                            className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all duration-300 bg-gray-50 focus:bg-white"
                          />
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleVerifyOTP}
                      disabled={loading}
                      className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 rounded-xl font-bold text-lg transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Verifying...
                        </>
                      ) : (
                        'Verify & Login'
                      )}
                    </button>

                    <div className="flex items-center justify-between text-sm">
                      <button
                        onClick={() => {
                          setOtpSent(false);
                          setOtp(['', '', '', '', '', '']);
                          setError('');
                        }}
                        className="text-gray-600 hover:text-gray-900 font-medium flex items-center gap-1 group"
                      >
                        <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                        </svg>
                        Change Number
                      </button>
                      <button
                        onClick={handleRequestOTP}
                        disabled={!canResend || loading}
                        className="text-blue-600 hover:text-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {canResend ? 'Resend OTP' : `Resend in ${formatTime(otpTimer)}`}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {loginMethod === 'email' && (
            <div className="mt-8 bg-white/20 backdrop-blur-md rounded-2xl p-6 border border-white/30">
              <p className="text-white/80 text-xs font-semibold mb-4 flex items-center gap-2">
                <span>🔑</span> Demo Credentials
              </p>
              <div className="space-y-2">
                <button
                  onClick={() => {
                    setLoginRole('Admin');
                    setLoginData({ email: 'admin@ecommerce.com', password: 'admin123' });
                  }}
                  className="w-full text-left text-xs px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white border border-white/20 transition-all duration-300 font-medium"
                >
                  <span className="font-bold">Admin:</span> admin@ecommerce.com / admin123
                </button>
                <button
                  onClick={() => {
                    setLoginRole('Customer');
                    setLoginData({ email: 'customer@test.com', password: 'password123' });
                  }}
                  className="w-full text-left text-xs px-4 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white border border-white/20 transition-all duration-300 font-medium"
                >
                  <span className="font-bold">Customer:</span> customer@test.com / password123
                </button>
              </div>
            </div>
          )}

          <div className="mt-8 text-center">
            <p className="text-gray-600 text-sm">
              Don't have an account?{' '}
              <button
                onClick={() => setCurrentPage('register')}
                className="text-blue-600 hover:text-blue-700 font-bold transition-colors hover:underline"
              >
                Create Account
              </button>
            </p>
          </div>
        </div>

        <div className="text-center mt-8">
          <button
            onClick={() => setCurrentPage('home')}
            className="text-white/80 hover:text-white transition-colors font-medium flex items-center justify-center gap-2 mx-auto group"
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};
