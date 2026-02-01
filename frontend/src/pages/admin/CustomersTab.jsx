import React, { useState, useEffect } from 'react';
import { Mail, Phone, Eye, EyeOff, Search, X, Trash2, MapPin, Plus, Minus } from 'lucide-react';
import { authAPI, adminAPI } from './api';

const CustomersTab = ({ 
    adminCustomers = [], 
    setAdminCustomers, 
    setError, 
    loading, 
    setLoading 
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredCustomers, setFilteredCustomers] = useState(adminCustomers);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editFormData, setEditFormData] = useState({});
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        role: 'All',
        status: 'All',
        sortBy: 'name'
    });

    // Update filtered customers when search or filters change
    useEffect(() => {
        let result = adminCustomers || [];

        // Apply search filter
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(customer => {
                const profile = customer.profile || customer;
                const name = (profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`).toLowerCase();
                const email = (profile.email || '').toLowerCase();
                const mobile = String(profile.mobile || profile.phone || '').toLowerCase();
                return name.includes(q) || email.includes(q) || mobile.includes(q);
            });
        }

        // Apply role filter
        if (filters.role !== 'All') {
            result = result.filter(c => {
                const isAdmin = c.role === 1 || c.role === 'Admin';
                return filters.role === 'Admin' ? isAdmin : !isAdmin;
            });
        }

        // Apply status filter
        if (filters.status !== 'All') {
            result = result.filter(c => {
                const isActive = c.isActive !== false;
                return filters.status === 'Active' ? isActive : !isActive;
            });
        }

        // Apply sorting
        result.sort((a, b) => {
            const profileA = a.profile || a;
            const profileB = b.profile || b;
            
            switch (filters.sortBy) {
                case 'name':
                    const nameA = profileA.fullName || `${profileA.firstName || ''} ${profileA.lastName || ''}`;
                    const nameB = profileB.fullName || `${profileB.firstName || ''} ${profileB.lastName || ''}`;
                    return nameA.localeCompare(nameB);
                case 'email':
                    return (profileA.email || '').localeCompare(profileB.email || '');
                case 'recent':
                    return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
                default:
                    return 0;
            }
        });

        setFilteredCustomers(result);
    }, [searchQuery, filters, adminCustomers]);

    // Handle customer deletion
    const handleDeleteCustomer = async (customerId) => {
        if (!window.confirm('Are you sure you want to delete this customer?')) return;

        try {
            setLoading(true);
            setError('');

            if (typeof adminAPI.deleteUser === 'function') {
                await adminAPI.deleteUser(customerId);
            } else {
                // Fallback: remove from local state
                setAdminCustomers(prev => (prev || []).filter(c => c.id !== customerId));
            }

            alert('✅ Customer deleted successfully');
            setSelectedCustomer(null);
        } catch (err) {
            console.error('Delete error:', err);
            setError(err.response?.data?.message || 'Failed to delete customer');
        } finally {
            setLoading(false);
        }
    };

    // Handle customer status toggle
    const handleToggleStatus = async (customer) => {
        try {
            setLoading(true);
            setError('');

            const newStatus = !customer.isActive;

            if (typeof adminAPI.toggleUser === 'function') {
                await adminAPI.toggleUser(customer.id || customer._id, { isActive: newStatus });
            }

            setAdminCustomers(prev =>
                (prev || []).map(c =>
                    c.id === customer.id || c._id === customer._id
                        ? { ...c, isActive: newStatus }
                        : c
                )
            );

            setSelectedCustomer(prev => prev ? { ...prev, isActive: newStatus } : null);
            alert(`✅ Customer ${newStatus ? 'activated' : 'deactivated'}`);
        } catch (err) {
            console.error('Toggle error:', err);
            setError(err.response?.data?.message || 'Failed to update customer status');
        } finally {
            setLoading(false);
        }
    };

    // Handle customer update
    const handleSaveCustomer = async () => {
        try {
            setLoading(true);
            setError('');

            if (typeof adminAPI.updateUser === 'function') {
                await adminAPI.updateUser(editingId, editFormData);
            } else {
                setAdminCustomers(prev =>
                    (prev || []).map(c =>
                        c.id === editingId
                            ? { ...c, profile: { ...c.profile, ...editFormData }, ...editFormData }
                            : c
                    )
                );
            }

            setEditingId(null);
            setEditFormData({});
            alert('✅ Customer updated successfully');
        } catch (err) {
            console.error('Update error:', err);
            setError(err.response?.data?.message || 'Failed to update customer');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-2xl font-bold text-gray-900">👥 Customers</h3>
                    <p className="text-sm text-gray-600 mt-1">
                        Total: <span className="font-semibold text-blue-600">{adminCustomers?.length || 0}</span>
                    </p>
                </div>

                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-all"
                >
                    🔍 {showFilters ? 'Hide' : 'Show'} Filters
                </button>
            </div>

            {/* SEARCH & FILTER */}
            <div className="bg-white rounded-xl shadow p-6 border border-gray-100 space-y-4">
                {/* Search Bar */}
                <div>
                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Search Customers</label>
                    <div className="relative">
                        <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or phone..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Filters */}
                {showFilters && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Role</label>
                            <select
                                value={filters.role}
                                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm"
                            >
                                <option value="All">All Roles</option>
                                <option value="Admin">Admin</option>
                                <option value="Customer">Customer</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Status</label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm"
                            >
                                <option value="All">All Status</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-semibold text-gray-700 mb-2 block">Sort By</label>
                            <select
                                value={filters.sortBy}
                                onChange={(e) => setFilters({ ...filters, sortBy: e.target.value })}
                                className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-sm"
                            >
                                <option value="name">Name</option>
                                <option value="email">Email</option>
                                <option value="recent">Recently Joined</option>
                            </select>
                        </div>
                    </div>
                )}
            </div>

            {/* CUSTOMERS LIST or DETAIL VIEW */}
            {selectedCustomer ? (
                // DETAIL VIEW
                <div className="bg-white rounded-xl shadow p-6 border border-gray-100">
                    <button
                        onClick={() => setSelectedCustomer(null)}
                        className="mb-4 text-blue-600 hover:text-blue-700 font-semibold text-sm flex items-center gap-1"
                    >
                        ← Back to List
                    </button>

                    {editingId === selectedCustomer.id ? (
                        // EDIT MODE
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-900">✏️ Edit Customer</h3>

                            <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Full Name</label>
                                    <input
                                        type="text"
                                        value={editFormData.fullName || ''}
                                        onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Email</label>
                                    <input
                                        type="email"
                                        value={editFormData.email || ''}
                                        disabled
                                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg bg-gray-50 cursor-not-allowed"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Mobile</label>
                                    <input
                                        type="tel"
                                        value={editFormData.mobile || ''}
                                        onChange={(e) => setEditFormData({ ...editFormData, mobile: e.target.value })}
                                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="text-sm font-semibold text-gray-700 mb-2 block">Role</label>
                                    <select
                                        value={editFormData.role || 'Customer'}
                                        onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
                                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-blue-500"
                                    >
                                        <option value="Customer">Customer</option>
                                        <option value="Admin">Admin</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    onClick={handleSaveCustomer}
                                    disabled={loading}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold"
                                >
                                    {loading ? 'Saving...' : '✅ Save Changes'}
                                </button>
                                <button
                                    onClick={() => setEditingId(null)}
                                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-semibold"
                                >
                                    ❌ Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        // VIEW MODE
                        <div className="space-y-6">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">
                                        {selectedCustomer.profile?.fullName || `${selectedCustomer.profile?.firstName || ''} ${selectedCustomer.profile?.lastName || ''}` || 'N/A'}
                                    </h3>
                                    <p className="text-sm text-gray-500 mt-1">
                                        Joined: {selectedCustomer.createdAt ? new Date(selectedCustomer.createdAt).toLocaleDateString() : 'N/A'}
                                    </p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setEditingId(selectedCustomer.id);
                                            setEditFormData(selectedCustomer.profile || selectedCustomer);
                                        }}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
                                    >
                                        ✏️ Edit
                                    </button>
                                    <button
                                        onClick={() => handleToggleStatus(selectedCustomer)}
                                        disabled={loading}
                                        className={`px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 ${
                                            selectedCustomer.isActive === false
                                                ? 'bg-green-600 hover:bg-green-700'
                                                : 'bg-orange-600 hover:bg-orange-700'
                                        }`}
                                    >
                                        {selectedCustomer.isActive === false ? '✅ Activate' : '⏸️ Deactivate'}
                                    </button>
                                    <button
                                        onClick={() => handleDeleteCustomer(selectedCustomer.id)}
                                        disabled={loading}
                                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm disabled:opacity-50"
                                    >
                                        🗑️ Delete
                                    </button>
                                </div>
                            </div>

                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Contact Information</p>
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <Mail className="w-5 h-5 text-blue-600" />
                                            <div>
                                                <p className="text-xs text-gray-500">Email</p>
                                                <p className="text-sm font-medium text-gray-900">{selectedCustomer.profile?.email || 'N/A'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Phone className="w-5 h-5 text-blue-600" />
                                            <div>
                                                <p className="text-xs text-gray-500">Phone</p>
                                                <p className="text-sm font-medium text-gray-900">{selectedCustomer.profile?.mobile || selectedCustomer.profile?.phone || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-lg p-4">
                                    <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Account Status</p>
                                    <div className="space-y-3">
                                        <div>
                                            <p className="text-xs text-gray-500">Role</p>
                                            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mt-1">
                                                {selectedCustomer.role === 1 || selectedCustomer.role === 'Admin' ? '🔑 Admin' : '👤 Customer'}
                                            </span>
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500">Status</p>
                                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold mt-1 ${
                                                selectedCustomer.isActive === false
                                                    ? 'bg-red-100 text-red-700'
                                                    : 'bg-green-100 text-green-700'
                                            }`}>
                                                {selectedCustomer.isActive === false ? '❌ Inactive' : '✅ Active'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                // LIST VIEW
                <div className="bg-white rounded-xl shadow border border-gray-100 overflow-hidden">
                    {filteredCustomers.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-gray-600 font-semibold">No customers found</p>
                            <p className="text-sm text-gray-500 mt-1">Try adjusting your search or filters</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                                    <tr>
                                        <th className="py-4 px-6 text-left font-semibold text-gray-700">Customer Name</th>
                                        <th className="py-4 px-6 text-left font-semibold text-gray-700">Email</th>
                                        <th className="py-4 px-6 text-left font-semibold text-gray-700">Phone</th>
                                        <th className="py-4 px-6 text-center font-semibold text-gray-700">Role</th>
                                        <th className="py-4 px-6 text-center font-semibold text-gray-700">Status</th>
                                        <th className="py-4 px-6 text-center font-semibold text-gray-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {filteredCustomers.map((customer, idx) => {
                                        const profile = customer.profile || customer;
                                        const name = profile.fullName || `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'N/A';
                                        const email = profile.email || 'N/A';
                                        const phone = profile.mobile || profile.phone || '—';
                                        const isAdmin = customer.role === 1 || customer.role === 'Admin';
                                        const isActive = customer.isActive !== false;

                                        return (
                                            <tr key={customer.id || idx} className="hover:bg-blue-50 transition-colors">
                                                <td className="py-4 px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                                            {name.charAt(0) || 'U'}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-gray-900">{name}</p>
                                                            <p className="text-xs text-gray-500">{customer.createdAt ? `Joined ${new Date(customer.createdAt).toLocaleDateString()}` : '—'}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="py-4 px-6 text-gray-700">{email}</td>
                                                <td className="py-4 px-6 text-gray-700">{phone}</td>
                                                <td className="py-4 px-6 text-center">
                                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                                        isAdmin ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'
                                                    }`}>
                                                        {isAdmin ? '🔑 Admin' : '👤 Customer'}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                                                        isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                                    }`}>
                                                        {isActive ? '✅ Active' : '❌ Inactive'}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-6 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => setSelectedCustomer(customer)}
                                                            className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 text-xs font-semibold transition-all"
                                                        >
                                                            👁️ View
                                                        </button>
                                                        <button
                                                            onClick={() => handleToggleStatus(customer)}
                                                            disabled={loading}
                                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 ${
                                                                isActive
                                                                    ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                                                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                                                            }`}
                                                        >
                                                            {isActive ? '⏸️' : '▶️'}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* PAGINATION INFO */}
                    <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 text-sm text-gray-600 flex justify-between items-center">
                        <span>Showing {filteredCustomers.length} of {adminCustomers?.length || 0} customers</span>
                        <span className="text-xs text-gray-500">{filteredCustomers.length === 0 ? 'No results' : 'All results displayed'}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomersTab;