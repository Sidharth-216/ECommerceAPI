import { useState, useEffect, useCallback } from 'react';
import { mongoAuthAPI, ordersAPI, addressAPI } from '../api';

const isLocalhost = typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/.test(window.location.hostname);
const defaultApiBaseUrl = isLocalhost
  ? 'http://localhost:5033/api'
  : 'https://ecommerceapi-er8d.onrender.com/api';

const normalizeApiBaseUrl = (url) => {
  let normalized = (url || '').trim();
  if (!normalized) return normalized;

  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && normalized.startsWith('http://')) {
    try {
      const parsed = new URL(normalized);
      if (!/^(localhost|127\.0\.0\.1)$/i.test(parsed.hostname)) {
        normalized = normalized.replace(/^http:\/\//i, 'https://');
      }
    } catch {
      normalized = normalized.replace(/^http:\/\//i, 'https://');
    }
  }
  return normalized;
};

const rawApiBaseUrl = process.env.REACT_APP_API_URL || defaultApiBaseUrl;
const normalizedApiBaseUrl = normalizeApiBaseUrl(rawApiBaseUrl);
const API_BASE_URL = normalizedApiBaseUrl.endsWith('/api')
  ? normalizedApiBaseUrl
  : `${normalizedApiBaseUrl.replace(/\/$/, '')}/api`;

const writeTabSession = (token, userData, bootId) => {
  sessionStorage.setItem('token', token);
  sessionStorage.setItem('user',  JSON.stringify(userData));
  if (bootId) sessionStorage.setItem('serverBootId', bootId);
};

const writeLocalHint = (token, userData, bootId) => {
  localStorage.setItem('token', token);
  localStorage.setItem('user',  JSON.stringify(userData));
  if (bootId) localStorage.setItem('serverBootId', bootId);
};

const clearAuthSession = () => {
  ['token', 'user', 'serverBootId', 'cart'].forEach(k => {
    sessionStorage.removeItem(k);
    localStorage.removeItem(k);
  });
};

const extractUserIdFromToken = (token) => {
  try {
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return (
      payload.nameid ||
      payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'] ||
      payload.sub    ||
      payload.userId ||
      null
    );
  } catch { return null; }
};

const getBootIdSync = () => {
  return sessionStorage.getItem('serverBootId') || localStorage.getItem('serverBootId') || null;
};

const resolveTabSession = () => {
  const ssToken = sessionStorage.getItem('token');
  const ssUser  = sessionStorage.getItem('user');
  if (ssToken && ssUser) {
    try { return { token: ssToken, userData: JSON.parse(ssUser), source: 'session' }; }
    catch {
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
    }
  }
  const lsToken = localStorage.getItem('token');
  const lsUser  = localStorage.getItem('user');
  if (!lsToken || !lsUser) return null;
  try {
    const userData    = JSON.parse(lsUser);
    const tokenUserId = extractUserIdFromToken(lsToken);
    const storedId    = String(userData.userId || userData.id || '');
    if (tokenUserId && storedId && String(tokenUserId) !== storedId) {
      console.warn('⚠️ Cross-tab guard: rejecting localStorage (different user)');
      return null;
    }
    return { token: lsToken, userData, source: 'local' };
  } catch { return null; }
};

const callValidate = async (token) => {
  try {
    const res = await fetch(`${API_BASE_URL}/mongo/auth/validate`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
    });
    if (!res.ok) {
      return {
        ok: false,
        bootId: null,
        hardFail: res.status === 401 || res.status === 403,
      };
    }
    try {
      const json = await res.json();
      const bootId = json?.bootId || res.headers.get('X-Server-Boot-Id') || null;
      return { ok: true, bootId, hardFail: false };
    } catch {
      return { ok: true, bootId: null, hardFail: false };
    }
  } catch (err) {
    console.warn('⚠️ validate unreachable:', err.message);
    // Network/cold-start issue: do not force logout on refresh.
    return { ok: false, bootId: null, hardFail: false };
  }
};

