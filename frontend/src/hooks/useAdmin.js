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
  const [stockAnalysis, setStockAnalysis] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [stockByCategory, setStockByCategory] = useState([]);
  const [salesReport, setSalesReport] = useState(null);

  /**
   * Fetch overview data for admin dashboard
   */
  const fetchAdminData = async () => {
    try {
      console.log('🚀 [useAdmin] Fetching admin data from MongoDB...');

      const [customersRes, ordersRes, productsRes] = await Promise.all([
        adminAPI.getUsers(),
        adminAPI.getOrders(),
        adminAPI.getProducts()
      ]);

      console.log('📦 Raw API Responses received');

      // Extract data arrays
      const customers = Array.isArray(customersRes) 
        ? customersRes 
        : (customersRes?.data || []);
      
      const orders = Array.isArray(ordersRes) 
        ? ordersRes 
        : (ordersRes?.data || []);
      
      const products = Array.isArray(productsRes) 
        ? productsRes 
        : (productsRes?.data?.items || productsRes?.data || []);

      console.log('📊 Extracted Data:', {
        customersCount: customers.length,
        ordersCount: orders.length,
        productsCount: products.length
      });

      // Filter customers (exclude admins)
      const actualCustomers = customers.filter(c => 
        c.role === 'Customer' || c.Role === 'Customer'
      );

      // Update state
      setAdminCustomers(actualCustomers);
      setAdminOrders(orders);

      // Calculate stats
      const completedOrders = orders.filter(o => 
        o.status !== 'Cancelled' && o.Status !== 'Cancelled'
      );

      const totalRevenue = completedOrders.reduce((sum, order) => {
        const amount = order.totalAmount || order.TotalAmount || 0;
        return sum + amount;
      }, 0);

      const stats = {
        totalRevenue,
        totalOrders: orders.length,
        totalCustomers: actualCustomers.length,
        totalProducts: products.length
      };

      console.log('✅ Calculated Stats:', stats);
      setAdminStats(stats);

      return { customers: actualCustomers, orders, products };
    } catch (err) {
      console.error('❌ Failed to fetch admin data:', err);
      throw err;
    }
  };

  /**
   * Fetch stock analysis data
   */
  const fetchStockAnalysis = async () => {
    try {
      console.log('📈 [useAdmin] Fetching stock analysis...');

      // Try dedicated endpoint if available
      if (typeof adminAPI.getStockAnalysis === 'function') {
        const analysisRes = await adminAPI.getStockAnalysis();
        const analysis = analysisRes?.data || analysisRes || {};
        
        console.log('✅ Stock Analysis received');
        
        setStockAnalysis(analysis.items || []);
        setLowStockProducts(analysis.lowStock || []);
        setStockByCategory(analysis.byCategory || []);
        
        return analysis;
      }

      // Fallback: fetch products and calculate locally
      console.log('⚠️ Using fallback stock calculation');
      const productsRes = await adminAPI.getProducts();
      const products = Array.isArray(productsRes)
        ? productsRes
        : (productsRes?.data?.items || productsRes?.data || []);

      const lowStock = products.filter(p => {
        const stock = p.stockQuantity || p.StockQuantity || 0;
        return stock > 0 && stock < 10;
      });

      const analysis = products.map(p => ({
        productName: p.name || p.productName,
        category: p.category || p.categoryName,
        brand: p.brand,
        quantity: p.stockQuantity || p.StockQuantity || 0,
        price: p.price || 0,
        minimumStock: 10,
        id: p._id || p.id,
        productId: p._id || p.id
      }));

      // Group by category
      const categoryMap = {};
      products.forEach(p => {
        const cat = p.category || p.categoryName || 'Uncategorized';
        if (!categoryMap[cat]) {
          categoryMap[cat] = {
            category: cat,
            items: [],
            totalQuantity: 0,
            totalValue: 0
          };
        }
        categoryMap[cat].items.push(p);
        categoryMap[cat].totalQuantity += (p.stockQuantity || 0);
        categoryMap[cat].totalValue += (p.price || 0) * (p.stockQuantity || 0);
      });

      const byCategory = Object.values(categoryMap);

      setStockAnalysis(analysis);
      setLowStockProducts(lowStock);
      setStockByCategory(byCategory);

      return { analysis, lowStock, byCategory };
    } catch (err) {
      console.error('❌ Failed to fetch stock analysis:', err);
      throw err;
    }
  };

  /**
   * Fetch sales report for date range
   */
  const fetchSalesReport = async (startDate, endDate) => {
    try {
      console.log('📊 [useAdmin] Fetching sales report...');

      if (typeof adminAPI.getSalesReport === 'function') {
        const reportRes = await adminAPI.getSalesReport(startDate, endDate);
        const report = reportRes?.data || reportRes || {};
        
        console.log('✅ Sales Report received');
        
        const transformed = {
          totalRevenue: report.totalSales || report.TotalSales || report.totalRevenue || 0,
          totalOrders: report.totalOrders || report.TotalOrders || 0,
          averageOrderValue: report.averageOrderValue || report.AverageOrderValue || 0,
          dailySales: report.dailySales || report.dailySalesList || report.DailySalesList || [],
          topProducts: report.topProducts || report.TopProducts || []
        };
        
        setSalesReport(transformed);
        return transformed;
      }

      // Fallback: calculate from orders
      console.log('⚠️ Using fallback sales calculation');
      const ordersRes = await adminAPI.getOrders();
      const allOrders = Array.isArray(ordersRes) ? ordersRes : (ordersRes?.data || []);

      // Filter by date range
      const filteredOrders = allOrders.filter(order => {
        const orderDate = new Date(order.createdAt || order.CreatedAt);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return orderDate >= start && orderDate <= end && 
               order.status !== 'Cancelled' && order.Status !== 'Cancelled';
      });

      const totalRevenue = filteredOrders.reduce((sum, o) => 
        sum + (o.totalAmount || o.TotalAmount || 0), 0
      );

      const report = {
        totalRevenue,
        totalOrders: filteredOrders.length,
        averageOrderValue: filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0,
        dailySales: [],
        topProducts: []
      };

      setSalesReport(report);
      return report;
    } catch (err) {
      console.error('❌ Failed to fetch sales report:', err);
      throw err;
    }
  };

  /**
   * Update order status
   */
  const updateOrderStatus = async (orderId, statusData) => {
    try {
      console.log('✏️ [useAdmin] Updating order status:', { orderId, statusData });
      
      await adminAPI.updateOrderStatus(orderId, statusData);
      
      // Update local state
      setAdminOrders(prev => prev.map(o => 
        (o.id === orderId || o.Id === orderId || o._id === orderId)
          ? { ...o, status: statusData.status || statusData, Status: statusData.status || statusData }
          : o
      ));
      
      console.log('✅ Order status updated successfully');
    } catch (err) {
      console.error('❌ Failed to update order status:', err);
      throw err;
    }
  };

  /**
   * Add a new product
   */
  const addProduct = async (productData) => {
    try {
      console.log('➕ [useAdmin] Adding product');
      
      const response = await adminAPI.addProduct(productData);
      console.log('✅ Product added successfully');
      
      return response?.data || response;
    } catch (err) {
      console.error('❌ Failed to add product:', err);
      throw err;
    }
  };

  /**
   * Update existing product
   */
  const updateProduct = async (productId, productData) => {
    try {
      console.log('✏️ [useAdmin] Updating product:', productId);
      
      const response = await adminAPI.updateProduct(productId, productData);
      console.log('✅ Product updated successfully');
      
      return response?.data || response;
    } catch (err) {
      console.error('❌ Failed to update product:', err);
      throw err;
    }
  };

  /**
   * Delete a product
   */
  const deleteProduct = async (productId) => {
    try {
      console.log('🗑️ [useAdmin] Deleting product:', productId);
      
      await adminAPI.deleteProduct(productId);
      console.log('✅ Product deleted successfully');
    } catch (err) {
      console.error('❌ Failed to delete product:', err);
      throw err;
    }
  };

  return {
    // State
    adminStats,
    adminCustomers,
    adminOrders,
    stockAnalysis,
    lowStockProducts,
    stockByCategory,
    salesReport,
    
    // Methods
    fetchAdminData,
    fetchStockAnalysis,
    fetchSalesReport,
    updateOrderStatus,
    addProduct,
    updateProduct,
    deleteProduct,
    
    // Setters
    setAdminStats,
    setAdminCustomers,
    setAdminOrders,
    setStockAnalysis,
    setLowStockProducts,
    setStockByCategory,
    setSalesReport
  };
};

export default useAdmin;