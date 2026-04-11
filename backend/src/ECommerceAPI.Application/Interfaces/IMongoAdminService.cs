using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Admin;
using ECommerceAPI.Application.DTOs.Orders;
using ECommerceAPI.Application.DTOs.User;

namespace ECommerceAPI.Application.Interfaces
{
    /// <summary>
    /// MongoDB Admin Service Interface
    /// Handles admin-only operations using MongoDB storage
    /// </summary>
    public interface IMongoAdminService
    {
        /// <summary>
        /// Get all users from MongoDB
        /// </summary>
        Task<IEnumerable<UserDto>> GetAllUsersAsync();

        /// <summary>
        /// Get user by MongoDB ObjectId
        /// </summary>
        /// <param name="mongoId">MongoDB ObjectId (24 hex characters)</param>
        Task<UserDto> GetUserByIdAsync(string mongoId);

        /// <summary>
        /// Delete a customer by MongoDB ObjectId.
        /// </summary>
        Task<bool> DeleteUserAsync(string mongoId);

        /// <summary>
        /// Get all orders from MongoDB
        /// </summary>
        Task<IEnumerable<OrderDto>> GetAllOrdersAsync();

        /// <summary>
        /// Get sales report for specified date range
        /// </summary>
        /// <param name="startDate">Start date (optional)</param>
        /// <param name="endDate">End date (optional)</param>
        Task<SalesReportDto> GetSalesReportAsync(DateTime? startDate, DateTime? endDate);

        /// <summary>
        /// Get stock analysis across all products
        /// </summary>
        Task<StockAnalysisDto> GetStockAnalysisAsync();

        /// <summary>
        /// Get customer insights and analytics
        /// </summary>
        Task<CustomerInsightsDto> GetCustomerInsightsAsync();

        /// <summary>
        /// Get order statistics
        /// </summary>
        Task<OrderStatsDto> GetOrderStatsAsync();

        /// <summary>
        /// Get revenue analytics for date range
        /// </summary>
        /// <param name="startDate">Start date (optional)</param>
        /// <param name="endDate">End date (optional)</param>
        Task<RevenueDto> GetRevenueAsync(DateTime? startDate, DateTime? endDate);

        /// <summary>
        /// Get top selling products
        /// </summary>
        /// <param name="limit">Number of products to return (default: 10)</param>
        Task<IEnumerable<TopProductDto>> GetTopProductsAsync(int limit = 10);

        /// <summary>
        /// Get daily metrics for date range
        /// </summary>
        Task<IEnumerable<DailyMetricDto>> GetDailyMetricsAsync(DateTime? startDate, DateTime? endDate);

        /// <summary>
        /// Get sales by category
        /// </summary>
        Task<IEnumerable<CategorySalesDto>> GetSalesByCategoryAsync(DateTime? startDate, DateTime? endDate);

        /// <summary>
        /// Get sales by product
        /// </summary>
        Task<IEnumerable<ProductSalesDto>> GetSalesByProductAsync(DateTime? startDate, DateTime? endDate);

        /// <summary>
        /// Get admin dashboard summary
        /// </summary>
        Task<AdminDashboardDto> GetDashboardAsync();
    }
}