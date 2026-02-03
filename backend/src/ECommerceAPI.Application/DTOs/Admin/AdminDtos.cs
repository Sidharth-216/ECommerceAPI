using System;
using System.Collections.Generic;

namespace ECommerceAPI.Application.DTOs.Admin
{
    /// <summary>
    /// Sales Report DTO
    /// </summary>
   

    /// <summary>
    /// Stock Analysis DTO
    /// </summary>
    public class StockAnalysisDto
    {
        public int TotalProducts { get; set; }
        public int TotalStockQuantity { get; set; }
        public decimal TotalStockValue { get; set; }
        public int LowStockProducts { get; set; }
        public int OutOfStockProducts { get; set; }
        public List<LowStockProductDto> LowStockItems { get; set; }
        public List<CategoryStockDto> StockByCategory { get; set; }
    }

    /// <summary>
    /// Customer Insights DTO
    /// </summary>


    /// <summary>
    /// Order Statistics DTO
    /// </summary>
    public class OrderStatsDto
    {
        public int TotalOrders { get; set; }
        public int PendingOrders { get; set; }
        public int ProcessingOrders { get; set; }
        public int ShippedOrders { get; set; }
        public int DeliveredOrders { get; set; }
        public int CancelledOrders { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal AverageOrderValue { get; set; }
    }

    /// <summary>
    /// Revenue DTO
    /// </summary>
    public class RevenueDto
    {
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public decimal TotalRevenue { get; set; }
        public decimal TotalTax { get; set; }
        public decimal TotalShipping { get; set; }
        public decimal NetRevenue { get; set; }
        public int OrderCount { get; set; }
        public decimal AverageOrderValue { get; set; }
    }

    /// <summary>
    /// Top Product DTO
    /// </summary>
    public class TopProductDto
    {
        public string ProductId { get; set; }
        public string ProductName { get; set; }
        public string Category { get; set; }
        public int QuantitySold { get; set; }
        public decimal Revenue { get; set; }
        public int OrderCount { get; set; }
    }

    /// <summary>
    /// Daily Metric DTO
    /// </summary>
    public class DailyMetricDto
    {
        public DateTime Date { get; set; }
        public int Orders { get; set; }
        public decimal Revenue { get; set; }
        public int ItemsSold { get; set; }
        public int NewCustomers { get; set; }
    }

    /// <summary>
    /// Category Sales DTO
    /// </summary>
    public class CategorySalesDto
    {
        public string Category { get; set; }
        public int OrderCount { get; set; }
        public int QuantitySold { get; set; }
        public decimal Revenue { get; set; }
        public decimal Percentage { get; set; }
    }

    /// <summary>
    /// Product Sales DTO
    /// </summary>
    public class ProductSalesDto
    {
        public string ProductId { get; set; }
        public string ProductName { get; set; }
        public string Category { get; set; }
        public int QuantitySold { get; set; }
        public decimal Revenue { get; set; }
        public int OrderCount { get; set; }
    }

    /// <summary>
    /// Low Stock Product DTO
    /// </summary>
    public class LowStockProductDto
    {
        public string ProductId { get; set; }
        public string ProductName { get; set; }
        public string Category { get; set; }
        public int CurrentStock { get; set; }
        public int ReorderLevel { get; set; }
        public decimal Price { get; set; }
    }

    /// <summary>
    /// Category Stock DTO
    /// </summary>
    public class CategoryStockDto
    {
        public string Category { get; set; }
        public int ProductCount { get; set; }
        public int TotalStock { get; set; }
        public decimal TotalValue { get; set; }
    }

    /// <summary>
    /// Top Customer DTO
    /// </summary>
    public class TopCustomerDto
    {
        public string UserId { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public int TotalOrders { get; set; }
        public decimal TotalSpent { get; set; }
        public DateTime LastOrderDate { get; set; }
    }

    /// <summary>
    /// Admin Dashboard DTO
    /// </summary>
    public class AdminDashboardDto
    {
        public OrderStatsDto OrderStats { get; set; }
        public RevenueDto RevenueStats { get; set; }
        public CustomerSummaryDto CustomerSummary { get; set; }
        public StockSummaryDto StockSummary { get; set; }
        public List<DailyMetricDto> RecentMetrics { get; set; }
        public List<TopProductDto> TopProducts { get; set; }
    }

    /// <summary>
    /// Customer Summary DTO
    /// </summary>
    public class CustomerSummaryDto
    {
        public int TotalCustomers { get; set; }
        public int NewCustomersToday { get; set; }
        public int NewCustomersThisWeek { get; set; }
        public int NewCustomersThisMonth { get; set; }
        public int ActiveCustomers { get; set; }
    }

    /// <summary>
    /// Stock Summary DTO
    /// </summary>
    public class StockSummaryDto
    {
        public int TotalProducts { get; set; }
        public int LowStockProducts { get; set; }
        public int OutOfStockProducts { get; set; }
        public decimal TotalStockValue { get; set; }
    }

    /// <summary>
    /// Product Stock Info DTO
    /// </summary>
    public class ProductStockInfo
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; }
        public int CurrentStock { get; set; }
        public int ReorderLevel { get; set; }
        public decimal Price { get; set; }
    }
}