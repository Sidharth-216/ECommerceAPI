using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Security.Claims;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Application.DTOs.Orders;

namespace ECommerceAPI.API.Controllers
{
    /// <summary>
    /// Order Controller - Manages order operations
    /// AI Agent has limited access
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class OrderController : ControllerBase
    {
        private readonly IOrderService _orderService;

        public OrderController(IOrderService orderService)
        {
            _orderService = orderService;
        }

        /// <summary>
        /// Confirm order (create from cart) - AI AGENT ACCESSIBLE
        /// </summary>
        [HttpPost("confirm")]
        public async Task<ActionResult<OrderDto>> ConfirmOrder(
            [FromBody] CreateOrderDto createOrderDto)
        {
            var userId = GetUserId();
            var order = await _orderService.CreateOrderAsync(userId, createOrderDto);
            return Ok(order);
        }

        /// <summary>
        /// Get order history - AI AGENT ACCESSIBLE
        /// </summary>
        [HttpGet("history")]
        public async Task<ActionResult<IEnumerable<OrderDto>>> GetOrderHistory()
        {
            var userId = GetUserId();
            var orders = await _orderService.GetUserOrdersAsync(userId);
            return Ok(orders);
        }

        /// <summary>
        /// Get specific order details - NOT directly accessible by agent
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<OrderDto>> GetOrderById(int id)
        {
            var userId = GetUserId();
            try
            {
                var order = await _orderService.GetOrderByIdAsync(id, userId);
                return Ok(order);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid();
            }
        }

        /// <summary>
        /// Cancel order
        /// </summary>
        [HttpPost("{id}/cancel")]
        public async Task<ActionResult> CancelOrder(int id)
        {
            var userId = GetUserId();
            try
            {
                await _orderService.CancelOrderAsync(id, userId);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }

        private int GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            return int.Parse(userIdClaim.Value);
        }
    }
}