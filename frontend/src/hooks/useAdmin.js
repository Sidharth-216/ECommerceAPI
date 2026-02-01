import { useState } from 'react';
import { adminAPI } from '../api';

export const useAdmin = () => {
  const [adminStats, setAdminStats] = useState([]);
  const [adminCustomers, setAdminCustomers] = useState([]);
  const [adminOrders, setAdminOrders] = useState([]);
  const [stockAnalysis, setStockAnalysis] = useState([]);
  const [salesReport, setSalesReport] = useState(null);

  const fetchAdminData = async () => {
    try {
      const [customersRes, ordersRes] = await Promise.all([
        adminAPI.getUsers(),
        adminAPI.getOrders()
      ]);

      setAdminCustomers(customersRes?.data || []);
      setAdminOrders(ordersRes?.data || []);

      const totalSales = (ordersRes?.data || []).reduce(
        (sum, order) => sum + (order?.totalAmount || 0), 0
      );

      setAdminStats([
        {label: 'Total Sales', value: `₹${totalSales.toLocaleString()}`, change: '+12.5%'},
        {label: 'Total Orders', value: (ordersRes?.data || []).length.toString(), change: '+8.2%'},
        {label: 'Total Customers', value: (customersRes?.data || []).length.toString(), change: '+15.3%'},
      ]);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    }
  };

  const fetchStockAnalysis = async () => {
    try {
      const [analysisRes, lowStockRes] = await Promise.all([
        adminAPI.getStockAnalysis(),
        adminAPI.getLowStockProducts()
      ]);
      
      setStockAnalysis(analysisRes?.data || []);
    } catch (err) {
      console.error('Failed to fetch stock analysis:', err);
    }
  };

  const fetchSalesReport = async (startDate, endDate) => {
    try {
      const reportRes = await adminAPI.getSalesReport(startDate, endDate);
      setSalesReport(reportRes?.data);
    } catch (err) {
      console.error('Failed to fetch sales report:', err);
    }
  };

  return {
    adminStats,
    adminCustomers,
    adminOrders,
    stockAnalysis,
    salesReport,
    fetchAdminData,
    fetchStockAnalysis,
    fetchSalesReport
  };
};