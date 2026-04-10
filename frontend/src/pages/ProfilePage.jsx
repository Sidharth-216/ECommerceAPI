import React, { useState, useEffect } from 'react';
import {
  ShoppingBag, ShoppingCart, LogOut, User, MapPin, Package,
  Clock, Plus, Trash2, ChevronRight, X, Home, Briefcase, Star
} from 'lucide-react';
import { authAPI, addressAPI } from '../api';

/* ─────────────────────────────────────────────
   Address Modal Component
───────────────────────────────────────────── */
const AddressModal = ({ onClose, onSave }) => {
  const [form, setForm] = useState({
    addressLine1: '', addressLine2: '', city: '',
    state: '', postalCode: '', country: 'India',
    label: 'Home', isDefault: false
  });
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);

  const labels = [
    { value: 'Home', icon: <Home className="w-4 h-4" />, color: 'from-teal-500 to-cyan-500' },
    { value: 'Work', icon: <Briefcase className="w-4 h-4" />, color: 'from-violet-500 to-purple-500' },
    { value: 'Other', icon: <MapPin className="w-4 h-4" />, color: 'from-orange-400 to-amber-500' },
  ];

  const fields = [
    [
      { key: 'addressLine1', label: 'Street Address', placeholder: '123 MG Road', type: 'text', required: true },
      { key: 'addressLine2', label: 'Apartment / Suite (optional)', placeholder: 'Flat 4B, Tower 2', type: 'text' },
    ],
    [
      { key: 'city', label: 'City', placeholder: 'Mumbai', type: 'text', required: true },
      { key: 'state', label: 'State', placeholder: 'Maharashtra', type: 'text' },
      { key: 'postalCode', label: 'Postal Code', placeholder: '400001', type: 'text' },
      { key: 'country', label: 'Country', placeholder: 'India', type: 'text' },
    ],
  ];

  const canNext = step === 0
    ? form.addressLine1.trim() !== ''
    : form.city.trim() !== '';

  const handleSubmit = async () => {
    if (!canNext) return;
    setSaving(true);
    try {
      const raw = sessionStorage.getItem('user') || localStorage.getItem('user');
      const userData = JSON.parse(raw || '{}');
      const userId = userData.id || userData.userId || userData.Id;
      if (!userId) { alert('❌ User ID not found. Please re-login.'); return; }

      const payload = {
        userId,
        addressLine1: form.addressLine1,
        addressLine2: form.addressLine2,
        city: form.city,
        state: form.state,
        postalCode: form.postalCode,
        country: form.country || 'India',
        label: form.label,
        isDefault: form.isDefault,
      };

      await addressAPI.add(payload);
      if (typeof addressAPI.syncLocalAddresses === 'function') await addressAPI.syncLocalAddresses();
      onSave();
    } catch (err) {
      alert(err?.response?.data?.message || err.message || 'Failed to add address');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(8px)', background: 'rgba(15,23,42,0.55)' }}>
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
        style={{ animation: 'modalIn 0.35s cubic-bezier(.22,1,.36,1)' }}
      >
        {/* Modal header */}
        <div className="relative bg-gradient-to-br from-teal-500 via-cyan-500 to-teal-400 px-8 py-7 text-white overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
          <button onClick={onClose} className="absolute top-5 right-5 w-9 h-9 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-all">
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 mb-1 relative">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Add New Address</h2>
              <p className="text-teal-100 text-xs">Step {step + 1} of 2 — {step === 0 ? 'Street details' : 'City & region'}</p>
            </div>
          </div>
          {/* step bar */}
          <div className="flex gap-1 mt-4 relative">
            {[0, 1].map(i => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= step ? 'bg-white' : 'bg-white/30'}`} />
            ))}
          </div>
        </div>

        {/* Label selector */}
        {step === 0 && (
          <div className="px-8 pt-6">
            <p className="text-xs font-bold text-slate-900 uppercase tracking-widest mb-3">Address Type</p>
            <div className="flex gap-3">
              {labels.map(l => (
                <button
                  key={l.value}
                  onClick={() => setForm(f => ({ ...f, label: l.value }))}
                  className={`flex-1 flex flex-col items-center gap-1.5 py-3 rounded-2xl border-2 transition-all font-semibold text-sm ${
                    form.label === l.value
                      ? `bg-gradient-to-br ${l.color} text-white border-transparent shadow-lg scale-105`
                      : 'border-slate-200 text-slate-900 hover:border-teal-300'
                  }`}
                >
                  {l.icon}
                  {l.value}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Fields */}
        <div className="px-8 py-6 space-y-4">
          {fields[step].map(f => (
            <div key={f.key}>
              <label className="block text-xs font-bold text-slate-900 uppercase tracking-widest mb-1.5">{f.label}</label>
              <input
                type={f.type}
                placeholder={f.placeholder}
                value={form[f.key]}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-400 focus:bg-white transition-all text-sm"
              />
            </div>
          ))}

          {step === 1 && (
            <label className="flex items-center gap-3 cursor-pointer group mt-1">
              <div
                onClick={() => setForm(f => ({ ...f, isDefault: !f.isDefault }))}
                className={`w-12 h-6 rounded-full relative transition-all duration-300 ${form.isDefault ? 'bg-gradient-to-r from-teal-500 to-cyan-500' : 'bg-slate-200'}`}
              >
                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${form.isDefault ? 'left-6' : 'left-0.5'}`} />
              </div>
              <span className="text-sm font-semibold text-slate-900">Set as default address</span>
            </label>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 pb-7 flex gap-3">
          {step > 0 && (
            <button onClick={() => setStep(0)} className="flex-1 py-3.5 border-2 border-slate-200 text-slate-900 rounded-2xl font-bold hover:border-teal-300 transition-all">
              ← Back
            </button>
          )}
          {step === 0 ? (
            <button
              onClick={() => canNext && setStep(1)}
              disabled={!canNext}
              className="flex-1 py-3.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-2xl font-bold shadow-lg hover:shadow-teal-200 hover:shadow-xl transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving || !canNext}
              className="flex-1 py-3.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-2xl font-bold shadow-lg hover:shadow-teal-200 hover:shadow-xl transition-all disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {saving ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</> : '✓ Save Address'}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity:0; transform:translateY(24px) scale(.97); }
          to   { opacity:1; transform:translateY(0)    scale(1);   }
        }
      `}</style>
    </div>
  );
};

/* ─────────────────────────────────────────────
   Main ProfilePage Component
───────────────────────────────────────────── */
const ProfilePage = ({
  user, cart, orders, profileData, setProfileData,
  setCurrentPage, handleLogout, setError, loadOrders, loading, setLoading
}) => {
  const [editMode, setEditMode] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => { if (!user) return; fetchAddresses(); fetchProfile(); }, [user]);
  useEffect(() => { if (!user) return; fetchOrders(); }, [user]);

  const fetchProfile = async () => {
    try {
      setLoadingProfile(true);
      const res = await authAPI.getProfile();
      const data = res.data;
      // Backend UserProfileDto uses PascalCase (FullName) — handle both casings
      const resolvedName =
        data.FullName || data.fullName ||
        user?.FullName || user?.fullName || user?.name || '';
      const resolvedEmail  = data.Email  || data.email  || user?.Email  || user?.email  || '';
      const resolvedMobile = data.Mobile || data.mobile || user?.Mobile || user?.mobile || '+91 00000 00000';
      const resolvedGender = data.Gender || data.gender || user?.Gender || user?.gender || '';
      setProfileData({
        fullName: resolvedName,
        email:    resolvedEmail,
        mobile:   resolvedMobile,
        gender:   resolvedGender,
        addresses: data.addresses || []
      });
    } catch (err) {
      if (user) setProfileData({
        fullName: user.FullName || user.fullName || user.name || '',
        email:    user.Email    || user.email    || '',
        mobile:   user.Mobile   || user.mobile   || '+91 00000 00000',
        gender:   user.Gender   || user.gender   || '',
        addresses: []
      });
    } finally { setLoadingProfile(false); }
  };

  const fetchAddresses = async () => {
    try {
      let res;
      let currentUserId = null;
      try {
        const profileRes = await authAPI.getProfile();
        currentUserId = profileRes.data?.id || profileRes.data?.userId || profileRes.data?.Id;
      } catch { currentUserId = user?.id || user?.userId; }

      if (typeof addressAPI?.getAll === 'function') res = await addressAPI.getAll();
      else {
        const profileRes = await authAPI.getProfile();
        res = { data: profileRes.data?.addresses || profileRes.data?.addressList || [] };
      }

      const rawAddresses = Array.isArray(res.data) ? res.data : (res.data?.addresses || res.data?.addressList || []);
      const userAddresses = currentUserId
        ? rawAddresses.filter(a => { const uid = a.userId||a.UserId||a.user_id||a.UserID; return uid===currentUserId||uid===String(currentUserId); })
        : rawAddresses;

      const normalized = userAddresses.map((a, index) => {
        const addrLine1=a.AddressLine1||a.addressLine1||a.line1||'';
        const addrLine2=a.AddressLine2||a.addressLine2||a.line2||'';
        const city=a.City||a.city||''; const state=a.State||a.state||'';
        const postal=a.PostalCode||a.postalCode||a.pincode||'';
        const country=a.Country||a.country||'';
        return {
          id: a.Id||a.id||`addr_${Date.now()}_${index}`,
          label: a.Label||a.label||(a.IsDefault?'Home':'Address'),
          AddressLine1:addrLine1, AddressLine2:addrLine2,
          City:city, State:state, PostalCode:postal, Country:country,
          IsDefault:!!(a.IsDefault||a.isDefault),
          address:[addrLine1,addrLine2,city,state,postal,country].filter(Boolean).join(', ').trim(),
          userId: a.userId||a.UserId||a.user_id||currentUserId
        };
      });
      setProfileData(prev => ({ ...prev, addresses: normalized }));
    } catch { setProfileData(prev => ({ ...prev, addresses: [] })); }
  };

  const handleSaveProfile = async () => {
    try {
      setLoading(true); setError('');
      const payload = { fullName: profileData.fullName, mobile: profileData.mobile, gender: profileData.gender };
      if (typeof authAPI.updateProfile === 'function') await authAPI.updateProfile(payload);
      const raw = sessionStorage.getItem('user') || localStorage.getItem('user');
      const userData = JSON.parse(raw || '{}');
      const updatedUser = { ...userData, ...payload };
      if (sessionStorage.getItem('user')) sessionStorage.setItem('user', JSON.stringify(updatedUser));
      if (localStorage.getItem('user')) localStorage.setItem('user', JSON.stringify(updatedUser));
      setEditMode(false);
      alert('✅ Profile updated successfully!');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update profile.');
    } finally { setLoading(false); }
  };

  const fetchOrders = async () => { try { await loadOrders(); } catch {} };

  const displayName = profileData.fullName || user?.FullName || user?.fullName || user?.name || 'User';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'addresses', label: 'Addresses', icon: MapPin },
    { id: 'orders', label: 'Orders', icon: Package },
  ];

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg,#f0fdfa 0%,#ecfeff 40%,#f0fdf4 100%)' }}>
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-white/80 border-b border-teal-100" style={{ backdropFilter: 'blur(16px)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex justify-between items-center gap-3">
          {/* Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setCurrentPage('products')}>
            <div className="w-9 h-9 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-md shadow-teal-200">
              <ShoppingBag className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-black text-xl text-slate-900 tracking-tight">Shop</span>
              <span className="font-black text-xl bg-gradient-to-r from-teal-500 to-cyan-500 bg-clip-text text-transparent">AI</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {[['products','🛍️ Shop'],['orders','📦 Orders']].map(([page, label]) => (
              <button key={page} onClick={() => setCurrentPage(page)}
                className="px-4 py-2 text-sm font-semibold text-slate-900 hover:text-teal-600 hover:bg-teal-50 rounded-xl transition-all">
                {label}
              </button>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button onClick={() => setCurrentPage('cart')} className="relative p-2.5 hover:bg-teal-50 rounded-xl transition-all">
              <ShoppingCart className="w-5 h-5 text-slate-900" />
              {cart.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-gradient-to-br from-teal-500 to-cyan-500 text-white text-[10px] font-black rounded-full w-4.5 h-4.5 flex items-center justify-center min-w-[18px] min-h-[18px]">
                  {cart.length}
                </span>
              )}
            </button>
            <button onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white rounded-xl font-bold text-sm shadow-md shadow-teal-200 transition-all">
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* ── HERO ROW ── */}
        <div className="relative bg-gradient-to-br from-teal-500 via-cyan-500 to-teal-400 rounded-3xl p-5 sm:p-8 mb-8 overflow-hidden text-white shadow-2xl shadow-teal-200">
          {/* Decorative blobs */}
          <div className="absolute -top-12 -right-12 w-56 h-56 bg-white/10 rounded-full" />
          <div className="absolute top-8 -right-4 w-32 h-32 bg-white/10 rounded-full" />
          <div className="absolute -bottom-8 right-32 w-40 h-40 bg-white/10 rounded-full" />

          <div className="relative flex flex-col sm:flex-row items-start sm:items-center gap-6">
            {/* Avatar */}
            <div className="w-20 h-20 bg-gradient-to-br from-teal-600 via-cyan-700 to-teal-800 rounded-2xl flex items-center justify-center text-3xl font-black shadow-inner border-4 border-teal-700/90 ring-4 ring-white/70 flex-shrink-0 text-white">
              {initials}
            </div>

            {/* Info */}
            <div className="flex-1">
              <p className="text-slate-900 text-sm font-semibold mb-1">Welcome back 👋</p>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-1 text-slate-900">{displayName}</h1>
              <p className="text-slate-900 text-sm">{profileData.email || user?.email}</p>
            </div>

                {/* Stats chips */}
                <div className="flex flex-wrap gap-3 sm:flex-col sm:items-end">
                  {[
                    { label: 'Orders', value: orders.length, icon: Package, color: 'bg-blue-100 border-blue-300 text-blue-700' },
                    { label: 'Addresses', value: profileData.addresses?.length || 0, icon: MapPin, color: 'bg-green-100 border-green-300 text-green-700' },
                    { label: 'Cart', value: cart.length, icon: ShoppingCart, color: 'bg-purple-100 border-purple-300 text-purple-700' },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div
                      key={label}
                      className={`flex items-center gap-2 rounded-2xl px-4 py-2 backdrop-blur-sm border ${color}`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-black text-lg leading-none">{value}</span>
                      <span className="text-xs font-medium">{label}</span>
                    </div>
                  ))}
                </div>
                  </div>
              </div>

            {/* ── TABS ── */}
        <div className="flex gap-1 bg-white rounded-2xl p-1.5 shadow-sm border border-slate-100 mb-8 w-full sm:w-fit overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 whitespace-nowrap ${
                activeTab === id
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md shadow-teal-200'
                  : 'text-slate-900 hover:text-teal-600 hover:bg-teal-50'
              }`}>
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* ── PROFILE TAB ── */}
        {activeTab === 'profile' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex flex-wrap gap-3 items-center justify-between px-4 sm:px-8 py-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-black text-slate-900">Personal Information</h2>
                <p className="text-slate-900 text-sm mt-0.5">Manage your personal details</p>
              </div>
              <button
                onClick={editMode ? handleSaveProfile : () => setEditMode(true)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md ${
                  editMode
                    ? 'bg-gradient-to-r from-emerald-500 to-green-500 text-white shadow-green-200 hover:shadow-lg'
                    : 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-teal-200 hover:shadow-lg'
                }`}>
                {editMode ? '✓ Save Changes' : '✏️ Edit Profile'}
              </button>
            </div>

            <div className="p-4 sm:p-8">
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { key: 'fullName', label: 'Full Name', type: 'text', editable: true },
                  { key: 'email', label: 'Email Address', type: 'email', editable: false, note: '✓ Cannot be changed' },
                  { key: 'mobile', label: 'Mobile Number', type: 'tel', editable: true },
                ].map(({ key, label, type, editable, note }) => (
                  <div key={key}>
                    <label className="block text-[11px] font-black text-slate-900 uppercase tracking-widest mb-2">{label}</label>
                    <input
                      type={type}
                      value={(profileData[key]||'').toString()}
                      onChange={e => setProfileData({...profileData,[key]:e.target.value})}
                      disabled={!editMode || !editable}
                      className={`w-full px-4 py-3.5 rounded-xl text-sm font-medium transition-all focus:outline-none ${
                        editMode && editable
                          ? 'bg-white border-2 border-teal-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-50 text-slate-900'
                          : 'bg-slate-50 border-2 border-slate-100 text-slate-900 cursor-not-allowed'
                      }`}
                    />
                    {note && <p className="text-[11px] text-slate-900 mt-1 font-medium">{note}</p>}
                  </div>
                ))}

                {/* Gender */}
                <div>
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Gender</label>
                  <select
                    value={profileData.gender || ''}
                    onChange={e => setProfileData({...profileData, gender: e.target.value})}
                    disabled={!editMode}
                    className={`w-full px-4 py-3.5 rounded-xl text-sm font-medium transition-all focus:outline-none ${
                      editMode
                        ? 'bg-white border-2 border-teal-300 focus:border-teal-500 focus:ring-4 focus:ring-teal-50 text-slate-900'
                        : 'bg-slate-50 border-2 border-slate-100 text-slate-900 cursor-not-allowed'
                    }`}>
                    <option value="">Select Gender (Optional)</option>
                    <option value="Male">👨 Male</option>
                    <option value="Female">👩 Female</option>
                    <option value="Other">🧑 Other</option>
                    <option value="PreferNotToSay">🤐 Prefer Not to Say</option>
                  </select>
                </div>
              </div>

              {editMode && (
                <div className="flex flex-col sm:flex-row gap-4 mt-8 pt-6 border-t border-slate-100">
                  <button onClick={handleSaveProfile} disabled={loading}
                    className="flex-1 py-3.5 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-green-200 hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Saving…</> : '✓ Save Changes'}
                  </button>
                  <button onClick={() => { setEditMode(false); fetchProfile(); }}
                    className="flex-1 py-3.5 border-2 border-slate-200 text-slate-900 rounded-2xl font-black text-sm hover:border-slate-300 hover:bg-slate-50 transition-all">
                    ✕ Discard
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ADDRESSES TAB ── */}
        {activeTab === 'addresses' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex flex-wrap gap-3 items-center justify-between px-4 sm:px-8 py-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-black text-slate-900">Saved Addresses</h2>
                <p className="text-slate-900 text-sm mt-0.5">{profileData.addresses?.length || 0} address{profileData.addresses?.length !== 1 ? 'es' : ''} saved</p>
              </div>
              <div className="flex gap-2">
                {profileData.addresses?.length > 0 && (
                  <button
                    onClick={async () => {
                      if (!window.confirm('🗑️ Delete all addresses?')) return;
                      try { for (const a of profileData.addresses) await addressAPI.remove(a.id); await fetchAddresses(); alert('✅ All deleted'); }
                      catch { alert('❌ Failed to delete some addresses'); }
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 border-2 border-red-200 text-red-500 rounded-xl font-bold text-sm hover:bg-red-50 transition-all">
                    <Trash2 className="w-4 h-4" /> Delete All
                  </button>
                )}
                <button onClick={() => setShowAddressModal(true)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold text-sm shadow-md shadow-teal-200 hover:shadow-lg transition-all">
                  <Plus className="w-4 h-4" /> Add Address
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-8">
              {!profileData.addresses || profileData.addresses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-teal-50 to-cyan-100 rounded-3xl flex items-center justify-center mb-5 border-2 border-dashed border-teal-200">
                    <MapPin className="w-9 h-9 text-teal-400" />
                  </div>
                  <p className="font-black text-slate-900 text-lg mb-1">No addresses yet</p>
                  <p className="text-slate-900 text-sm mb-6">Add your first delivery address</p>
                  <button onClick={() => setShowAddressModal(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-2xl font-bold shadow-lg shadow-teal-200 hover:shadow-xl transition-all">
                    <Plus className="w-5 h-5" /> Add Address
                  </button>
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {profileData.addresses.map((addr, idx) => {
                    const labelIcon = addr.label === 'Work' ? <Briefcase className="w-4 h-4" /> : addr.label === 'Other' ? <MapPin className="w-4 h-4" /> : <Home className="w-4 h-4" />;
                    const labelColor = addr.label === 'Work' ? 'from-violet-500 to-purple-500' : addr.label === 'Other' ? 'from-orange-400 to-amber-500' : 'from-teal-500 to-cyan-500';
                    return (
                      <div key={addr.id} className="group relative border-2 border-slate-100 hover:border-teal-200 rounded-2xl p-5 transition-all hover:shadow-md bg-white">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2.5">
                            <div className={`w-8 h-8 bg-gradient-to-br ${labelColor} rounded-xl flex items-center justify-center text-white`}>{labelIcon}</div>
                            <div>
                              <p className="font-black text-slate-800 text-sm">{addr.label || `Address ${idx+1}`}</p>
                              {addr.IsDefault && (
                                <span className="text-[10px] font-bold bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full border border-teal-200 flex items-center gap-1 w-fit mt-0.5">
                                  <Star className="w-2.5 h-2.5 fill-teal-500" /> Default
                                </span>
                              )}
                            </div>
                          </div>
                          <button onClick={async () => {
                            if (!window.confirm('Delete this address?')) return;
                            try { await addressAPI.remove(addr.id); await fetchAddresses(); }
                            catch { alert('❌ Failed to delete'); }
                          }} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm text-slate-900 leading-relaxed">
                          {[addr.AddressLine1,addr.AddressLine2,addr.City,addr.State,addr.PostalCode,addr.Country].filter(Boolean).join(', ')}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── ORDERS TAB ── */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex flex-wrap gap-3 items-center justify-between px-4 sm:px-8 py-6 border-b border-slate-100">
              <div>
                <h2 className="text-xl font-black text-slate-900">Order History</h2>
                <p className="text-slate-900 text-sm mt-0.5">{orders.length} order{orders.length !== 1 ? 's' : ''} placed</p>
              </div>
              <button onClick={() => setCurrentPage('orders')}
                className="flex items-center gap-2 px-4 py-2.5 border-2 border-teal-200 text-teal-600 rounded-xl font-bold text-sm hover:bg-teal-50 transition-all">
                View All <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="divide-y divide-slate-50">
              {orders.length === 0 ? (
                <div className="flex flex-col items-center py-16">
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-50 to-amber-100 rounded-3xl flex items-center justify-center mb-5 border-2 border-dashed border-orange-200">
                    <Package className="w-9 h-9 text-orange-400" />
                  </div>
                  <p className="font-black text-slate-900 text-lg mb-1">No orders yet</p>
                  <p className="text-slate-900 text-sm mb-6">Start shopping to see your orders here</p>
                  <button onClick={() => setCurrentPage('products')}
                    className="px-6 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-2xl font-bold shadow-lg shadow-teal-200">
                    🛍️ Start Shopping
                  </button>
                </div>
              ) : (
                orders.slice(0,5).map(order => {
                  const statusStyles = {
                    Pending:    'bg-amber-50 text-amber-700 border-amber-200',
                    Processing: 'bg-blue-50 text-blue-700 border-blue-200',
                    Shipped:    'bg-violet-50 text-violet-700 border-violet-200',
                    Delivered:  'bg-emerald-50 text-emerald-700 border-emerald-200',
                  };
                  const st = statusStyles[order.status] || 'bg-slate-50 text-slate-600 border-slate-200';
                  return (
                    <div key={order.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-8 py-5 hover:bg-slate-50 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="w-11 h-11 bg-gradient-to-br from-teal-50 to-cyan-100 rounded-2xl flex items-center justify-center text-sm font-black text-teal-700 border border-teal-100">
                          #{order.id % 100}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 text-sm">Order #{order.id}</p>
                          <p className="text-slate-900 text-xs mt-0.5">
                            {order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-IN',{year:'numeric',month:'short',day:'numeric'}) : 'N/A'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                        <p className="font-black text-teal-600">₹{(order.totalAmount||0).toLocaleString()}</p>
                        <span className={`text-[11px] font-bold px-3 py-1 rounded-full border ${st}`}>{order.status||'Processing'}</span>
                        <button onClick={() => setCurrentPage('orders')}
                          className="opacity-0 group-hover:opacity-100 p-2 hover:bg-teal-50 rounded-xl transition-all">
                          <ChevronRight className="w-4 h-4 text-teal-500" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* ADDRESS MODAL */}
      {showAddressModal && (
        <AddressModal
          onClose={() => setShowAddressModal(false)}
          onSave={async () => {
            await fetchAddresses();
            setShowAddressModal(false);
            alert('✅ Address added successfully');
          }}
        />
      )}
    </div>
  );
};

export default ProfilePage;