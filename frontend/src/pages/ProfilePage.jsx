import React, { useState, useEffect } from 'react';
import { ShoppingBag, ShoppingCart, LogOut, User, MapPin, Package, Clock, Plus, Trash2 } from 'lucide-react';
import { authAPI, addressAPI } from '../api';

const ProfilePage = ({
  user,
  cart,
  orders,
  profileData,
  setProfileData,
  setCurrentPage,
  handleLogout,
  setError,
  loadOrders,
  loading,
  setLoading
}) => {
  const [editMode, setEditMode] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({
    AddressLine1: '',
    AddressLine2: '',
    City: '',
    State: '',
    PostalCode: '',
    Country: '',
    IsDefault: false
  });

  useEffect(() => {
    fetchAddresses();
    fetchProfile();
  }, []);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoadingProfile(true);
      const res = await authAPI.getProfile();
      console.log('Profile API response:', res.data);
      
      const data = res.data;
      
      setProfileData({
        fullName: data.fullName || user?.name || '',
        email: data.email || user?.email || '',
        mobile: data.mobile || user?.mobile || '+91 00000 00000',
        gender: data.gender || user?.gender || '',
        addresses: data.addresses || []
      });
    } catch (err) {
      console.error('Profile fetch error:', err);
      if (user) {
        setProfileData({
          fullName: user.name || '',
          email: user.email || '',
          mobile: user.mobile || '+91 00000 00000',
          gender: user.gender || '',
          addresses: []
        });
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  const fetchAddresses = async () => {
    try {
      let res;
      let currentUserId = null;
      
      try {
        const profileRes = await authAPI.getProfile();
        currentUserId = profileRes.data?.id || profileRes.data?.userId || profileRes.data?.Id;
        console.log('Current user ID:', currentUserId);
      } catch (err) {
        console.error('Failed to get user profile:', err);
      }
      
      if (typeof addressAPI?.getAll === 'function') {
        res = await addressAPI.getAll();
      } else if (typeof authAPI?.getProfile === 'function') {
        const profileRes = await authAPI.getProfile();
        res = { data: profileRes.data?.addresses || profileRes.data?.addressList || [] };
      } else {
        console.warn('No API available for fetching addresses');
        setProfileData(prev => ({ ...prev, addresses: [] }));
        return;
      }

      const rawAddresses = Array.isArray(res.data) 
        ? res.data 
        : (res.data?.addresses || res.data?.addressList || []);

      console.log('Raw addresses from API:', rawAddresses);

      const userAddresses = currentUserId 
        ? rawAddresses.filter(a => {
            const addrUserId = a.userId || a.UserId || a.user_id || a.UserID;
            return addrUserId === currentUserId || addrUserId === String(currentUserId);
          })
        : rawAddresses;

      console.log('Filtered addresses for user:', userAddresses);

      const normalized = userAddresses.map((a, index) => {
        const addrLine1 = a.AddressLine1 || a.addressLine1 || a.line1 || '';
        const addrLine2 = a.AddressLine2 || a.addressLine2 || a.line2 || '';
        const city = a.City || a.city || '';
        const state = a.State || a.state || '';
        const postal = a.PostalCode || a.postalCode || a.pincode || '';
        const country = a.Country || a.country || '';
        const addressString = [addrLine1, addrLine2, city, state, postal, country]
          .filter(Boolean)
          .join(', ')
          .trim();

        return {
          id: a.Id || a.id || `addr_${Date.now()}_${index}`,
          label: a.Label || a.label || (a.IsDefault ? 'Home' : 'Address'),
          AddressLine1: addrLine1,
          AddressLine2: addrLine2,
          City: city,
          State: state,
          PostalCode: postal,
          Country: country,
          IsDefault: !!(a.IsDefault || a.isDefault),
          address: addressString,
          userId: a.userId || a.UserId || a.user_id || currentUserId
        };
      });

      console.log('Final normalized addresses:', normalized);
      setProfileData(prev => ({ ...prev, addresses: normalized }));
      
    } catch (err) {
      console.error('Failed to fetch addresses for profile page', err);
      setProfileData(prev => ({ ...prev, addresses: [] }));
    }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true);
      setError('');

      const payload = {
        fullName: profileData.fullName,
        mobile: profileData.mobile,
        gender: profileData.gender
      };

      if (typeof authAPI.updateProfile === 'function') {
        await authAPI.updateProfile(payload);
      } else {
        console.warn('updateProfile method not available on authAPI');
      }

      const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
      sessionStorage.setItem('user', JSON.stringify({
        ...userData,
        fullName: profileData.fullName,
        mobile: profileData.mobile,
        gender: profileData.gender
      }));

      setEditMode(false);
      alert('✅ Profile updated successfully!');
    } catch (err) {
      console.error('Profile update error:', err);
      setError(
        err.response?.data?.message ||
        err.message ||
        'Failed to update profile. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      await loadOrders();
    } catch (err) {
      console.error('Orders fetch failed', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50">
      {/* HEADER */}
      <header className="bg-white shadow-md sticky top-0 z-40 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl shadow-lg">
              <ShoppingBag className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">ShopAI</h1>
              <p className="text-xs text-gray-500">AI-Powered Shopping Assistant</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setCurrentPage('products')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-all font-medium"
            >
              🛍️ Shop
            </button>

            <button
              onClick={() => setCurrentPage('orders')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-lg transition-all font-medium"
            >
              📦 Orders
            </button>

            <button
              onClick={() => setCurrentPage('cart')}
              className="relative p-3 hover:bg-gradient-to-br hover:from-blue-50 hover:to-indigo-50 rounded-xl transition-all group"
            >
              <ShoppingCart className="w-6 h-6 text-gray-700 group-hover:text-blue-600 transition-colors" />
              {cart.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-gradient-to-br from-red-500 to-red-600 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform">
                  {cart.length}
                </span>
              )}
            </button>

            <button className="p-3 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-xl hover:shadow-md transition-all group border border-blue-200">
              <User className="w-6 h-6 text-blue-600 group-hover:text-indigo-700 transition-colors" />
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-xl transition-all font-semibold hover:shadow-sm"
            >
              <LogOut className="w-5 h-5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* PAGE HEADER */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-2">Welcome, {user?.name || 'User'}! 👋</h2>
              <p className="text-gray-600">Manage your profile, addresses, and orders in one place</p>
            </div>
            <button
              onClick={editMode ? handleSaveProfile : () => setEditMode(true)}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center gap-2 ${
                editMode
                  ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white'
                  : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white'
              }`}
            >
              {editMode ? (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Save Changes
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                  Edit Profile
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* MAIN CONTENT */}
          <div className="lg:col-span-2 space-y-6">
            {/* PERSONAL INFO CARD */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-8 py-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  Personal Information
                </h3>
              </div>
              <div className="p-8">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Full Name</label>
                    <input
                      value={profileData.fullName || ''}
                      onChange={e =>
                        setProfileData({ ...profileData, fullName: e.target.value })
                      }
                      disabled={!editMode}
                      className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 focus:outline-none ${
                        editMode
                          ? 'border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white'
                          : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                      }`}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Email Address</label>
                    <input
                      value={profileData.email || ''}
                      disabled
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl bg-gray-50 cursor-not-allowed text-gray-600"
                    />
                    <p className="text-xs text-gray-500 mt-1">✓ Email cannot be changed</p>
                  </div>

                  {/* Mobile */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Mobile Number</label>
                    <input
                      type="tel"
                      value={(profileData.mobile || '').toString()}
                      onChange={e =>
                        setProfileData({ ...profileData, mobile: e.target.value })
                      }
                      disabled={!editMode}
                      className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 focus:outline-none ${
                        editMode
                          ? 'border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white'
                          : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                      }`}
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-3 uppercase tracking-wide">Gender</label>
                    <div className="relative">
                      <select
                        value={profileData.gender || ''}
                        onChange={e =>
                          setProfileData({ ...profileData, gender: e.target.value })
                        }
                        disabled={!editMode}
                        className={`w-full px-4 py-3 border-2 rounded-xl transition-all duration-300 focus:outline-none appearance-none cursor-pointer ${
                          editMode
                            ? 'border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white'
                            : 'border-gray-200 bg-gray-50 cursor-not-allowed'
                        }`}
                      >
                        <option value="">Select Gender (Optional)</option>
                        <option value="Male">👨 Male</option>
                        <option value="Female">👩 Female</option>
                        <option value="Other">🧑 Other</option>
                        <option value="PreferNotToSay">🤐 Prefer Not to Say</option>
                      </select>
                      <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Changes Button */}
                {editMode && (
                  <div className="mt-8 flex gap-4 pt-6 border-t border-gray-200">
                    <button
                      onClick={handleSaveProfile}
                      disabled={loading}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl font-bold transition-all duration-300 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group shadow-lg hover:shadow-xl"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          Save Changes
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setEditMode(false);
                        fetchProfile();
                      }}
                      className="flex-1 px-6 py-3 border-2 border-gray-300 text-gray-700 hover:border-red-300 hover:bg-red-50 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 group"
                    >
                      <svg className="w-5 h-5 group-hover:rotate-180 transition-transform" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ADDRESSES CARD */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300">
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-8 py-6 border-b border-gray-200">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
                    <MapPin className="w-6 h-6 text-white" />
                  </div>
                  Saved Addresses
                </h3>
              </div>

              <div className="p-8">
                <div className="flex gap-3 mb-6">
                  {/* Add Address Button */}
                  <button
                    onClick={async () => {
                      try {
                        const line1 = window.prompt('📍 Address Line 1');
                        if (!line1) return;

                        const payload = {
                          AddressLine1: line1,
                          AddressLine2: window.prompt('📍 Address Line 2 (optional)') || '',
                          City: window.prompt('🏙️ City') || '',
                          State: window.prompt('📌 State (optional)') || '',
                          PostalCode: window.prompt('📮 Postal Code (optional)') || '',
                          Country: window.prompt('🌍 Country', 'India') || 'India',
                          IsDefault: window.confirm('⭐ Set as default address?')
                        };

                        await addressAPI.add(payload);

                        if (typeof addressAPI.syncLocalAddresses === 'function') {
                          await addressAPI.syncLocalAddresses();
                        }

                        await fetchAddresses();
                        alert('✅ Address added successfully');
                      } catch (err) {
                        console.error('Add address error:', err);
                        alert(err?.response?.data?.message || err.message || 'Failed to add address');
                      }
                    }}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg active:scale-95 transition-all font-bold flex items-center gap-2 group"
                  >
                    <Plus className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    Add New Address
                  </button>

                  {/* Delete All Button */}
                  {profileData.addresses && profileData.addresses.length > 0 && (
                    <button
                      onClick={async () => {
                        if (!window.confirm('🗑️ Delete all your addresses? This cannot be undone!')) return;

                        try {
                          for (const addr of profileData.addresses) {
                            await addressAPI.remove(addr.id);
                          }
                          await fetchAddresses();
                          alert('✅ All addresses deleted');
                        } catch (err) {
                          console.error('Delete error:', err);
                          alert('❌ Failed to delete some addresses');
                        }
                      }}
                      className="px-6 py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-xl hover:shadow-lg active:scale-95 transition-all font-bold flex items-center gap-2 group"
                    >
                      <Trash2 className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      Delete All
                    </button>
                  )}
                </div>

                {/* Address List */}
                {!profileData.addresses || profileData.addresses.length === 0 ? (
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-8 text-center border-2 border-dashed border-gray-300">
                    <MapPin className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-600 font-medium">No addresses saved yet</p>
                    <p className="text-sm text-gray-500 mt-1">Add your first address to make checkout faster</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profileData.addresses.map((addr, idx) => (
                      <div
                        key={addr.id}
                        className="border-2 border-gray-200 rounded-xl p-5 bg-gradient-to-br from-white to-gray-50 hover:from-blue-50 hover:to-indigo-50 hover:border-blue-300 transition-all duration-300 group shadow-sm hover:shadow-md"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-bold text-lg text-gray-900">
                                {addr.label || (addr.IsDefault ? 'Home' : `Address ${idx + 1}`)}
                              </p>
                              {addr.IsDefault && (
                                <span className="text-xs font-bold bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-1 rounded-full">
                                  ⭐ Default
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={async () => {
                              if (!window.confirm('❌ Delete this address?')) return;
                              try {
                                await addressAPI.remove(addr.id);
                                await fetchAddresses();
                                alert('✅ Address deleted');
                              } catch (err) {
                                console.error('Delete error:', err);
                                alert('❌ Failed to delete address');
                              }
                            }}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed mb-3 group-hover:text-gray-900 transition-colors">
                          {[
                            addr.AddressLine1,
                            addr.AddressLine2,
                            addr.City,
                            addr.State,
                            addr.PostalCode,
                            addr.Country
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="lg:col-span-1">
            {/* ACCOUNT STATS */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden mb-6">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-6 py-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Account Stats</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                  <div>
                    <p className="text-sm text-gray-600">Total Orders</p>
                    <p className="text-2xl font-bold text-blue-600">{orders.length}</p>
                  </div>
                  <Package className="w-8 h-8 text-blue-400 opacity-30" />
                </div>

                <div className="flex items-center justify-between p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                  <div>
                    <p className="text-sm text-gray-600">Addresses Saved</p>
                    <p className="text-2xl font-bold text-green-600">{profileData.addresses?.length || 0}</p>
                  </div>
                  <MapPin className="w-8 h-8 text-green-400 opacity-30" />
                </div>

                <div className="flex items-center justify-between p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border border-orange-200">
                  <div>
                    <p className="text-sm text-gray-600">Cart Items</p>
                    <p className="text-2xl font-bold text-orange-600">{cart.length}</p>
                  </div>
                  <ShoppingCart className="w-8 h-8 text-orange-400 opacity-30" />
                </div>
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-6 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-6 space-y-3">
                <button
                  onClick={() => setCurrentPage('products')}
                  className="w-full px-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:shadow-lg active:scale-95 transition-all font-bold flex items-center justify-center gap-2 group"
                >
                  <ShoppingBag className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  Continue Shopping
                </button>

                <button
                  onClick={() => setCurrentPage('orders')}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:shadow-lg active:scale-95 transition-all font-bold flex items-center justify-center gap-2 group"
                >
                  <Package className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  View All Orders
                </button>

                <button
                  onClick={() => setCurrentPage('cart')}
                  className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg active:scale-95 transition-all font-bold flex items-center justify-center gap-2 group"
                >
                  <ShoppingCart className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  View My Cart
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RECENT ORDERS SECTION */}
        {orders.length > 0 && (
          <div className="mt-8 bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-8 py-6 border-b border-gray-200">
              <h3 className="text-xl font-bold text-gray-900 flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                Recent Orders
              </h3>
            </div>

            <div className="overflow-x-auto">
              <div className="p-8 space-y-3">
                {orders.slice(0, 5).map((order, idx) => (
                  <div
                    key={order.id}
                    className="border-2 border-gray-200 rounded-xl p-5 flex justify-between items-center hover:border-blue-300 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-300 group"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center text-sm font-bold text-blue-700">
                          #{order.id % 100}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">Order #{order.id}</p>
                          <p className="text-sm text-gray-500">
                            {order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="text-right mr-4">
                      <p className="font-bold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        ₹{(order.totalAmount || 0).toLocaleString()}
                      </p>
                      <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full mt-1 ${
                        order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        order.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                        order.status === 'Shipped' ? 'bg-purple-100 text-purple-800' :
                        order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {order.status === 'Pending' && '⏳ '}
                        {order.status === 'Processing' && '⚙️ '}
                        {order.status === 'Shipped' && '🚚 '}
                        {order.status === 'Delivered' && '✅ '}
                        {order.status || 'Processing'}
                      </span>
                    </div>

                    <button
                      onClick={() => setCurrentPage('orders')}
                      className="px-4 py-2 bg-white border-2 border-gray-200 text-gray-700 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all font-semibold group-hover:scale-105"
                    >
                      View →
                    </button>
                  </div>
                ))}
              </div>

              {orders.length > 5 && (
                <div className="px-8 py-4 border-t border-gray-200 text-center">
                  <button
                    onClick={() => setCurrentPage('orders')}
                    className="text-blue-600 hover:text-blue-700 font-bold text-sm"
                  >
                    View All {orders.length} Orders →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;