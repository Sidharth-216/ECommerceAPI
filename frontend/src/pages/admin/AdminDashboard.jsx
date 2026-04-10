import React, { useState, useEffect } from 'react';
import { ShoppingBag, LogOut, Package, BarChart3, Users, ShoppingCart, TrendingUp, FileText, Menu, X, Bell, Search, QrCode } from 'lucide-react';
import OverviewTab from './OverviewTab';
import CustomersTab from './CustomersTab';
import ProductsTab from './ProductsTab';
import OrdersTab from './OrdersTab';
import StockAnalysisTab from './StockAnalysisTab';
import SalesReportTab from './SalesReportTab';
import AdminQRPaymentsTab from './Adminqrpaymentstab';

const AdminDashboard = (props) => {
  const { user, handleLogout, setCurrentPage } = props;
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth < 1024 : false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const tabs = [
    { id: 'overview',       label: 'Overview',       icon: BarChart3,  color: 'teal' },
    { id: 'customers',      label: 'Customers',      icon: Users,      color: 'purple' },
    { id: 'orders',         label: 'Orders',         icon: ShoppingCart, color: 'coral' },
    { id: 'products',       label: 'Products',       icon: Package,    color: 'emerald' },
    { id: 'stock-analysis', label: 'Stock Analysis', icon: TrendingUp, color: 'amber' },
    { id: 'sales-report',   label: 'Sales Report',   icon: FileText,   color: 'blue' },
    { id: 'qr-payments',    label: 'QR Payments',    icon: QrCode,     color: 'violet' },
  ];

  const getTabColorClasses = (tab, isActive) => {
    if (tab.id === 'qr-payments') {
      return isActive
        ? 'bg-violet-600 text-white'
        : 'text-slate-700 hover:bg-violet-50 hover:text-violet-700';
    }
    return isActive
      ? 'bg-teal-500 text-white'
      : 'text-slate-700 hover:bg-teal-50';
  };

  const getSubtitle = () => {
    switch (activeTab) {
      case 'overview':       return 'Your business metrics at a glance';
      case 'customers':      return 'Manage and view customer information';
      case 'orders':         return 'Track and manage all orders';
      case 'products':       return 'Manage your product inventory';
      case 'stock-analysis': return 'Monitor stock levels and trends';
      case 'sales-report':   return 'Analyze sales performance';
      case 'qr-payments':    return 'Verify and confirm QR / UPI payments';
      default:               return '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {isMobile && mobileNavOpen && (
        <div className="fixed inset-0 bg-black/45 z-30" onClick={() => setMobileNavOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`${isMobile ? 'w-72' : (sidebarOpen ? 'w-64' : 'w-20')} ${isMobile ? (mobileNavOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'} bg-white border-r border-slate-200 transition-all duration-300 flex flex-col fixed h-full z-40`}>
        {/* Logo Section */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          {sidebarOpen ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-slate-900">ShopAI</h1>
                <p className="text-xs text-slate-500">Admin Console</p>
              </div>
            </div>
          ) : (
            <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg flex items-center justify-center mx-auto">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (isMobile) setMobileNavOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${getTabColorClasses(tab, isActive)} ${!sidebarOpen && 'justify-center'}`}
                title={!sidebarOpen ? tab.label : ''}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && (
                  <span className="text-sm flex items-center gap-2">
                    {tab.label}
                    {/* Badge on QR Payments to draw attention */}
                    {tab.id === 'qr-payments' && (
                      <span className="ml-auto text-[10px] font-black uppercase px-1.5 py-0.5 bg-violet-100 text-violet-700 rounded-md">
                        New
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={() => {
              handleLogout();
              setCurrentPage('login');
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium text-slate-700 hover:bg-red-50 text-red-600 hover:text-red-700"
            title={!sidebarOpen ? 'Logout' : ''}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {sidebarOpen && <span className="text-sm">Logout</span>}
          </button>
        </div>

        {/* Sidebar Toggle */}
        <div className="p-4 border-t border-slate-200">
          <button
            onClick={() => {
              if (isMobile) {
                setMobileNavOpen(false);
              } else {
                setSidebarOpen(!sidebarOpen);
              }
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-slate-600 hover:bg-slate-100 rounded-lg transition-all"
          >
            {isMobile ? <X className="w-5 h-5" /> : sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            {(sidebarOpen || isMobile) && <span className="text-sm font-medium">{isMobile ? 'Close' : 'Collapse'}</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className={`flex-1 ${isMobile ? 'ml-0' : (sidebarOpen ? 'ml-64' : 'ml-20')} transition-all duration-300`}>
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="px-4 md:px-8 py-4 flex items-center justify-between gap-4">
            {/* Page Title */}
            <div className="min-w-0">
              {isMobile && (
                <button
                  onClick={() => setMobileNavOpen(true)}
                  className="mb-2 p-2 rounded-lg border border-slate-200 text-slate-700"
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
              <h2 className="text-2xl font-bold text-slate-900">
                {tabs.find(t => t.id === activeTab)?.label || 'Dashboard'}
              </h2>
              <p className="text-sm text-slate-500 mt-1">{getSubtitle()}</p>
            </div>

            {/* Right Side Actions */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Search */}
              <div className="hidden md:flex items-center gap-2 bg-slate-100 rounded-lg px-4 py-2 w-80">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search anything..."
                  className="bg-transparent outline-none text-sm w-full text-slate-900 placeholder-slate-400"
                />
              </div>

              {/* Notifications */}
              <button className="relative p-2 hover:bg-slate-100 rounded-lg transition-all">
                <Bell className="w-5 h-5 text-slate-600" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  7
                </span>
              </button>

              {/* User Profile */}
              <div className="flex items-center gap-3 pl-2 md:pl-4 border-l border-slate-200">
                <div className="text-right hidden lg:block">
                  <p className="text-sm font-semibold text-slate-900">{user?.fullName || user?.name || 'Admin'}</p>
                  <p className="text-xs text-slate-500">{user?.role || 'Administrator'}</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center text-white font-bold">
                  {(user?.fullName || user?.name || 'A')[0].toUpperCase()}
                </div>
              </div>

              {/* View Store */}
              <button
                onClick={() => setCurrentPage('products')}
                className="hidden lg:flex items-center gap-2 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-all"
              >
                <Package className="w-4 h-4" />
                View Store
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-3 md:px-4 py-2 rounded-lg text-sm font-bold transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </header>

        {/* Tab Content */}
        <main className="p-4 md:p-8">
          {activeTab === 'overview'       && <OverviewTab        {...props} />}
          {activeTab === 'customers'      && <CustomersTab       {...props} />}
          {activeTab === 'orders'         && <OrdersTab          {...props} />}
          {activeTab === 'products'       && <ProductsTab        {...props} />}
          {activeTab === 'stock-analysis' && <StockAnalysisTab   {...props} />}
          {activeTab === 'sales-report'   && <SalesReportTab     {...props} />}
          {activeTab === 'qr-payments'    && <AdminQRPaymentsTab {...props} />}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;