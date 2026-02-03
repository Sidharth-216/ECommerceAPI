using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Application.DTOs.Admin;
using ECommerceAPI.Application.DTOs.Orders;

namespace ECommerceAPI.API.Controllers
{
    /// <summary>
    /// MongoDB Admin Controller - Admin-only operations using MongoDB
    /// Parallel to the existing SQL-based AdminController
    /// </summary>
    [ApiController]
    [Route("api/mongo/admin")]
    [Authorize(Roles = "Admin")]
    public class MongoAdminController : ControllerBase
    {
        private readonly IMongoAdminService _mongoAdminService;

        public MongoAdminController(IMongoAdminService mongoAdminService)
        {
            _mongoAdminService = mongoAdminService;
        }

        // ===================== USER MANAGEMENT =====================

        /// <summary>
        /// Get all users from MongoDB - ADMIN ONLY
        /// GET /api/mongo/admin/users
        /// </summary>
        [HttpGet("users")]
        public async Task<ActionResult<IEnumerable<object>>> GetUsers()
        {
            try
            {
                System.Console.WriteLine("═══════════════════════════════════════════════════════");
                System.Console.WriteLine("👥 [MongoAdminController] GET /api/mongo/admin/users");
                System.Console.WriteLine("   FETCHING ALL USERS FROM MONGODB");
                System.Console.WriteLine("═══════════════════════════════════════════════════════");

                var users = await _mongoAdminService.GetAllUsersAsync();

                System.Console.WriteLine($"✅ Retrieved {users?.Count() ?? 0} users from MongoDB");
                System.Console.WriteLine("═══════════════════════════════════════════════════════");

                return Ok(users);
            }
            catch (System.Exception ex)
            {
                System.Console.WriteLine($"❌ ERROR fetching users from MongoDB:");
                System.Console.WriteLine($"   Type: {ex.GetType().Name}");
                System.Console.WriteLine($"   Message: {ex.Message}");
                System.Console.WriteLine("═══════════════════════════════════════════════════════");

                return StatusCode(500, new
                {
                    message = "An error occurred while fetching users",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// Get user by MongoDB ID - ADMIN ONLY
        /// GET /api/mongo/admin/users/{mongoId}
        /// </summary>
        [HttpGet("users/{mongoId}")]
        public async Task<ActionResult<object>> GetUserById(string mongoId)
        {
            try
            {
                System.Console.WriteLine($"👤 [MongoAdminController] GET /api/mongo/admin/users/{mongoId}");

                var user = await _mongoAdminService.GetUserByIdAsync(mongoId);
                return Ok(user);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (System.Exception ex)
            {
                System.Console.WriteLine($"❌ ERROR: {ex.Message}");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ===================== ORDER MANAGEMENT =====================

        /// <summary>
        /// Get all orders from MongoDB - ADMIN ONLY
        /// GET /api/mongo/admin/orders
        /// </summary>
        [HttpGet("orders")]
        public async Task<ActionResult<IEnumerable<OrderDto>>> GetOrders()
        {
            try
            {
                System.Console.WriteLine("═══════════════════════════════════════════════════════");
                System.Console.WriteLine("📦 [MongoAdminController] GET /api/mongo/admin/orders");
                System.Console.WriteLine("   FETCHING ALL ORDERS FROM MONGODB");
                System.Console.WriteLine("═══════════════════════════════════════════════════════");

                var orders = await _mongoAdminService.GetAllOrdersAsync();

                System.Console.WriteLine($"✅ Retrieved {orders?.Count() ?? 0} orders from MongoDB");
                System.Console.WriteLine("═══════════════════════════════════════════════════════");

                return Ok(orders);
            }
            catch (System.Exception ex)
            {
                System.Console.WriteLine($"❌ ERROR fetching orders from MongoDB:");
                System.Console.WriteLine($"   Type: {ex.GetType().Name}");
                System.Console.WriteLine($"   Message: {ex.Message}");
                System.Console.WriteLine("═══════════════════════════════════════════════════════");

                return StatusCode(500, new
                {
                    message = "An error occurred while fetching orders",
                    error = ex.Message
                });
            }
        }

        /// <summary>
        /// Get order statistics - ADMIN ONLY
        /// GET /api/mongo/admin/order-stats
        /// </summary>
        [HttpGet("order-stats")]
        public async Task<ActionResult<OrderStatsDto>> GetOrderStats()
        {
            try
            {
                System.Console.WriteLine("📊 [MongoAdminController] GET /api/mongo/admin/order-stats");

                var stats = await _mongoAdminService.GetOrderStatsAsync();
                return Ok(stats);
            }
            catch (System.Exception ex)
            {
                System.Console.WriteLine($"❌ ERROR: {ex.Message}");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ===================== SALES & REVENUE REPORTS =====================

        /// <summary>
        /// Get sales report from MongoDB - ADMIN ONLY
        /// GET /api/mongo/admin/sales-report
        /// </summary>
        [HttpGet("sales-report")]
        public async Task<ActionResult<SalesReportDto>> GetSalesReport(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            try
            {
                System.Console.WriteLine($"📊 [MongoAdminController] GET /api/mongo/admin/sales-report");
                System.Console.WriteLine($"   Start: {startDate?.ToString("yyyy-MM-dd") ?? "Last 30 days"}");
                System.Console.WriteLine($"   End: {endDate?.ToString("yyyy-MM-dd") ?? "Today"}");

                var report = await _mongoAdminService.GetSalesReportAsync(startDate, endDate);
                return Ok(report);
            }
            catch (System.Exception ex)
            {
                System.Console.WriteLine($"❌ ERROR: {ex.Message}");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get revenue analytics - ADMIN ONLY
        /// GET /api/mongo/admin/revenue
        /// </summary>
        [HttpGet("revenue")]
        public async Task<ActionResult<RevenueDto>> GetRevenue(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            try
            {
                System.Console.WriteLine($"💰 [MongoAdminController] GET /api/mongo/admin/revenue");

                var revenue = await _mongoAdminService.GetRevenueAsync(startDate, endDate);
                return Ok(revenue);
            }
            catch (System.Exception ex)
            {
                System.Console.WriteLine($"❌ ERROR: {ex.Message}");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get sales by category - ADMIN ONLY
        /// GET /api/mongo/admin/sales-by-category
        /// </summary>
        [HttpGet("sales-by-category")]
        public async Task<ActionResult<IEnumerable<CategorySalesDto>>> GetSalesByCategory(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            try
            {
                System.Console.WriteLine($"📊 [MongoAdminController] GET /api/mongo/admin/sales-by-category");

                var sales = await _mongoAdminService.GetSalesByCategoryAsync(startDate, endDate);
                return Ok(sales);
            }
            catch (System.Exception ex)
            {
                System.Console.WriteLine($"❌ ERROR: {ex.Message}");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get sales by product - ADMIN ONLY
        /// GET /api/mongo/admin/sales-by-product
        /// </summary>
        [HttpGet("sales-by-product")]
        public async Task<ActionResult<IEnumerable<ProductSalesDto>>> GetSalesByProduct(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            try
            {
                System.Console.WriteLine($"📦 [MongoAdminController] GET /api/mongo/admin/sales-by-product");

                var sales = await _mongoAdminService.GetSalesByProductAsync(startDate, endDate);
                return Ok(sales);
            }
            catch (System.Exception ex)
            {
                System.Console.WriteLine($"❌ ERROR: {ex.Message}");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get top selling products - ADMIN ONLY
        /// GET /api/mongo/admin/top-products
        /// </summary>
        [HttpGet("top-products")]
        public async Task<ActionResult<IEnumerable<TopProductDto>>> GetTopProducts(
            [FromQuery] int limit = 10)
        {
            try
            {
                System.Console.WriteLine($"🏆 [MongoAdminController] GET /api/mongo/admin/top-products?limit={limit}");

                var products = await _mongoAdminService.GetTopProductsAsync(limit);
                return Ok(products);
            }
            catch (System.Exception ex)
            {
                System.Console.WriteLine($"❌ ERROR: {ex.Message}");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ===================== STOCK & INVENTORY =====================

        /// <summary>
        /// Get stock analysis from MongoDB - ADMIN ONLY
        /// GET /api/mongo/admin/stock-analysis
        /// </summary>
        [HttpGet("stock-analysis")]
        public async Task<ActionResult<StockAnalysisDto>> GetStockAnalysis()
        {
            try
            {
                System.Console.WriteLine("📈 [MongoAdminController] GET /api/mongo/admin/stock-analysis");

                var analysis = await _mongoAdminService.GetStockAnalysisAsync();
                return Ok(analysis);
            }
            catch (System.Exception ex)
            {
                System.Console.WriteLine($"❌ ERROR: {ex.Message}");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ===================== CUSTOMER ANALYTICS =====================

        /// <summary>
        /// Get customer insights from MongoDB - ADMIN ONLY
        /// GET /api/mongo/admin/customer-insights
        /// </summary>
        [HttpGet("customer-insights")]
        public async Task<ActionResult<CustomerInsightsDto>> GetCustomerInsights()
        {
            try
            {
                System.Console.WriteLine("👥 [MongoAdminController] GET /api/mongo/admin/customer-insights");

                var insights = await _mongoAdminService.GetCustomerInsightsAsync();
                return Ok(insights);
            }
            catch (System.Exception ex)
            {
                System.Console.WriteLine($"❌ ERROR: {ex.Message}");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ===================== METRICS & ANALYTICS =====================

        /// <summary>
        /// Get daily metrics - ADMIN ONLY
        /// GET /api/mongo/admin/daily-metrics
        /// </summary>
        [HttpGet("daily-metrics")]
        public async Task<ActionResult<IEnumerable<DailyMetricDto>>> GetDailyMetrics(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            try
            {
                System.Console.WriteLine($"📅 [MongoAdminController] GET /api/mongo/admin/daily-metrics");

                var metrics = await _mongoAdminService.GetDailyMetricsAsync(startDate, endDate);
                return Ok(metrics);
            }
            catch (System.Exception ex)
            {
                System.Console.WriteLine($"❌ ERROR: {ex.Message}");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ===================== DASHBOARD =====================

        /// <summary>
        /// Get admin dashboard summary - ADMIN ONLY
        /// GET /api/mongo/admin/dashboard
        /// </summary>
        [HttpGet("dashboard")]
        public async Task<ActionResult<AdminDashboardDto>> GetDashboard()
        {
            try
            {
                System.Console.WriteLine("═══════════════════════════════════════════════════════");
                System.Console.WriteLine("🎯 [MongoAdminController] GET /api/mongo/admin/dashboard");
                System.Console.WriteLine("   BUILDING ADMIN DASHBOARD FROM MONGODB");
                System.Console.WriteLine("═══════════════════════════════════════════════════════");

                var dashboard = await _mongoAdminService.GetDashboardAsync();

                System.Console.WriteLine($"✅ Dashboard built successfully");
                System.Console.WriteLine("═══════════════════════════════════════════════════════");

                return Ok(dashboard);
            }
            catch (System.Exception ex)
            {
                System.Console.WriteLine($"❌ ERROR building dashboard:");
                System.Console.WriteLine($"   Type: {ex.GetType().Name}");
                System.Console.WriteLine($"   Message: {ex.Message}");
                System.Console.WriteLine("═══════════════════════════════════════════════════════");

                return StatusCode(500, new
                {
                    message = "An error occurred while building dashboard",
                    error = ex.Message
                });
            }
        }
    }
}