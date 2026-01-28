/*using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Cart;
using ECommerceAPI.Application.Interfaces;

namespace ECommerceAPI.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CartController : ControllerBase
    {
        private readonly ICartService _cartService;
        private readonly ILogger<CartController> _logger;

        public CartController(ICartService cartService, ILogger<CartController> logger)
        {
            _cartService = cartService;
            _logger = logger;
        }

        [HttpGet("user/{userId}")]
        public async Task<ActionResult<CartDto>> GetCart(int userId)
        {
            try
            {
                var cart = await _cartService.GetCartAsync(userId);
                return Ok(cart);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting cart for user {userId}");
                return StatusCode(500, new { message = "An error occurred while retrieving the cart" });
            }
        }

        [HttpPost("user/{userId}/items")]
        public async Task<ActionResult<CartDto>> AddToCart(int userId, [FromBody] AddToCartDto request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.ProductId))
                    return BadRequest(new { message = "ProductId is required" });

                if (request.Quantity <= 0)
                    return BadRequest(new { message = "Quantity must be greater than 0" });

                var cart = await _cartService.AddToCartAsync(userId, request.ProductId, request.Quantity);
                return Ok(cart);
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, $"Product {request.ProductId} not found");
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error adding product {request.ProductId} to cart for user {userId}");
                return StatusCode(500, new { message = "An error occurred while adding item to cart" });
            }
        }

        // ✅ UPDATED: productId is string now
        [HttpPut("user/{userId}/items/{productId}")]
        public async Task<ActionResult<CartDto>> UpdateQuantity(int userId, string productId, [FromBody] UpdateCartItemDto request)
        {
            try
            {
                var cart = await _cartService.UpdateQuantityAsync(userId, productId, request.Quantity);
                return Ok(cart);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating quantity for product {productId} in cart for user {userId}");
                return StatusCode(500, new { message = "An error occurred while updating cart" });
            }
        }

        // ✅ UPDATED: productId is string now
        [HttpDelete("user/{userId}/items/{productId}")]
        public async Task<IActionResult> RemoveFromCart(int userId, string productId)
        {
            try
            {
                await _cartService.RemoveFromCartAsync(userId, productId);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error removing product {productId} from cart for user {userId}");
                return StatusCode(500, new { message = "An error occurred while removing item from cart" });
            }
        }

        [HttpDelete("user/{userId}")]
        public async Task<IActionResult> ClearCart(int userId)
        {
            try
            {
                await _cartService.ClearCartAsync(userId);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error clearing cart for user {userId}");
                return StatusCode(500, new { message = "An error occurred while clearing cart" });
            }
        }
    }
}
*/

using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Cart;
using ECommerceAPI.Application.Interfaces;

namespace ECommerceAPI.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class CartController : ControllerBase
    {
        private readonly ICartService _cartService;
        private readonly ILogger<CartController> _logger;

        public CartController(ICartService cartService, ILogger<CartController> logger)
        {
            _cartService = cartService;
            _logger = logger;
        }

        /// <summary>
        /// Get cart by user ID (supports both SQL integer and MongoDB ObjectId)
        /// </summary>
        [HttpGet("user/{userId}")]
        public async Task<ActionResult<CartDto>> GetCart(string userId)
        {
            try
            {
                var cart = await _cartService.GetCartByUserIdStringAsync(userId);
                return Ok(cart);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting cart for user {userId}");
                return StatusCode(500, new { message = "An error occurred while retrieving the cart" });
            }
        }

        /// <summary>
        /// Add item to cart (supports both SQL and MongoDB)
        /// </summary>
        [HttpPost("user/{userId}/items")]
        public async Task<ActionResult<CartDto>> AddToCart(string userId, [FromBody] AddToCartDto request)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(request.ProductId))
                    return BadRequest(new { message = "ProductId is required" });

                if (request.Quantity <= 0)
                    return BadRequest(new { message = "Quantity must be greater than 0" });

                var cart = await _cartService.AddToCartByUserIdStringAsync(userId, request.ProductId, request.Quantity);
                return Ok(cart);
            }
            catch (KeyNotFoundException ex)
            {
                _logger.LogWarning(ex, $"Product {request.ProductId} not found");
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, $"Invalid operation: {ex.Message}");
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error adding product {request.ProductId} to cart for user {userId}");
                return StatusCode(500, new { message = "An error occurred while adding item to cart" });
            }
        }

        /// <summary>
        /// Update cart item quantity
        /// </summary>
        [HttpPut("user/{userId}/items/{productId}")]
        public async Task<ActionResult<CartDto>> UpdateQuantity(string userId, string productId, [FromBody] UpdateCartItemDto request)
        {
            try
            {
                var cart = await _cartService.UpdateQuantityByUserIdStringAsync(userId, productId, request.Quantity);
                return Ok(cart);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating quantity for product {productId} in cart for user {userId}");
                return StatusCode(500, new { message = "An error occurred while updating cart" });
            }
        }

        /// <summary>
        /// Remove item from cart
        /// </summary>
        [HttpDelete("user/{userId}/items/{productId}")]
        public async Task<IActionResult> RemoveFromCart(string userId, string productId)
        {
            try
            {
                await _cartService.RemoveFromCartByUserIdStringAsync(userId, productId);
                return NoContent();
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error removing product {productId} from cart for user {userId}");
                return StatusCode(500, new { message = "An error occurred while removing item from cart" });
            }
        }

        /// <summary>
        /// Clear entire cart
        /// </summary>
        [HttpDelete("user/{userId}")]
        public async Task<IActionResult> ClearCart(string userId)
        {
            try
            {
                await _cartService.ClearCartByUserIdStringAsync(userId);
                return NoContent();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error clearing cart for user {userId}");
                return StatusCode(500, new { message = "An error occurred while clearing cart" });
            }
        }
    }
}