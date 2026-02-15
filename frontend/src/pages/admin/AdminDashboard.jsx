import React, { useState } from 'react';
import { ShoppingBag, LogOut, Package, BarChart3, Users, ShoppingCart, TrendingUp, FileText } from 'lucide-react';
import OverviewTab from './OverviewTab';
import CustomersTab from './CustomersTab';
import ProductsTab from './ProductsTab';
import OrdersTab from './OrdersTab';
import StockAnalysisTab from './StockAnalysisTab';
import SalesReportTab from './SalesReportTab';

const AdminDashboard = (props) => {
  const { user, handleLogout, setCurrentPage } = props;
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'stock-analysis', label: 'Stock Analysis', icon: TrendingUp },
    { id: 'sales-report', label: 'Sales Report', icon: FileText }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
        <header className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-2xl sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
          <div className="bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">ShopAI Admin Console</h1>
            <p className="text-sm text-blue-100">Manage products, customers, orders & analytics</p>
          </div>
            </div>

            <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <p className="text-sm font-semibold">{user?.fullName || user?.name || 'Admin User'}</p>
            <p className="text-xs text-blue-100">{user?.role || 'Administrator'}</p>
          </div>

          <button
            onClick={() => setCurrentPage('products')}
            className="hidden sm:flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2.5 rounded-xl text-sm font-semibold transition-all border border-white/20"
          >
            <Package className="w-4 h-4" />
            View Store
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-white text-red-600 hover:bg-red-50 px-4 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg hover:shadow-xl"
          >
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
            </div>
          </div>
        </header>

        {/* Tabs Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-[88px] z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-4 px-5 text-sm font-semibold transition-all whitespace-nowrap border-b-2 ${
                    activeTab === tab.id
                      ? 'border-indigo-600 text-indigo-600 bg-indigo-50'
                      : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'overview' && <OverviewTab {...props} />}
        {activeTab === 'customers' && <CustomersTab {...props} />}
        {activeTab === 'orders' && <OrdersTab {...props} />}
        {activeTab === 'products' && <ProductsTab {...props} />}
        {activeTab === 'stock-analysis' && <StockAnalysisTab {...props} />}
        {activeTab === 'sales-report' && <SalesReportTab {...props} />}
      </main>
    </div>
  );
};

export default AdminDashboard;