import { useState } from 'react';
import { mongoAuthAPI, ordersAPI, addressAPI, getUserIdFromToken } from '../api';

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

      console.log('🔐 Attempting MongoDB login...');

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

      localStorage.setItem('token', data.token);

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

      localStorage.setItem('user', JSON.stringify(userData));

      setUser({
        id: finalUserId,
        userId: finalUserId,
        email: data.email || '',
        role: userRole,
        name: data.fullName || data.name || '',
        mobile: data.mobile || '',
        gender: data.gender || ''
      });

      console.log('✅ Login successful');

      return userRole;
    } catch (err) {
      console.error('❌ Login error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (registerData, loginRole, setError, setLoading) => {
    const { fullName, email, mobile, password, confirmPassword, gender } = registerData;

    if (!fullName?.trim()) throw new Error('Full name is required');
    if (!email?.trim()) throw new Error('Email is required');
    if (!mobile?.trim()) throw new Error('Mobile number is required');
    if (!password) throw new Error('Password is required');
    if (password !== confirmPassword) throw new Error('Passwords do not match');
    if (password.length < 6) throw new Error('Password must be at least 6 characters');

    setLoading(true);
    setError('');

    try {
      console.log('📝 Attempting MongoDB registration...');

      const response = await mongoAuthAPI.register(
        fullName.trim(),
        email.trim(),
        mobile.trim(),
        password,
        gender
      );

      const data = response.data;

      if (!data.token) throw new Error('No token received from server');
      if (!data.role) throw new Error('No role returned from server');

      localStorage.setItem('token', data.token);

      const userIdFromToken = getUserIdFromToken();
      const finalUserId = userIdFromToken || data.userId || data.id || data.mongoUserId;

      if (!finalUserId) {
        throw new Error('User ID not found in token. Please contact support.');
      }

      const userData = {
        ...data,
        userId: finalUserId,
        id: finalUserId
      };

      localStorage.setItem('user', JSON.stringify(userData));

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

      console.log('✅ Registration successful');

      return true;
    } catch (err) {
      console.error('❌ Registration error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('cart');
    localStorage.removeItem('currentPage');

    setUser(null);
    setOrders([]);
    setProfileData({
      fullName: '',
      email: '',
      mobile: '',
      gender: '',
      addresses: []
    });

    console.log('✅ User logged out successfully');
  };

  const loadProfile = async () => {
    if (!user) return;

    try {
      console.log('📋 Loading profile data...');

      let addresses = [];

      try {
        if (typeof addressAPI?.getAll === 'function') {
          const addrRes = await addressAPI.getAll();
          addresses = Array.isArray(addrRes?.data)
            ? addrRes.data
            : addrRes?.data?.addresses || [];
        }
      } catch (err) {
        console.warn('⚠️ Could not fetch addresses:', err);
        addresses = [];
      }

      addresses = (addresses || []).map((a, index) => {
        const mongoId = a._id || a.id || a.Id || `addr_${index}`;
        return {
          id: mongoId,
          _id: mongoId,
          label: a.label || a.Label || (a.IsDefault ? 'Home' : 'Address'),
          AddressLine1: a.AddressLine1 || a.addressLine1 || '',
          AddressLine2: a.AddressLine2 || a.addressLine2 || '',
          City: a.City || a.city || '',
          State: a.State || a.state || '',
          PostalCode: a.PostalCode || a.postalCode || '',
          Country: a.Country || a.country || 'India',
          IsDefault: Boolean(a.IsDefault || a.isDefault)
        };
      });

      setProfileData(prev => ({
        ...prev,
        addresses
      }));

      console.log('✅ Profile loaded with', addresses.length, 'addresses');
    } catch (err) {
      console.error('❌ Error loading profile:', err);
      setProfileData(prev => ({ ...prev, addresses: [] }));
    }
  };

  const loadOrders = async () => {
    if (!user) return;

    try {
      console.log('📦 Loading orders...');
      const response = await ordersAPI.history();
      const ordersData = response?.data || [];
      setOrders(ordersData);
      console.log('✅ Orders loaded:', ordersData.length);
    } catch (err) {
      console.error('❌ Error loading orders:', err);
      setOrders([]);
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