export const useAuth = () => {
  const [user,        setUser]        = useState(null);
  const [orders,      setOrders]      = useState([]);
  const [profileData, setProfileData] = useState({
    fullName: '', email: '', mobile: '', gender: '', addresses: []
  });
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const resolved = resolveTabSession();
        if (!resolved) return;
        const { token, userData, source } = resolved;

        const tokenUserId = extractUserIdFromToken(token);
        const finalUserId = tokenUserId || userData.userId || userData.id;
        if (!finalUserId) {
          clearAuthSession();
          sessionStorage.setItem('currentPage', 'home');
          localStorage.setItem('currentPage',   'home');
          return;
        }

        const rehydratedUser = { ...userData, id: finalUserId, userId: finalUserId };

        // Optimistic restore: keeps user on current page and avoids refresh bounce.
        setUser(rehydratedUser);
        if (source === 'local') {
          writeTabSession(token, rehydratedUser, getBootIdSync());
        }

        const { ok, bootId: currentBootId, hardFail } = await callValidate(token);
        if (!ok && hardFail) {
          clearAuthSession();
          sessionStorage.setItem('currentPage', 'home');
          localStorage.setItem('currentPage',   'home');
          return;
        }

        if (currentBootId) {
          const storedBootId =
            sessionStorage.getItem('serverBootId') ||
            localStorage.getItem('serverBootId');
          if (storedBootId && storedBootId !== currentBootId) {
            console.warn('⚠️ Server restarted — clearing session');
            clearAuthSession();
            sessionStorage.setItem('currentPage', 'home');
            localStorage.setItem('currentPage',   'home');
            return;
          }
          if (!storedBootId) {
            sessionStorage.setItem('serverBootId', currentBootId);
            localStorage.setItem('serverBootId',   currentBootId);
          }
        }

        console.log(`✅ Session restored (${source}) for: ${rehydratedUser.email}`);
      } catch (err) {
        console.error('❌ Session restore error:', err);
        clearAuthSession();
        sessionStorage.setItem('currentPage', 'home');
        localStorage.setItem('currentPage',   'home');
      } finally {
        setIsInitializing(false);
      }
    };
    restoreSession();
  }, []);

  const handleLogin = async (loginData, loginRole, setError, setLoading) => {
    setError('');
    setLoading(true);
    try {
      if (!loginData.email?.trim()) throw new Error('Email is required');
      if (!loginData.password)       throw new Error('Password is required');

      const response = await mongoAuthAPI.login(loginData.email.trim(), loginData.password);
      const data = response?.data;
      if (!data?.token) throw new Error('Authentication token not received from server');

      const userRole = String(data.role || '').trim();
      if (!userRole || (userRole !== 'Customer' && userRole !== 'Admin'))
        throw new Error('Invalid user role received from server');
      if (userRole !== loginRole)
        throw new Error(`This account is registered as ${userRole}. Please select ${userRole} login.`);

      const tokenUserId = extractUserIdFromToken(data.token);
      const finalUserId = tokenUserId || data.mongoUserId || data.userId || data.id;
      if (!finalUserId) throw new Error('User ID not found. Please contact support.');

      const userData = { ...data, role: userRole, userId: finalUserId, id: finalUserId };

      writeTabSession(data.token, userData);
      writeLocalHint(data.token, userData);

      setUser({
        id: finalUserId, userId: finalUserId,
        email: data.email || '', role: userRole,
        name: data.fullName || data.name || '',
        mobile: data.mobile || '', gender: data.gender || ''
      });
      console.log('✅ Login OK');
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
    if (!fullName?.trim())            throw new Error('Full name is required');
    if (!email?.trim())               throw new Error('Email is required');
    if (!mobile?.trim())              throw new Error('Mobile number is required');
    if (!password)                    throw new Error('Password is required');
    if (password !== confirmPassword) throw new Error('Passwords do not match');
    if (password.length < 6)         throw new Error('Password must be at least 6 characters');

    setLoading(true);
    setError('');
    try {
      const response = await mongoAuthAPI.register(
        fullName.trim(), email.trim(), mobile.trim(), password, gender
      );
      const data = response.data;
      if (!data.token) throw new Error('No token received from server');
      if (!data.role)  throw new Error('No role returned from server');

      const tokenUserId = extractUserIdFromToken(data.token);
      const finalUserId = tokenUserId || data.userId || data.id || data.mongoUserId;
      if (!finalUserId) throw new Error('User ID not found in token.');

      const userData = { ...data, userId: finalUserId, id: finalUserId };
      writeTabSession(data.token, userData);
      writeLocalHint(data.token, userData);

      setUser({
        id: finalUserId, userId: finalUserId,
        email: data.email, role: data.role,
        name: data.fullName, mobile: data.mobile || mobile, gender: data.gender || gender
      });
      setProfileData({
        fullName: data.fullName || fullName, email: data.email || email,
        mobile: data.mobile || mobile, gender: data.gender || gender, addresses: []
      });
      return true;
    } catch (err) {
      console.error('❌ Registration error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = useCallback(() => {
    clearAuthSession();
    sessionStorage.setItem('currentPage', 'home');
    localStorage.setItem('currentPage',   'home');
    setUser(null);
    setOrders([]);
    setProfileData({ fullName: '', email: '', mobile: '', gender: '', addresses: [] });
  }, []);

  const loadProfile = useCallback(async () => {
    if (!user) return;
    try {
      let addresses = [];
      try {
        if (typeof addressAPI?.getAll === 'function') {
          const addrRes = await addressAPI.getAll();
          addresses = Array.isArray(addrRes?.data) ? addrRes.data : addrRes?.data?.addresses || [];
        }
      } catch (err) { console.warn('⚠️ addresses:', err); }
      addresses = (addresses || []).map((a, i) => {
        const id = a._id || a.id || a.Id || `addr_${i}`;
        return {
          id, _id: id,
          label:        a.label || a.Label || (a.IsDefault ? 'Home' : 'Address'),
          AddressLine1: a.AddressLine1 || a.addressLine1 || '',
          AddressLine2: a.AddressLine2 || a.addressLine2 || '',
          City:         a.City  || a.city  || '',
          State:        a.State || a.state || '',
          PostalCode:   a.PostalCode || a.postalCode || '',
          Country:      a.Country   || a.country    || 'India',
          IsDefault:    Boolean(a.IsDefault || a.isDefault)
        };
      });
      setProfileData(prev => ({ ...prev, addresses }));
    } catch (err) {
      console.error('❌ loadProfile:', err);
      // Keep last known addresses on transient backend failures.
      setProfileData(prev => ({ ...prev }));
    }
  }, [user]);

  const loadOrders = useCallback(async () => {
    if (!user) return;
    try {
      const res = await ordersAPI.history();
      setOrders(res?.data || []);
    } catch (err) {
      console.error('❌ loadOrders:', err);
      // Do not wipe existing orders for temporary network/rate-limit failures.
      setOrders(prev => prev);
    }
  }, [user]);

  return {
    user, setUser, orders, setOrders, profileData, setProfileData,
    isInitializing, handleLogin, handleRegister, handleLogout,
    loadProfile, loadOrders
  };
};