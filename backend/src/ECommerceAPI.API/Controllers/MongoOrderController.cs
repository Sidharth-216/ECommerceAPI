using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Security.Claims;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Application.DTOs.Orders;
using MongoDB.Bson;

namespace ECommerceAPI.API.Controllers
{
    /// <summary>
    /// Pure MongoDB Order Controller - NO SQL DEPENDENCIES
    /// </summary>
    [ApiController]
    [Route("api/mongo/order")]
    [Authorize]
    public class MongoOrderController : ControllerBase
    {
        private readonly IMongoOrderService _mongoOrderService;

        public MongoOrderController(IMongoOrderService mongoOrderService)
        {
            _mongoOrderService = mongoOrderService;
        }

        /// <summary>
        /// Confirm order (create from cart) - Pure MongoDB
        /// POST /api/mongo/order/confirm
        /// </summary>
        [HttpPost("confirm")]
        public async Task<ActionResult<OrderDto>> ConfirmOrder([FromBody] CreateOrderDto createOrderDto)
        {
            System.Console.WriteLine("═══════════════════════════════════════════════════════");
            System.Console.WriteLine("🚀 [MongoOrderController] POST /api/mongo/order/confirm");
            System.Console.WriteLine("   PURE MONGODB MODE - NO SQL");
            System.Console.WriteLine("═══════════════════════════════════════════════════════");

            try
            {
                // Get MongoDB User ID from JWT token
                var mongoUserId = GetMongoUserId();
                System.Console.WriteLine($"🔐 JWT Token Claims:");
                System.Console.WriteLine($"   MongoDB User ID: {mongoUserId}");

                // Validate MongoDB ObjectId format
                if (!ObjectId.TryParse(mongoUserId, out _))
                {
                    System.Console.WriteLine($"❌ Invalid MongoDB ObjectId in token: {mongoUserId}");
                    return BadRequest(new { 
                        message = $"Invalid MongoDB User ID format in token: {mongoUserId}. Expected 24 hex characters." 
                    });
                }

                System.Console.WriteLine($"✅ Valid MongoDB User ID format");

                // Validate request body
                if (createOrderDto == null)
                {
                    System.Console.WriteLine("❌ CreateOrderDto is null");
                    return BadRequest(new { message = "Order data is required" });
                }

                if (string.IsNullOrWhiteSpace(createOrderDto.ShippingAddressId))
                {
                    System.Console.WriteLine("❌ ShippingAddressId is null or empty");
                    return BadRequest(new { message = "Shipping address ID is required" });
                }

                System.Console.WriteLine($"📋 Request Data:");
                System.Console.WriteLine($"   ShippingAddressId: {createOrderDto.ShippingAddressId}");

                // Call service with MongoDB User ID
                System.Console.WriteLine($"📞 Calling MongoOrderService.CreateOrderAsync (Pure MongoDB)...");
                var order = await _mongoOrderService.CreateOrderAsync(mongoUserId, createOrderDto);

                System.Console.WriteLine($"✅ Order created successfully!");
                System.Console.WriteLine($"   Order ID: {order.Id}");
                System.Console.WriteLine($"   Order Number: {order.OrderNumber}");
                System.Console.WriteLine($"   Total: ₹{order.TotalAmount}");
                System.Console.WriteLine("═══════════════════════════════════════════════════════");

                return Ok(order);
            }
            catch (System.InvalidOperationException ex)
            {
                System.Console.WriteLine($"❌ InvalidOperationException: {ex.Message}");
                System.Console.WriteLine("═══════════════════════════════════════════════════════");
                return BadRequest(new { message = ex.Message });
            }
            catch (System.UnauthorizedAccessException ex)
            {
                System.Console.WriteLine($"❌ UnauthorizedAccessException: {ex.Message}");
                System.Console.WriteLine("═══════════════════════════════════════════════════════");
                return Forbid();
            }
            catch (KeyNotFoundException ex)
            {
                System.Console.WriteLine($"❌ KeyNotFoundException: {ex.Message}");
                System.Console.WriteLine("═══════════════════════════════════════════════════════");
                return NotFound(new { message = ex.Message });
            }
            catch (System.ArgumentException ex)
            {
                System.Console.WriteLine($"❌ ArgumentException: {ex.Message}");
                System.Console.WriteLine("═══════════════════════════════════════════════════════");
                return BadRequest(new { message = ex.Message });
            }
            catch (System.Exception ex)
            {
                System.Console.WriteLine($"❌ UNEXPECTED ERROR:");
                System.Console.WriteLine($"   Type: {ex.GetType().Name}");
                System.Console.WriteLine($"   Message: {ex.Message}");
                System.Console.WriteLine($"   StackTrace: {ex.StackTrace}");
                System.Console.WriteLine("═══════════════════════════════════════════════════════");

                return StatusCode(500, new
                {
                    message = "An error occurred while creating the order",
                    error = ex.Message,
                    type = ex.GetType().Name
                });
            }
        }

