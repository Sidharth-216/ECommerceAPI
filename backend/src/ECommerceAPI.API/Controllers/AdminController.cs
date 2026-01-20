using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Threading.Tasks;
using ECommerceAPI.Application.Interfaces;

namespace ECommerceAPI.API.Controllers
{
    /// <summary>
    /// Admin Controller - Admin-only operations
    /// AI AGENT HAS NO ACCESS TO ANY OF THESE ENDPOINTS
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin")]
    public class AdminController : ControllerBase
    {
        private readonly IAdminService _adminService;

        public AdminController(IAdminService adminService)
        {
            _adminService = adminService;
        }

        /// <summary>
        /// Get sales report - ADMIN ONLY
        /// </summary>
        [HttpGet("sales-report")]
        public async Task<ActionResult> GetSalesReport(
            [FromQuery] DateTime? startDate,
            [FromQuery] DateTime? endDate)
        {
            var report = await _adminService.GetSalesReportAsync(startDate, endDate);
            return Ok(report);
        }

        /// <summary>
        /// Get stock analysis - ADMIN ONLY
        /// </summary>
        [HttpGet("stock-analysis")]
        public async Task<ActionResult> GetStockAnalysis()
        {
            var analysis = await _adminService.GetStockAnalysisAsync();
            return Ok(analysis);
        }

        /// <summary>
        /// Get customer insights - ADMIN ONLY
        /// </summary>
        [HttpGet("customer-insights")]
        public async Task<ActionResult> GetCustomerInsights()
        {
            var insights = await _adminService.GetCustomerInsightsAsync();
            return Ok(insights);
        }
        /// <summary>
        /// Get all users (customers) - ADMIN ONLY
        /// </summary>
        [HttpGet("users")]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _adminService.GetAllUsersAsync();
            return Ok(users);
        }
        /// <summary>
        /// Get all orders - ADMIN ONLY
        /// </summary>
        [HttpGet("orders")]
        public async Task<IActionResult> GetOrders()
        {
            var orders = await _adminService.GetAllOrdersAsync();
            return Ok(orders);
        }


    }
}