using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using ECommerceAPI.Application.DTOs.Orders;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.API.Controllers
{
    /// <summary>
    /// Handles sending transactional order emails (confirmation, cancellation, status updates).
    /// Intended for internal use by other services/controllers or admin triggers.
    /// </summary>
    [ApiController]
    [Route("api/mongo/order-email")]
    [Authorize]
    public class MongoOrderEmailController : ControllerBase
    {
        private readonly IMongoOrderEmailService _orderEmailService;
        private readonly IMongoOrderService      _orderService;
        private readonly IMongoUserRepository    _userRepository;
        private readonly ILogger<MongoOrderEmailController> _logger;

        public MongoOrderEmailController(
            IMongoOrderEmailService orderEmailService,
            IMongoOrderService      orderService,
            IMongoUserRepository    userRepository,
            ILogger<MongoOrderEmailController> logger)
        {
            _orderEmailService = orderEmailService;
            _orderService      = orderService;
            _userRepository    = userRepository;
            _logger            = logger;
        }

        // ─────────────────────────────────────────────────────────────────────────
        // POST /api/mongo/order-email/confirmation/{orderId}
        // Resend / trigger order confirmation email for a given order
        // ─────────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Trigger (or re-send) an order confirmation email.
        /// Accessible by the owning user or an Admin.
        /// </summary>
        [HttpPost("confirmation/{orderId}")]
        public async Task<IActionResult> SendConfirmationEmail(string orderId)
        {
            _logger.LogInformation(
                "📧 [MongoOrderEmailController] Confirmation email requested for order {OrderId}",
                orderId);

            try
            {
                var (order, user, error) = await ResolveOrderAndUser(orderId);
                if (error != null) return error;

                var sent = await _orderEmailService.SendOrderConfirmationAsync(
                    user!.Email,
                    user.FullName,
                    order!);

                if (!sent)
                    return StatusCode(500, new { success = false, message = "Failed to send confirmation email." });

                _logger.LogInformation(
                    "✅ Confirmation email sent to {Email} for order {OrderNumber}",
                    user.Email, order!.OrderNumber);

                return Ok(new
                {
                    success = true,
                    message = $"Order confirmation email sent to {user.Email}",
                    orderNumber = order.OrderNumber
                });
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex,
                    "❌ Error sending confirmation email for order {OrderId}", orderId);
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ─────────────────────────────────────────────────────────────────────────
        // POST /api/mongo/order-email/cancellation/{orderId}
        // ─────────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Send an order cancellation email.
        /// </summary>
        [HttpPost("cancellation/{orderId}")]
        public async Task<IActionResult> SendCancellationEmail(string orderId)
        {
            _logger.LogInformation(
                "📧 [MongoOrderEmailController] Cancellation email requested for order {OrderId}",
                orderId);

            try
            {
                var (order, user, error) = await ResolveOrderAndUser(orderId);
                if (error != null) return error;

                var sent = await _orderEmailService.SendOrderCancellationAsync(
                    user!.Email,
                    user.FullName,
                    order!);

                if (!sent)
                    return StatusCode(500, new { success = false, message = "Failed to send cancellation email." });

                return Ok(new
                {
                    success = true,
                    message = $"Order cancellation email sent to {user.Email}",
                    orderNumber = order!.OrderNumber
                });
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex,
                    "❌ Error sending cancellation email for order {OrderId}", orderId);
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ─────────────────────────────────────────────────────────────────────────
        // POST /api/mongo/order-email/status-update/{orderId}
        // Admin only — called after updating order status
        // ─────────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Send an order status update email (e.g. Shipped, Delivered).
        /// Admin only.
        /// </summary>
        [HttpPost("status-update/{orderId}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> SendStatusUpdateEmail(
            string orderId,
            [FromBody] StatusUpdateEmailDto dto)
        {
            _logger.LogInformation(
                "📧 [MongoOrderEmailController] Status update email requested for order {OrderId}",
                orderId);

            if (string.IsNullOrWhiteSpace(dto?.PreviousStatus))
                return BadRequest(new { success = false, message = "PreviousStatus is required." });

            try
            {
                var (order, user, error) = await ResolveOrderAndUser(orderId);
                if (error != null) return error;

                var sent = await _orderEmailService.SendOrderStatusUpdateAsync(
                    user!.Email,
                    user.FullName,
                    order!,
                    dto.PreviousStatus);

                if (!sent)
                    return StatusCode(500, new { success = false, message = "Failed to send status update email." });

                return Ok(new
                {
                    success      = true,
                    message      = $"Status update email sent to {user.Email}",
                    orderNumber  = order!.OrderNumber,
                    currentStatus = order.Status
                });
            }
            catch (System.Exception ex)
            {
                _logger.LogError(ex,
                    "❌ Error sending status update email for order {OrderId}", orderId);
                return StatusCode(500, new { success = false, message = ex.Message });
            }
        }

        // ─────────────────────────────────────────────────────────────────────────
        // PRIVATE HELPERS
        // ─────────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Resolves the order and its owner, enforcing access control.
        /// Returns (order, user, null) on success, or (null, null, errorResult) on failure.
        /// </summary>
        private async Task<(OrderDto? order, MongoUserLookup? user, IActionResult? error)>
            ResolveOrderAndUser(string orderId)
        {
            var requestingUserId = GetRequestingUserId();
            var isAdmin          = User.IsInRole("Admin");

            // 1. Fetch the order — admins bypass ownership check via a direct repo lookup
            OrderDto order;
            try
            {
                if (isAdmin)
                {
                    // Admin: fetch without ownership check using a known-valid but bypassed userId.
                    // GetAllOrdersAsync then filter, or expose GetByIdAsync on service for admins.
                    var allOrders = await _orderService.GetAllOrdersAsync();
                    var found     = System.Linq.Enumerable.FirstOrDefault(
                                        allOrders, o => o.Id == orderId);
                    if (found == null)
                        return (null, null, NotFound(new { success = false, message = "Order not found." }));
                    order = found;
                }
                else
                {
                    order = await _orderService.GetOrderByMongoIdAsync(orderId, requestingUserId);
                }
            }
            catch (System.Collections.Generic.KeyNotFoundException)
            {
                return (null, null, NotFound(new { success = false, message = "Order not found." }));
            }
            catch (System.UnauthorizedAccessException)
            {
                return (null, null, Forbid());
            }

            // 2. Resolve owner: admins look up by the order's stored UserId field if available,
            //    regular users always resolve to themselves.
            var ownerIdToLookup = isAdmin
                ? (order.UserId ?? requestingUserId)   // OrderDto.UserId populated when mapped
                : requestingUserId;

            var mongoUser = await _userRepository.GetByIdAsync(ownerIdToLookup);

            // Fallback: if admin and UserId not on DTO, try the requesting user's own record
            if (mongoUser == null && isAdmin)
                mongoUser = await _userRepository.GetByIdAsync(requestingUserId);

            if (mongoUser == null)
                return (null, null, NotFound(new { success = false, message = "Order owner not found." }));

            if (string.IsNullOrWhiteSpace(mongoUser.Email))
                return (null, null, BadRequest(new
                {
                    success = false,
                    message = "No email address found for the order owner."
                }));

            var lookup = new MongoUserLookup
            {
                Email    = mongoUser.Email,
                FullName = mongoUser.FullName ?? "Valued Customer"
            };

            return (order, lookup, null);
        }

        private string GetRequestingUserId()
        {
            return User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                ?? User.FindFirst("sub")?.Value
                ?? User.FindFirst("nameid")?.Value
                ?? throw new System.UnauthorizedAccessException("User ID not found in token");
        }

        // Small DTO for user lookups within this controller
        private class MongoUserLookup
        {
            public string Email    { get; set; } = string.Empty;
            public string FullName { get; set; } = string.Empty;
        }
    }

    // ── Request DTO ──────────────────────────────────────────────────────────────
    public class StatusUpdateEmailDto
    {
        /// <summary>The status BEFORE the update (e.g. "Processing")</summary>
        public string PreviousStatus { get; set; } = string.Empty;
    }
}