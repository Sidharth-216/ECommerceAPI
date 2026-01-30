using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Security.Claims;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Application.DTOs.Orders;
using ECommerceAPI.Application.Services;

namespace ECommerceAPI.API.Controllers
{
    /// <summary>
    /// Order Controller - Manages order operations (Hybrid: SQL + MongoDB)
    /// AI Agent has limited access
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class OrderController : ControllerBase
    {
        private readonly IOrderService _orderService;
        private readonly HybridOrderService _hybridOrderService;

        public OrderController(IOrderService orderService)
        {
            _orderService = orderService;
            _hybridOrderService = orderService as HybridOrderService;
        }

        /// <summary>
        /// Confirm order (create from cart) - AI AGENT ACCESSIBLE
        /// Uses MongoDB (Hybrid) to create order
        /// </summary>
        [HttpPost("confirm")]
        public async Task<ActionResult<OrderDto>> ConfirmOrder([FromBody] CreateOrderDto createOrderDto)
        {
            var userId = int.Parse(GetUserId());
            if (_hybridOrderService == null)
                return BadRequest(new { message = "Hybrid order service not available" });

            var order = await _hybridOrderService.CreateOrderAsync(userId, createOrderDto);
            return Ok(order);
        }

        /// <summary>
        /// Get order history - AI AGENT ACCESSIBLE
        /// Returns MongoDB orders for the user
        /// </summary>
        [HttpGet("history")]
        public async Task<ActionResult<IEnumerable<OrderDto>>> GetOrderHistory()
        {
            var userId = int.Parse(GetUserId());
            if (_hybridOrderService == null)
                return BadRequest(new { message = "Hybrid order service not available" });

            var orders = await _hybridOrderService.GetUserOrdersAsync(userId);
            return Ok(orders);
        }

        /// <summary>
        /// Get specific order by SQL ID
        /// </summary>
        [HttpGet("{id:int}")]
        public async Task<ActionResult<OrderDto>> GetOrderById(int id)
        {
            var userId = int.Parse(GetUserId());
            try
            {
                var order = await _orderService.GetOrderByIdAsync(id, userId);
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
        /// Get specific order by MongoDB ID or Order Number
        /// </summary>
        [HttpGet("mongo/{identifier}")]
        public async Task<ActionResult<OrderDto>> GetOrderByIdentifier(string identifier)
        {
            var userId = int.Parse(GetUserId());
            if (_hybridOrderService == null)
                return BadRequest(new { message = "Hybrid order service not available" });

            if (string.IsNullOrWhiteSpace(identifier))
                return BadRequest(new { message = "Invalid identifier format" });

            try
            {
                var order = await _hybridOrderService.GetOrderByMongoIdAsync(identifier, userId);
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
            catch (FormatException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Cancel order by SQL ID
        /// </summary>
        [HttpPost("{id:int}/cancel")]
        public async Task<ActionResult> CancelOrder(int id)
        {
            var userId = int.Parse(GetUserId());
            try
            {
                await _orderService.CancelOrderAsync(id, userId);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Cancel order by MongoDB ID or Order Number
        /// </summary>
        [HttpPost("mongo/{identifier}/cancel")]
        public async Task<ActionResult> CancelOrderMongo(string identifier)
        {
            var userId = int.Parse(GetUserId());
            if (_hybridOrderService == null)
                return BadRequest(new { message = "Hybrid order service not available" });

            try
            {
                await _hybridOrderService.CancelOrderMongoAsync(identifier, userId);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Get the UserId from JWT claims
        /// </summary>
        private string GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null)
                throw new UnauthorizedAccessException("User ID not found in token");

            return userIdClaim.Value; // string from token
        }
    }
}
