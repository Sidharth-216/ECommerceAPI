import { useState } from 'react';
import { adminAPI } from '../api';

export const useAdmin = () => {
  const [adminStats, setAdminStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0
  });
  const [adminCustomers, setAdminCustomers] = useState([]);
  const [adminOrders, setAdminOrders] = useState([]);
  const [stockAnalysis, setStockAnalysis] = useState({
    lowStock: [],
    outOfStock: [],
    totalValue: 0
  });
  const [salesReport, setSalesReport] = useState(null);

  /**
   * Fetch overview data for admin dashboard
   */
  const fetchAdminData = async () => {
    try {
      const [customersRes, ordersRes, productsRes] = await Promise.all([
        adminAPI.getUsers().catch(() => ({ data: [] })),
        adminAPI.getOrders().catch(() => ({ data: [] })),
        adminAPI.getProducts().catch(() => ({ data: [] }))
      ]);

      const customers = customersRes?.data || [];
      const orders = ordersRes?.data || [];
      const products = productsRes?.data || [];

      setAdminCustomers(customers);
      setAdminOrders(orders);

      // Calculate stats
      const totalRevenue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
      const totalOrders = orders.length;
      const totalCustomers = customers.filter(c => c.role === 'Customer').length;
      const totalProducts = products.length;

      setAdminStats({
        totalRevenue,
        totalOrders,
        totalCustomers,
        totalProducts
      });

      return { customers, orders, products };
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
      throw err;
    }
  };

  /**
   * Fetch stock analysis data
   */
  const fetchStockAnalysis = async () => {
    try {
      // Try to get from dedicated endpoint first
      if (typeof adminAPI.getStockAnalysis === 'function') {
        const analysisRes = await adminAPI.getStockAnalysis();
        setStockAnalysis(analysisRes?.data || {});
        return analysisRes?.data;
      }

      // Fallback: calculate from products
      const productsRes = await adminAPI.getProducts();
      const products = productsRes?.data || [];

      const lowStock = products.filter(p => (p.stockQuantity || 0) > 0 && (p.stockQuantity || 0) < 10);
      const outOfStock = products.filter(p => (p.stockQuantity || 0) === 0);
      const totalValue = products.reduce((sum, p) => sum + ((p.price || 0) * (p.stockQuantity || 0)), 0);

      const analysis = { lowStock, outOfStock, totalValue };
      setStockAnalysis(analysis);
      return analysis;
    } catch (err) {
      console.error('Failed to fetch stock analysis:', err);
      throw err;
    }
  };

  /**
   * Fetch sales report for date range
   */
  const fetchSalesReport = async (startDate, endDate) => {
    try {
      if (typeof adminAPI.getSalesReport === 'function') {
        const reportRes = await adminAPI.getSalesReport(startDate, endDate);
        setSalesReport(reportRes?.data);
        return reportRes?.data;
      }

      // Fallback: calculate from orders
      const ordersRes = await adminAPI.getOrders();
      const allOrders = ordersRes?.data || [];

      // Filter orders by date range
      const filteredOrders = allOrders.filter(order => {
        if (!order.orderDate) return false;
        const orderDate = new Date(order.orderDate);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return orderDate >= start && orderDate <= end;
      });

      const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const totalOrders = filteredOrders.length;
      const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

      // Calculate top products
      const productSales = {};
      filteredOrders.forEach(order => {
        (order.items || []).forEach(item => {
          const productId = item.productId || item.id;
          if (!productSales[productId]) {
            productSales[productId] = {
              name: item.productName || item.name || 'Unknown',
              brand: item.brand || '',
              unitsSold: 0,
              revenue: 0
            };
          }
          productSales[productId].unitsSold += item.quantity || 0;
          productSales[productId].revenue += (item.price || 0) * (item.quantity || 0);
        });
      });

      const topProducts = Object.values(productSales)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)
        .map(p => ({
          ...p,
          averagePrice: p.unitsSold > 0 ? p.revenue / p.unitsSold : 0
        }));

      // Calculate daily sales
      const dailySalesMap = {};
      filteredOrders.forEach(order => {
        const date = new Date(order.orderDate).toISOString().split('T')[0];
        if (!dailySalesMap[date]) {
          dailySalesMap[date] = { date, revenue: 0, orders: 0 };
        }
        dailySalesMap[date].revenue += order.totalAmount || 0;
        dailySalesMap[date].orders += 1;
      });

      const dailySales = Object.values(dailySalesMap).sort((a, b) => 
        new Date(a.date) - new Date(b.date)
      );

      const report = {
        totalRevenue,
        totalOrders,
        averageOrderValue,
        topProducts,
        dailySales
      };

      setSalesReport(report);
      return report;
    } catch (err) {
      console.error('Failed to fetch sales report:', err);
      throw err;
    }
  };

  /**
   * Delete a user/customer
   */
  const deleteUser = async (userId) => {
    try {
      await adminAPI.deleteUser(userId);
      // Update local state
      setAdminCustomers(prev => prev.filter(c => c.id !== userId && c.userId !== userId));
    } catch (err) {
      console.error('Failed to delete user:', err);
      throw err;
    }
  };

  /**
   * Update order status
   */
  const updateOrderStatus = async (orderId, status) => {
    try {
      await adminAPI.updateOrderStatus(orderId, { status });
      // Update local state
      setAdminOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, status } : o
      ));
    } catch (err) {
      console.error('Failed to update order status:', err);
      throw err;
    }
  };

  /**
   * Add a new product
   */
  const addProduct = async (productData) => {
    try {
      const response = await adminAPI.addProduct(productData);
      return response?.data;
    } catch (err) {
      console.error('Failed to add product:', err);
      throw err;
    }
  };

  /**
   * Update existing product
   */
  const updateProduct = async (productId, productData) => {
    try {
      const response = await adminAPI.updateProduct(productId, productData);
      return response?.data;
    } catch (err) {
      console.error('Failed to update product:', err);
      throw err;
    }
  };

  /**
   * Delete a product
   */
  const deleteProduct = async (productId) => {
    try {
      await adminAPI.deleteProduct(productId);
    } catch (err) {
      console.error('Failed to delete product:', err);
      throw err;
    }
  };

  return {
    // State
    adminStats,
    adminCustomers,
    adminOrders,
    stockAnalysis,
    salesReport,
    
    // Methods
    fetchAdminData,
    fetchStockAnalysis,
    fetchSalesReport,
    deleteUser,
    updateOrderStatus,
    addProduct,
    updateProduct,
    deleteProduct,
    
    // Setters (for direct manipulation if needed)
    setAdminStats,
    setAdminCustomers,
    setAdminOrders,
    setStockAnalysis,
    setSalesReport
  };
};

export default useAdmin;