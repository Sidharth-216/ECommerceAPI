import { useState } from 'react';
import { authAPI, ordersAPI, addressAPI, mongoAuthAPI, getUserIdFromToken } from '../api';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    mobile: '',
    gender: '',
    addresses: []
  });

  const handleLogin = async (loginData, loginRole, setError, setLoading) => {
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

      return userRole;
    } catch (err) {
      console.error('Login error details:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (registerData, loginRole, setError, setLoading) => {
    const { fullName, email, mobile, password, confirmPassword, gender } = registerData;
    
    if (!fullName?.trim()) {
      throw new Error('Full name is required');
    }
    
    if (!email?.trim()) {
      throw new Error('Email is required');
    }
    
    if (!mobile?.trim()) {
      throw new Error('Mobile number is required');
    }
    
    if (!password) {
      throw new Error('Password is required');
    }
    
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }
    
    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }
    
    setLoading(true);
    setError('');
    
    try {
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
      
      if (!finalUserId) {
        throw new Error('User ID not found in token. Please contact support.');
      }
      
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
      
      return true;
    } catch (err) {
      console.error('Registration error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    
    setUser(null);
    setOrders([]);
    setProfileData({
      fullName: '',
      email: '',
      mobile: '',
      addresses: []
    });
    
    console.log('User logged out successfully');
  };

  const loadProfile = async () => {
    if (!user) return;
    
    try {
      let addresses = [];
      let profileData = {};
      
      try {
        if (typeof addressAPI?.getAll === 'function') {
          const addrRes = await addressAPI.getAll();
          addresses = Array.isArray(addrRes?.data) ? addrRes.data : addrRes?.data?.addresses || addrRes?.data || [];
        } else {
          const response = await authAPI.getProfile();
          const data = response.data || {};
          const rawAddresses = data.addresses || data.addressList || [];
          addresses = Array.isArray(rawAddresses) ? rawAddresses : [];
          profileData = data;
        }
      } catch (innerErr) {
        console.warn('Address fetch via addressAPI failed, trying authAPI profile', innerErr);
        try {
          const response = await authAPI.getProfile();
          const data = response.data || {};
          const rawAddresses = data.addresses || data.addressList || [];
          addresses = Array.isArray(rawAddresses) ? rawAddresses : [];
          profileData = data;
        } catch (e) {
          addresses = [];
        }
      }

      addresses = (addresses || []).map(a => {
        const addrLine1 = a.AddressLine1 || a.address || a.line1 || '';
        const addrLine2 = a.AddressLine2 || a.line2 || '';
        const city = a.City || a.city || '';
        const state = a.State || a.state || '';
        const postal = a.PostalCode || a.postalCode || a.pincode || '';
        const country = a.Country || a.country || '';

        const addressString = a.address || [
          addrLine1,
          addrLine2,
          city,
          state,
          postal,
          country
        ].filter(Boolean).join(', ').trim();

        return {
          id: a.Id ?? a.id ?? a.addressId ?? null,
          label: a.label || (a.IsDefault ? 'Home' : a.type) || 'Address',
          AddressLine1: addrLine1 || '',
          AddressLine2: addrLine2 || '',
          City: city || '',
          State: state || '',
          PostalCode: postal || '',
          Country: country || '',
          IsDefault: !!a.IsDefault,
          address: addressString || ''
        };
      });

      const gender = profileData.gender || profileData.Gender || user.gender || '';

      setProfileData(prev => ({
        ...prev,
        fullName: profileData.fullName || profileData.FullName || prev.fullName || '',
        email: profileData.email || profileData.Email || prev.email || '',
        mobile: (profileData.mobile || profileData.Mobile || prev.mobile || '').toString().trim(),
        gender: gender,
        addresses: addresses || []
      }));

      setUser(prev => ({
        ...prev,
        gender: gender
      }));

    } catch (err) {
      console.error('Error loading profile:', err);
      setProfileData(prev => ({ ...prev, addresses: [] }));
    }
  };

  const loadOrders = async () => {
    if (!user) return;
    try {
      const response = await ordersAPI.history();
      setOrders(response.data || []);
    } catch (err) {
      console.error('Error loading orders:', err);
    }
  };

  return {
    user,
    setUser,
    orders,
    setOrders,
    profileData,
    setProfileData,
    handleLogin,
    handleRegister,
    handleLogout,
    loadProfile,
    loadOrders
  };
};