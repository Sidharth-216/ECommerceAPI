import { useState } from 'react';
import { mongoAdminAPI } from '../api';

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
   * Fetch overview data for admin dashboard from MongoDB
   */
  const fetchAdminData = async () => {
    try {
      console.log('🚀 [useAdmin] Fetching admin data from MongoDB...');

      const [customersRes, ordersRes, productsRes] = await Promise.all([
        mongoAdminAPI.getUsers().catch((err) => {
          console.error('❌ Failed to fetch users:', err);
          return { data: [] };
        }),
        mongoAdminAPI.getOrders().catch((err) => {
          console.error('❌ Failed to fetch orders:', err);
          return { data: [] };
        }),
        mongoAdminAPI.getProducts?.().catch((err) => {
          console.error('❌ Failed to fetch products:', err);
          return { data: [] };
        }) || { data: [] }
      ]);

      console.log('📦 Raw API Responses:', {
        customers: customersRes,
        orders: ordersRes,
        products: productsRes
      });

      // Extract data arrays - handle both direct arrays and nested data property
      const customers = Array.isArray(customersRes) 
        ? customersRes 
        : (customersRes?.data || []);
      
      const orders = Array.isArray(ordersRes) 
        ? ordersRes 
        : (ordersRes?.data || []);
      
      const products = Array.isArray(productsRes) 
        ? productsRes 
        : (productsRes?.data || []);

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

      // Calculate stats from MongoDB data
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
   * Fetch stock analysis data from MongoDB
   */
  const fetchStockAnalysis = async () => {
    try {
      console.log('📈 [useAdmin] Fetching stock analysis from MongoDB...');

      // Try dedicated endpoint
      if (typeof mongoAdminAPI.getStockAnalysis === 'function') {
        const analysisRes = await mongoAdminAPI.getStockAnalysis();
        const analysis = analysisRes?.data || analysisRes || {};
        
        console.log('✅ Stock Analysis:', analysis);
        
        // Transform to expected format
        const transformed = {
          lowStock: analysis.lowStockItems || analysis.LowStockItems || [],
          outOfStock: analysis.lowStockItems?.filter(p => p.currentStock === 0 || p.CurrentStock === 0) || [],
          totalValue: analysis.totalStockValue || analysis.TotalStockValue || 0,
          totalProducts: analysis.totalProducts || analysis.TotalProducts || 0,
          lowStockCount: analysis.lowStockProducts || analysis.LowStockProducts || 0,
          outOfStockCount: analysis.outOfStockProducts || analysis.OutOfStockProducts || 0
        };
        
        setStockAnalysis(transformed);
        return transformed;
      }

      // Fallback: fetch products and calculate locally
      console.log('⚠️ Using fallback stock calculation');
      const productsRes = await mongoAdminAPI.getProducts?.() || { data: [] };
      const products = Array.isArray(productsRes) ? productsRes : (productsRes?.data || []);

      const lowStock = products.filter(p => {
        const stock = p.stockQuantity || p.StockQuantity || 0;
        return stock > 0 && stock < 10;
      });

      const outOfStock = products.filter(p => {
        const stock = p.stockQuantity || p.StockQuantity || 0;
        return stock === 0;
      });

      const totalValue = products.reduce((sum, p) => {
        const price = p.price || p.Price || 0;
        const stock = p.stockQuantity || p.StockQuantity || 0;
        return sum + (price * stock);
      }, 0);

      const analysis = {
        lowStock,
        outOfStock,
        totalValue,
        totalProducts: products.length,
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length
      };

      setStockAnalysis(analysis);
      return analysis;
    } catch (err) {
      console.error('❌ Failed to fetch stock analysis:', err);
      throw err;
    }
  };

  /**
   * Fetch sales report for date range from MongoDB
   */
  const fetchSalesReport = async (startDate, endDate) => {
    try {
      console.log('📊 [useAdmin] Fetching sales report from MongoDB...');

      if (typeof mongoAdminAPI.getSalesReport === 'function') {
        const reportRes = await mongoAdminAPI.getSalesReport(startDate, endDate);
        const report = reportRes?.data || reportRes || {};
        
        console.log('✅ Sales Report:', report);
        
        // Transform to expected format
        const transformed = {
          totalRevenue: report.totalSales || report.TotalSales || 0,
          totalOrders: report.totalOrders || report.TotalOrders || 0,
          averageOrderValue: report.averageOrderValue || report.AverageOrderValue || 0,
          dailySales: report.dailySalesList || report.DailySalesList || [],
          topProducts: report.topProducts || report.TopProducts || []
        };
        
        setSalesReport(transformed);
        return transformed;
      }

      // Fallback: calculate from orders
      console.log('⚠️ Using fallback sales calculation');
      const ordersRes = await mongoAdminAPI.getOrders();
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
   * Delete a user/customer (MongoDB)
   */
  const deleteUser = async (userId) => {
    try {
      console.log('🗑️ [useAdmin] Deleting user:', userId);
      
      if (typeof mongoAdminAPI.deleteUser === 'function') {
        await mongoAdminAPI.deleteUser(userId);
      } else {
        console.warn('⚠️ Delete user API not implemented');
        throw new Error('Delete user not implemented');
      }
      
      // Update local state
      setAdminCustomers(prev => prev.filter(c => 
        c.id !== userId && c.Id !== userId && c._id !== userId
      ));
      
      console.log('✅ User deleted successfully');
    } catch (err) {
      console.error('❌ Failed to delete user:', err);
      throw err;
    }
  };

  /**
   * Update order status (MongoDB)
   */
  const updateOrderStatus = async (orderId, status) => {
    try {
      console.log('✏️ [useAdmin] Updating order status:', { orderId, status });
      
      if (typeof mongoAdminAPI.updateOrderStatus === 'function') {
        await mongoAdminAPI.updateOrderStatus(orderId, { status });
      } else {
        console.warn('⚠️ Update order status API not implemented');
        throw new Error('Update order status not implemented');
      }
      
      // Update local state
      setAdminOrders(prev => prev.map(o => 
        (o.id === orderId || o.Id === orderId || o._id === orderId)
          ? { ...o, status, Status: status }
          : o
      ));
      
      console.log('✅ Order status updated successfully');
    } catch (err) {
      console.error('❌ Failed to update order status:', err);
      throw err;
    }
  };

  /**
   * Add a new product (MongoDB)
   */
  const addProduct = async (productData) => {
    try {
      console.log('➕ [useAdmin] Adding product:', productData);
      
      if (typeof mongoAdminAPI.addProduct === 'function') {
        const response = await mongoAdminAPI.addProduct(productData);
        console.log('✅ Product added successfully');
        return response?.data || response;
      }
      
      console.warn('⚠️ Add product API not implemented');
      throw new Error('Add product not implemented');
    } catch (err) {
      console.error('❌ Failed to add product:', err);
      throw err;
    }
  };

  /**
   * Update existing product (MongoDB)
   */
  const updateProduct = async (productId, productData) => {
    try {
      console.log('✏️ [useAdmin] Updating product:', { productId, productData });
      
      if (typeof mongoAdminAPI.updateProduct === 'function') {
        const response = await mongoAdminAPI.updateProduct(productId, productData);
        console.log('✅ Product updated successfully');
        return response?.data || response;
      }
      
      console.warn('⚠️ Update product API not implemented');
      throw new Error('Update product not implemented');
    } catch (err) {
      console.error('❌ Failed to update product:', err);
      throw err;
    }
  };

  /**
   * Delete a product (MongoDB)
   */
  const deleteProduct = async (productId) => {
    try {
      console.log('🗑️ [useAdmin] Deleting product:', productId);
      
      if (typeof mongoAdminAPI.deleteProduct === 'function') {
        await mongoAdminAPI.deleteProduct(productId);
        console.log('✅ Product deleted successfully');
      } else {
        console.warn('⚠️ Delete product API not implemented');
        throw new Error('Delete product not implemented');
      }
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
    
    // Setters
    setAdminStats,
    setAdminCustomers,
    setAdminOrders,
    setStockAnalysis,
    setSalesReport
  };
};

export default useAdmin;