        /// <summary>
        /// Get order history - Pure MongoDB
        /// GET /api/mongo/order/history
        /// </summary>
        [HttpGet("history")]
        public async Task<ActionResult<IEnumerable<OrderDto>>> GetOrderHistory()
        {
            try
            {
                var mongoUserId = GetMongoUserId();
                
                if (!ObjectId.TryParse(mongoUserId, out _))
                {
                    return BadRequest(new { message = $"Invalid MongoDB User ID format: {mongoUserId}" });
                }

                var orders = await _mongoOrderService.GetUserOrdersAsync(mongoUserId);
                return Ok(orders);
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { 
                    message = "An error occurred while fetching order history", 
                    error = ex.Message 
                });
            }
        }

        /// <summary>
        /// Get specific order by MongoDB ID
        /// GET /api/mongo/order/{mongoId}
        /// </summary>
        [HttpGet("{mongoId}")]
        public async Task<ActionResult<OrderDto>> GetOrderByMongoId(string mongoId)
        {
            try
            {
                var mongoUserId = GetMongoUserId();
                
                if (!ObjectId.TryParse(mongoUserId, out _))
                {
                    return BadRequest(new { message = $"Invalid MongoDB User ID format: {mongoUserId}" });
                }

                var order = await _mongoOrderService.GetOrderByMongoIdAsync(mongoId, mongoUserId);
                return Ok(order);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (System.FormatException ex)
            {
                return BadRequest(new { message = "Invalid MongoDB ID format", error = ex.Message });
            }
        }

        /// <summary>
        /// Get order by Order Number
        /// GET /api/mongo/order/order-number/{orderNumber}
        /// </summary>
        [HttpGet("order-number/{orderNumber}")]
        public async Task<ActionResult<OrderDto>> GetOrderByOrderNumber(string orderNumber)
        {
            try
            {
                var mongoUserId = GetMongoUserId();
                
                if (!ObjectId.TryParse(mongoUserId, out _))
                {
                    return BadRequest(new { message = $"Invalid MongoDB User ID format: {mongoUserId}" });
                }

                var order = await _mongoOrderService.GetOrderByOrderNumberAsync(orderNumber, mongoUserId);
                return Ok(order);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
        }

        /// <summary>
        /// Cancel order by MongoDB ID
        /// POST /api/mongo/order/{mongoId}/cancel
        /// </summary>
        [HttpPost("{mongoId}/cancel")]
        public async Task<ActionResult> CancelOrder(string mongoId)
        {
            try
            {
                var mongoUserId = GetMongoUserId();
                
                if (!ObjectId.TryParse(mongoUserId, out _))
                {
                    return BadRequest(new { message = $"Invalid MongoDB User ID format: {mongoUserId}" });
                }

                await _mongoOrderService.CancelOrderAsync(mongoId, mongoUserId);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (System.InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (System.FormatException ex)
            {
                return BadRequest(new { message = "Invalid MongoDB ID format", error = ex.Message });
            }
        }

        /// <summary>
        /// Get all orders (Admin only)
        /// GET /api/mongo/order/all
        /// </summary>
        [HttpGet("all")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<OrderDto>>> GetAllOrders()
        {
            try
            {
                var orders = await _mongoOrderService.GetAllOrdersAsync();
                return Ok(orders);
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { 
                    message = "An error occurred while fetching orders", 
                    error = ex.Message 
                });
            }
        }

    /// <summary>
    /// Download invoice for a delivered order
    /// GET /api/mongo/order/{orderId}/invoice
    /// Returns PDF invoice as file download
    /// </summary>
    [HttpGet("{orderId}/invoice")]
    public async Task<ActionResult> DownloadInvoice(string orderId)
    {
        try
        {
            if (!ObjectId.TryParse(orderId, out _))
            {
                return BadRequest(new { message = $"Invalid MongoDB Order ID format: {orderId}" });
            }

            var mongoUserId = GetMongoUserId();
            if (!ObjectId.TryParse(mongoUserId, out _))
            {
                return BadRequest(new { message = $"Invalid MongoDB User ID format: {mongoUserId}" });
            }

            // Get the order (this also verifies user ownership)
            var order = await _mongoOrderService.GetOrderByMongoIdAsync(orderId, mongoUserId);
            if (order == null)
            {
                return NotFound(new { message = $"Order {orderId} not found" });
            }

            // Verify order is delivered (can download invoices only for delivered orders)
            if (order.Status != "Delivered")
            {
                return BadRequest(new { 
                    message = $"Invoice can only be downloaded for delivered orders. Current status: {order.Status}" 
                });
            }

            // Inject and use InvoiceService to generate PDF
            var invoiceService = HttpContext.RequestServices.GetService(typeof(IInvoiceService)) as IInvoiceService;
            if (invoiceService == null)
            {
                return StatusCode(500, new { message = "Invoice service not available" });
            }

            var invoicePdf = await invoiceService.GetInvoiceAsPdfAsync(orderId);
            if (invoicePdf == null || invoicePdf.Length < 4 ||
                invoicePdf[0] != 0x25 || invoicePdf[1] != 0x50 || invoicePdf[2] != 0x44 || invoicePdf[3] != 0x46)
            {
                return StatusCode(500, new { message = "Generated invoice is not a valid PDF" });
            }

            // Return as downloadable PDF file
            var fileName = $"Invoice-{order.OrderNumber}.pdf";
            return File(invoicePdf, "application/pdf", fileName);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (System.UnauthorizedAccessException)
        {
            return Forbid();
        }
        catch (System.Exception ex)
        {
            return StatusCode(500, new { 
                message = "An error occurred while generating the invoice",
                error = ex.Message
            });
        }
    }

    /// <summary>
    /// Get MongoDB User ID from JWT claims
    /// Returns MongoDB ObjectId string (24 hex characters)
    /// </summary>
    private string GetMongoUserId()
    {
        // Try NameIdentifier claim (most common)
        var userIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim != null && !string.IsNullOrWhiteSpace(userIdClaim.Value))
        {
            System.Console.WriteLine($"✅ Found User ID in NameIdentifier claim: {userIdClaim.Value}");
            return userIdClaim.Value;
        }

        // Try "sub" claim (JWT standard)
        userIdClaim = User.FindFirst("sub");
        if (userIdClaim != null && !string.IsNullOrWhiteSpace(userIdClaim.Value))
        {
            System.Console.WriteLine($"✅ Found User ID in 'sub' claim: {userIdClaim.Value}");
            return userIdClaim.Value;
        }

        // Try "userId" claim (custom)
        userIdClaim = User.FindFirst("userId");
        if (userIdClaim != null && !string.IsNullOrWhiteSpace(userIdClaim.Value))
        {
            System.Console.WriteLine($"✅ Found User ID in 'userId' claim: {userIdClaim.Value}");
            return userIdClaim.Value;
        }

        // Try "nameid" claim (alternative)
        userIdClaim = User.FindFirst("nameid");
        if (userIdClaim != null && !string.IsNullOrWhiteSpace(userIdClaim.Value))
        {
            System.Console.WriteLine($"✅ Found User ID in 'nameid' claim: {userIdClaim.Value}");
            return userIdClaim.Value;
        }

        System.Console.WriteLine($"❌ User ID not found in any JWT claim!");
        System.Console.WriteLine($"Available claims:");
        foreach (var claim in User.Claims)
        {
            System.Console.WriteLine($"   {claim.Type}: {claim.Value}");
        }

        throw new UnauthorizedAccessException("User ID not found in token");
    }
}
}