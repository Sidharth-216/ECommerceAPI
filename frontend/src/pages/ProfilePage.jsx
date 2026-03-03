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

  // FIX #2: Gate both fetches on `user` being available.
  // Add `user` as a dependency so this re-runs once the user is rehydrated from
  // localStorage (the race condition where fetchAddresses fired before user was set).
  useEffect(() => {
    if (!user) return;
    fetchAddresses();
    fetchProfile();
  }, [user]);

  // FIX #2: Same guard for orders — no fetch until user is confirmed.
  useEffect(() => {
    if (!user) return;
    fetchOrders();
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoadingProfile(true);
      const res = await authAPI.getProfile();
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
      } catch (err) {
        console.error('Failed to get user profile for ID extraction:', err);
        // Fall back to the user object already in state
        currentUserId = user?.id || user?.userId;
      }

      if (typeof addressAPI?.getAll === 'function') {
        res = await addressAPI.getAll();
      } else if (typeof authAPI?.getProfile === 'function') {
        const profileRes = await authAPI.getProfile();
        res = { data: profileRes.data?.addresses || profileRes.data?.addressList || [] };
      } else {
        setProfileData(prev => ({ ...prev, addresses: [] }));
        return;
      }

      const rawAddresses = Array.isArray(res.data)
        ? res.data
        : (res.data?.addresses || res.data?.addressList || []);

      // Filter to current user's addresses only (cross-user contamination guard)
      const userAddresses = currentUserId
        ? rawAddresses.filter(a => {
            const addrUserId = a.userId || a.UserId || a.user_id || a.UserID;
            return addrUserId === currentUserId || addrUserId === String(currentUserId);
          })
        : rawAddresses;

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
      }

      // Read from sessionStorage first (tab-scoped), fall back to localStorage
      const raw = sessionStorage.getItem('user') || localStorage.getItem('user');
      const userData = JSON.parse(raw || '{}');
      const updatedUser = {
        ...userData,
        fullName: profileData.fullName,
        mobile: profileData.mobile,
        gender: profileData.gender
      };
      // Write back to whichever storages hold this tab's session
      if (sessionStorage.getItem('user')) sessionStorage.setItem('user', JSON.stringify(updatedUser));
      if (localStorage.getItem('user'))   localStorage.setItem('user', JSON.stringify(updatedUser));

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
    <div className="min-h-screen bg-slate-50">
      {/* HEADER */}
      <header className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">ShopAI</h1>
              <p className="text-xs text-teal-100">.marketplace</p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setCurrentPage('products')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-white hover:bg-white/20 rounded-lg transition-all font-medium"
            >
              🛍️ Shop
            </button>

            <button
              onClick={() => setCurrentPage('orders')}
              className="hidden sm:flex items-center gap-2 px-4 py-2 text-white hover:bg-white/20 rounded-lg transition-all font-medium"
            >
              📦 Orders
            </button>

            <button
              onClick={() => setCurrentPage('cart')}
              className="relative p-3 hover:bg-white/20 rounded-lg transition-all"
            >
              <ShoppingCart className="w-6 h-6 text-white" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-coral-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cart.length}
                </span>
              )}
            </button>

            <button className="p-3 bg-white/20 rounded-lg">
              <User className="w-6 h-6 text-white" />
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 bg-coral-500 hover:bg-coral-600 rounded-lg transition-all font-semibold"
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
              <h2 className="text-4xl font-bold text-slate-900 mb-2">Welcome, {profileData.fullName || user?.fullName || user?.name || 'User'}! 👋</h2>
              <p className="text-slate-600">Manage your profile, addresses, and orders</p>
            </div>
            <button
              onClick={editMode ? handleSaveProfile : () => setEditMode(true)}
              className={`px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-md hover:shadow-lg transform hover:scale-105 flex items-center gap-2 ${
                editMode
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white'
                  : 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white'
              }`}
            >
              {editMode ? '✓ Save Changes' : '✏️ Edit Profile'}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* MAIN CONTENT */}
          <div className="lg:col-span-2 space-y-6">
            {/* PERSONAL INFO CARD */}
            <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-teal-50 to-cyan-50 px-8 py-5 border-b border-slate-200">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                  <div className="w-10 h-10 bg-teal-500 rounded-lg flex items-center justify-center">
                    <User className="w-6 h-6 text-white" />
                  </div>
                  Personal Information
                </h3>
              </div>
              <div className="p-8">
                <div className="grid md:grid-cols-2 gap-6">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">FULL NAME</label>
                    <input
                      value={profileData.fullName || ''}
                      onChange={e =>
                        setProfileData({ ...profileData, fullName: e.target.value })
                      }
                      disabled={!editMode}
                      className={`w-full px-4 py-3 border-2 rounded-lg transition-all focus:outline-none ${
                        editMode
                          ? 'border-teal-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 bg-white'
                          : 'border-slate-200 bg-slate-50 cursor-not-allowed'
                      }`}
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">EMAIL ADDRESS</label>
                    <input
                      value={profileData.email || ''}
                      disabled
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg bg-slate-50 cursor-not-allowed text-slate-600"
                    />
                    <p className="text-xs text-slate-500 mt-1">✓ Email cannot be changed</p>
                  </div>

                  {/* Mobile */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">MOBILE NUMBER</label>
                    <input
                      type="tel"
                      value={(profileData.mobile || '').toString()}
                      onChange={e =>
                        setProfileData({ ...profileData, mobile: e.target.value })
                      }
                      disabled={!editMode}
                      className={`w-full px-4 py-3 border-2 rounded-lg transition-all focus:outline-none ${
                        editMode
                          ? 'border-teal-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 bg-white'
                          : 'border-slate-200 bg-slate-50 cursor-not-allowed'
                      }`}
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">GENDER</label>
                    <select
                      value={profileData.gender || ''}
                      onChange={e =>
                        setProfileData({ ...profileData, gender: e.target.value })
                      }
                      disabled={!editMode}
                      className={`w-full px-4 py-3 border-2 rounded-lg transition-all focus:outline-none ${
                        editMode
                          ? 'border-teal-300 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 bg-white'
                          : 'border-slate-200 bg-slate-50 cursor-not-allowed'
                      }`}
                    >
                      <option value="">Select Gender (Optional)</option>
                      <option value="Male">👨 Male</option>
                      <option value="Female">👩 Female</option>
                      <option value="Other">🧑 Other</option>
                      <option value="PreferNotToSay">🤐 Prefer Not to Say</option>
                    </select>
                  </div>
                </div>

                {/* Save Changes Button */}
                {editMode && (
                  <div className="mt-8 flex gap-4 pt-6 border-t border-slate-200">
                    <button
                      onClick={handleSaveProfile}
                      disabled={loading}
                      className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-lg font-bold transition-all transform hover:scale-105 disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
                    >
                      {loading ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Saving...
                        </>
                      ) : (
                        <>✓ Save Changes</>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setEditMode(false);
                        fetchProfile();
                      }}
                      className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 hover:border-coral-300 hover:bg-coral-50 rounded-lg font-bold transition-all"
                    >
                      ✕ Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* ADDRESSES CARD */}
            <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 px-8 py-5 border-b border-slate-200">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
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

                        // Read from sessionStorage first (tab-scoped), fall back to localStorage
                        const raw = sessionStorage.getItem('user') || localStorage.getItem('user');
                        const userData = JSON.parse(raw || '{}');
                        const userId = userData.id || userData.userId || userData.Id;

                        if (!userId) {
                          alert('❌ User ID not found. Please re-login.');
                          return;
                        }

                        const payload = {
                          userId: userId,
                          addressLine1: line1,
                          addressLine2: window.prompt('📍 Address Line 2 (optional)') || '',
                          city: window.prompt('🏙️ City') || '',
                          state: window.prompt('📌 State (optional)') || '',
                          postalCode: window.prompt('📮 Postal Code (optional)') || '',
                          country: window.prompt('🌍 Country', 'India') || 'India',
                          isDefault: window.confirm('⭐ Set as default address?')
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
                    className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-all font-bold flex items-center gap-2"
                  >
                    <Plus className="w-5 h-5" />
                    Add Address
                  </button>

                  {/* Delete All Button */}
                  {profileData.addresses && profileData.addresses.length > 0 && (
                    <button
                      onClick={async () => {
                        if (!window.confirm('🗑️ Delete all addresses? Cannot be undone!')) return;

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
                      className="px-6 py-3 bg-gradient-to-r from-coral-500 to-orange-600 text-white rounded-lg hover:shadow-lg transition-all font-bold flex items-center gap-2"
                    >
                      <Trash2 className="w-5 h-5" />
                      Delete All
                    </button>
                  )}
                </div>

                {/* Address List */}
                {!profileData.addresses || profileData.addresses.length === 0 ? (
                  <div className="bg-slate-50 rounded-lg p-8 text-center border-2 border-dashed border-slate-300">
                    <MapPin className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-600 font-medium">No addresses saved</p>
                    <p className="text-sm text-slate-500 mt-1">Add your first address</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {profileData.addresses.map((addr, idx) => (
                      <div
                        key={addr.id}
                        className="border-2 border-slate-200 rounded-lg p-5 bg-white hover:border-teal-300 hover:shadow-md transition-all"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-bold text-lg text-slate-900">
                                {addr.label || (addr.IsDefault ? 'Home' : `Address ${idx + 1}`)}
                              </p>
                              {addr.IsDefault && (
                                <span className="text-xs font-bold bg-teal-100 text-teal-700 px-3 py-1 rounded-full">
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
                            className="text-coral-500 hover:text-coral-700 hover:bg-coral-50 p-2 rounded-lg transition-all"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed">
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
            <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden mb-6">
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 px-6 py-5 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900">Account Stats</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between p-4 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg border border-teal-200">
                  <div>
                    <p className="text-sm text-slate-600">Total Orders</p>
                    <p className="text-2xl font-bold text-teal-600">{orders.length}</p>
                  </div>
                  <Package className="w-8 h-8 text-teal-400 opacity-30" />
                </div>

                <div className="flex items-center justify-between p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <div>
                    <p className="text-sm text-slate-600">Addresses</p>
                    <p className="text-2xl font-bold text-purple-600">{profileData.addresses?.length || 0}</p>
                  </div>
                  <MapPin className="w-8 h-8 text-purple-400 opacity-30" />
                </div>

                <div className="flex items-center justify-between p-4 bg-gradient-to-br from-coral-50 to-orange-50 rounded-lg border border-coral-200">
                  <div>
                    <p className="text-sm text-slate-600">Cart Items</p>
                    <p className="text-2xl font-bold text-coral-600">{cart.length}</p>
                  </div>
                  <ShoppingCart className="w-8 h-8 text-coral-400 opacity-30" />
                </div>
              </div>
            </div>

            {/* QUICK ACTIONS */}
            <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5 border-b border-slate-200">
                <h3 className="text-lg font-bold text-slate-900">Quick Actions</h3>
              </div>
              <div className="p-6 space-y-3">
                <button
                  onClick={() => setCurrentPage('products')}
                  className="w-full px-4 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all font-bold flex items-center justify-center gap-2"
                >
                  <ShoppingBag className="w-5 h-5" />
                  Continue Shopping
                </button>

                <button
                  onClick={() => setCurrentPage('orders')}
                  className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all font-bold flex items-center justify-center gap-2"
                >
                  <Package className="w-5 h-5" />
                  View Orders
                </button>

                <button
                  onClick={() => setCurrentPage('cart')}
                  className="w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-lg hover:shadow-lg transition-all font-bold flex items-center justify-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  View Cart
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* RECENT ORDERS SECTION */}
        {orders.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 px-8 py-5 border-b border-slate-200">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-white" />
                </div>
                Recent Orders
              </h3>
            </div>

            <div className="p-8 space-y-3">
              {orders.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="border-2 border-slate-200 rounded-lg p-5 flex justify-between items-center hover:border-teal-300 hover:shadow-md transition-all"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-lg flex items-center justify-center text-sm font-bold text-teal-700">
                        #{order.id % 100}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">Order #{order.id}</p>
                        <p className="text-sm text-slate-500">
                          {order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }) : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-right mr-4">
                    <p className="font-bold text-lg text-teal-600">
                      ₹{(order.totalAmount || 0).toLocaleString()}
                    </p>
                    <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full mt-1 ${
                      order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                      order.status === 'Processing' ? 'bg-blue-100 text-blue-800' :
                      order.status === 'Shipped' ? 'bg-purple-100 text-purple-800' :
                      order.status === 'Delivered' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {order.status || 'Processing'}
                    </span>
                  </div>

                  <button
                    onClick={() => setCurrentPage('orders')}
                    className="px-4 py-2 bg-white border-2 border-slate-200 text-slate-700 rounded-lg hover:border-teal-400 hover:bg-teal-50 transition-all font-semibold"
                  >
                    View →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;