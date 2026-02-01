import React, { useState, useEffect } from 'react';
import { Users, Search, RefreshCw, Trash2, Mail, Phone, Calendar, AlertCircle, UserX } from 'lucide-react';
import { adminAPI } from '../../api';
import api from '../../api';

const CustomersTab = ({ error, setError, loading, setLoading }) => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [searchQuery, customers]);

  const fetchCustomers = async () => {
    setRefreshing(true);
    setError('');
    
    try {
      let response;
      
      // Try multiple endpoints in order
      try {
        response = await adminAPI.getUsers();
      } catch (err1) {
        console.warn('MongoDB admin/users failed, trying SQL endpoint:', err1.message);
        try {
          response = await api.get('/admin/users');
        } catch (err2) {
          console.warn('SQL admin/users failed, trying user profile endpoint:', err2.message);
          // Last resort - just return empty for now
          response = { data: [] };
        }
      }
      
      const data = response?.data || [];
      
      // Filter only customers (not admins)
      const customersList = data.filter(user => 
        user.role === 'Customer' || user.role === 'customer' || !user.role
      );
      
      setCustomers(customersList);
      setFilteredCustomers(customersList);
    } catch (err) {
      console.error('Customers fetch error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to fetch customers');
      setCustomers([]);
      setFilteredCustomers([]);
    } finally {
      setRefreshing(false);
    }
  };

  const filterCustomers = () => {
    if (!searchQuery.trim()) {
      setFilteredCustomers(customers);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = customers.filter(customer => 
      (customer.fullName?.toLowerCase() || '').includes(query) ||
      (customer.name?.toLowerCase() || '').includes(query) ||
      (customer.email?.toLowerCase() || '').includes(query) ||
      (customer.mobile?.toString() || '').includes(query)
    );
    
    setFilteredCustomers(filtered);
  };

  const deleteCustomer = async (customerId, customerName) => {
    if (!window.confirm(`Are you sure you want to delete ${customerName}? This action cannot be undone.`)) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      await adminAPI.deleteUser(customerId);
      await fetchCustomers();
      alert(`✅ Customer "${customerName}" deleted successfully`);
    } catch (err) {
      console.error('Delete customer error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to delete customer');
    } finally {
      setLoading(false);
    }
  };

  const viewCustomerDetails = (customer) => {
    const details = `
Customer Details
================
ID: ${customer.id || customer.userId || 'N/A'}
Name: ${customer.fullName || customer.name || 'N/A'}
Email: ${customer.email || 'N/A'}
Mobile: ${customer.mobile || 'N/A'}
Gender: ${customer.gender || 'Not specified'}
Role: ${customer.role || 'Customer'}
Joined: ${customer.createdAt ? new Date(customer.createdAt).toLocaleDateString() : 'N/A'}
Status: ${customer.isActive ? 'Active' : 'Inactive'}
    `.trim();
    
    alert(details);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="w-8 h-8 text-blue-600" />
            Customer Management
          </h2>
          <p className="text-gray-600 mt-1">View and manage all registered customers</p>
        </div>

        <button
          onClick={fetchCustomers}
          disabled={refreshing}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-6 py-4 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5" />
          <div>
            <p className="font-semibold">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-md border border-blue-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase">Total Customers</p>
              <p className="text-4xl font-bold text-blue-600 mt-2">{customers.length}</p>
            </div>
            <Users className="w-12 h-12 text-blue-400 opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-md border border-green-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase">Active Customers</p>
              <p className="text-4xl font-bold text-green-600 mt-2">
                {customers.filter(c => c.isActive !== false).length}
              </p>
            </div>
            <Users className="w-12 h-12 text-green-400 opacity-30" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-md border border-purple-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-gray-600 uppercase">Showing Results</p>
              <p className="text-4xl font-bold text-purple-600 mt-2">{filteredCustomers.length}</p>
            </div>
            <Search className="w-12 h-12 text-purple-400 opacity-30" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="flex items-center gap-4 bg-gray-50 rounded-xl px-5 py-3 border-2 border-gray-200 focus-within:border-blue-400 transition-all">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or mobile number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-bold text-gray-900">All Customers</h3>
          <p className="text-sm text-gray-600 mt-1">
            {filteredCustomers.length} {filteredCustomers.length === 1 ? 'customer' : 'customers'} found
          </p>
        </div>

        {filteredCustomers.length === 0 ? (
          <div className="p-12 text-center">
            <UserX className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 font-medium">
              {searchQuery ? 'No customers match your search' : 'No customers registered yet'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {searchQuery ? 'Try a different search term' : 'Customers will appear here once they register'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Gender
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredCustomers.map((customer) => (
                  <tr key={customer.id || customer.userId} className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold">
                          {(customer.fullName || customer.name || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">
                            {customer.fullName || customer.name || 'Unnamed Customer'}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {customer.id || customer.userId || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-900">
                          <Mail className="w-4 h-4 text-gray-400" />
                          {customer.email || 'N/A'}
                        </div>
                        {customer.mobile && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-4 h-4 text-gray-400" />
                            {customer.mobile}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-900">
                        {customer.gender || 'Not specified'}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        {customer.createdAt 
                          ? new Date(customer.createdAt).toLocaleDateString('en-IN', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                          : 'N/A'}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${
                        customer.isActive !== false
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {customer.isActive !== false ? '✓ Active' : '✕ Inactive'}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => viewCustomerDetails(customer)}
                          className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all text-sm font-semibold"
                        >
                          View
                        </button>
                        <button
                          onClick={() => deleteCustomer(
                            customer.id || customer.userId,
                            customer.fullName || customer.name || 'Customer'
                          )}
                          disabled={loading}
                          className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-blue-900">Customer Management Tips</p>
            <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
              <li>Use the search bar to quickly find specific customers</li>
              <li>Click "View" to see detailed customer information</li>
              <li>Deleting a customer will remove all their data permanently</li>
              <li>Active customers can login and place orders</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomersTab;