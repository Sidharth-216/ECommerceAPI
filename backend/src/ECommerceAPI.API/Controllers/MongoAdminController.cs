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
    /// MongoDB Admin Controller - COMPLETE WITH ORDER STATUS UPDATES
    /// All admin operations including order management
    /// </summary>
    [ApiController]
    [Route("api/mongo/admin")]
    [Authorize(Roles = "Admin")]
    public class MongoAdminController : ControllerBase
    {
        private readonly IMongoAdminService _mongoAdminService;
        private readonly IMongoOrderService _mongoOrderService;

        public MongoAdminController(
            IMongoAdminService mongoAdminService,
            IMongoOrderService mongoOrderService)
        {
            _mongoAdminService = mongoAdminService;
            _mongoOrderService = mongoOrderService;
        }

        // ===================== USER MANAGEMENT =====================

        [HttpGet("users")]
        public async Task<ActionResult<IEnumerable<object>>> GetUsers()
        {
            try
            {
                Console.WriteLine("═══════════════════════════════════════════════════════");
                Console.WriteLine("👥 [MongoAdminController] GET /api/mongo/admin/users");
                Console.WriteLine("═══════════════════════════════════════════════════════");

                var users = await _mongoAdminService.GetAllUsersAsync();

                Console.WriteLine($"✅ Retrieved {users?.Count() ?? 0} users from MongoDB");
                return Ok(users);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ ERROR: {ex.Message}");
                return StatusCode(500, new { message = "An error occurred while fetching users", error = ex.Message });
            }
        }

        [HttpGet("users/{mongoId}")]
        public async Task<ActionResult<object>> GetUserById(string mongoId)
        {
            try
            {
                var user = await _mongoAdminService.GetUserByIdAsync(mongoId);
                return Ok(user);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ===================== ORDER MANAGEMENT =====================

        [HttpGet("orders")]
        public async Task<ActionResult<IEnumerable<OrderDto>>> GetOrders()
        {
            try
            {
                Console.WriteLine("📦 [MongoAdminController] GET /api/mongo/admin/orders");
                var orders = await _mongoAdminService.GetAllOrdersAsync();
                return Ok(orders);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ ERROR: {ex.Message}");
                return StatusCode(500, new { message = "An error occurred while fetching orders", error = ex.Message });
            }
        }

        /// <summary>
        /// Update order status - CRITICAL ENDPOINT FOR ADMIN
        /// PUT /api/mongo/admin/orders/{orderId}/status
        /// </summary>
        [HttpPut("orders/{orderId}/status")]
        public async Task<IActionResult> UpdateOrderStatus(string orderId, [FromBody] UpdateOrderStatusDto dto)
        {
            try
            {
                Console.WriteLine($"✏️ [MongoAdminController] Updating order {orderId} status to {dto.Status}");

                if (string.IsNullOrEmpty(orderId))
                {
                    return BadRequest(new { message = "Order ID is required" });
                }

                if (string.IsNullOrEmpty(dto?.Status))
                {
                    return BadRequest(new { message = "Status is required" });
                }

                // Validate status
                var validStatuses = new[] { "Pending", "Processing", "Shipped", "Delivered", "Cancelled" };
                if (!validStatuses.Contains(dto.Status))
                {
                    return BadRequest(new { message = $"Invalid status. Must be one of: {string.Join(", ", validStatuses)}" });
                }

                // Update order status using the order service
                var success = await _mongoOrderService.UpdateOrderStatusAsync(orderId, dto.Status);

                if (!success)
                {
                    return NotFound(new { message = $"Order {orderId} not found" });
                }

                Console.WriteLine($"✅ Order {orderId} status updated to {dto.Status}");
                return Ok(new { message = $"Order status updated to {dto.Status}", orderId, status = dto.Status });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ ERROR updating order status: {ex.Message}");
                return StatusCode(500, new { message = "Failed to update order status", error = ex.Message });
            }
        }

        [HttpGet("order-stats")]
        public async Task<ActionResult<OrderStatsDto>> GetOrderStats()
        {
            try
            {
                var stats = await _mongoAdminService.GetOrderStatsAsync();
                return Ok(stats);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ===================== SALES & REVENUE REPORTS =====================

        [HttpGet("sales-report")]
        public async Task<ActionResult<SalesReportDto>> GetSalesReport(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            try
            {
                var report = await _mongoAdminService.GetSalesReportAsync(startDate, endDate);
                return Ok(report);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpGet("revenue")]
        public async Task<ActionResult<RevenueDto>> GetRevenue(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            try
            {
                var revenue = await _mongoAdminService.GetRevenueAsync(startDate, endDate);
                return Ok(revenue);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpGet("sales-by-category")]
        public async Task<ActionResult<IEnumerable<CategorySalesDto>>> GetSalesByCategory(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            try
            {
                var sales = await _mongoAdminService.GetSalesByCategoryAsync(startDate, endDate);
                return Ok(sales);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpGet("sales-by-product")]
        public async Task<ActionResult<IEnumerable<ProductSalesDto>>> GetSalesByProduct(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            try
            {
                var sales = await _mongoAdminService.GetSalesByProductAsync(startDate, endDate);
                return Ok(sales);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        [HttpGet("top-products")]
        public async Task<ActionResult<IEnumerable<TopProductDto>>> GetTopProducts([FromQuery] int limit = 10)
        {
            try
            {
                var products = await _mongoAdminService.GetTopProductsAsync(limit);
                return Ok(products);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ===================== STOCK & INVENTORY =====================

        [HttpGet("stock-analysis")]
        public async Task<ActionResult<StockAnalysisDto>> GetStockAnalysis()
        {
            try
            {
                Console.WriteLine("📈 [MongoAdminController] GET /api/mongo/admin/stock-analysis");
                var analysis = await _mongoAdminService.GetStockAnalysisAsync();
                return Ok(analysis);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ ERROR: {ex.Message}");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ===================== CUSTOMER ANALYTICS =====================

        [HttpGet("customer-insights")]
        public async Task<ActionResult<CustomerInsightsDto>> GetCustomerInsights()
        {
            try
            {
                var insights = await _mongoAdminService.GetCustomerInsightsAsync();
                return Ok(insights);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ===================== METRICS & ANALYTICS =====================

        [HttpGet("daily-metrics")]
        public async Task<ActionResult<IEnumerable<DailyMetricDto>>> GetDailyMetrics(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            try
            {
                var metrics = await _mongoAdminService.GetDailyMetricsAsync(startDate, endDate);
                return Ok(metrics);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        // ===================== DASHBOARD =====================

        [HttpGet("dashboard")]
        public async Task<ActionResult<AdminDashboardDto>> GetDashboard()
        {
            try
            {
                Console.WriteLine("🎯 [MongoAdminController] GET /api/mongo/admin/dashboard");
                var dashboard = await _mongoAdminService.GetDashboardAsync();
                return Ok(dashboard);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ ERROR: {ex.Message}");
                return StatusCode(500, new { message = "An error occurred while building dashboard", error = ex.Message });
            }
        }
    }
}