using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Application.DTOs.Cart;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace ECommerceAPI.API.Controllers
{
    /// <summary>
    /// Pure MongoDB Cart Controller - NO SQL DEPENDENCIES
    /// Handles shopping cart operations using MongoDB storage only
    /// </summary>
    [ApiController]
    [Route("api/mongo/cart")]
    [Authorize]
    public class MongoCartController : ControllerBase
    {
        private readonly IMongoCartService _cartService;

        public MongoCartController(IMongoCartService cartService)
        {
            _cartService = cartService;
        }

        /// <summary>
        /// Get user's cart
        /// GET /api/mongo/cart/user/{userId}
        /// </summary>
        [HttpGet("user/{userId}")]
        public async Task<IActionResult> GetCart(string userId)
        {
            Console.WriteLine($"📋 [MongoCartController] GET /api/mongo/cart/user/{userId}");
            
            try
            {
                var cart = await _cartService.GetCartAsync(userId);
                
                Console.WriteLine($"✅ Cart retrieved successfully");
                Console.WriteLine($"   Cart ID: {cart.MongoCartId}");
                Console.WriteLine($"   Items: {cart.TotalItems}");
                Console.WriteLine($"   Total Amount: ₹{cart.TotalAmount}");
                
                return Ok(cart);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error getting cart: {ex.Message}");
                return NotFound(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Add item to cart
        /// POST /api/mongo/cart/user/{userId}/items
        /// Body: { "productId": "507f1f77bcf86cd799439011", "quantity": 2 }
        /// </summary>
        [HttpPost("user/{userId}/items")]
        public async Task<IActionResult> AddToCart(string userId, [FromBody] AddToCartDto dto)
        {
            Console.WriteLine("═══════════════════════════════════════════════════════");
            Console.WriteLine($"➕ [MongoCartController] POST /api/mongo/cart/user/{userId}/items");
            Console.WriteLine($"   ProductId: {dto.ProductId}");
            Console.WriteLine($"   Quantity: {dto.Quantity}");
            Console.WriteLine("═══════════════════════════════════════════════════════");
            
            try
            {
                // Validate input
                if (string.IsNullOrWhiteSpace(dto.ProductId))
                {
                    Console.WriteLine("❌ ProductId is required");
                    return BadRequest(new { message = "ProductId is required" });
                }
                
                if (dto.Quantity <= 0)
                {
                    Console.WriteLine("❌ Quantity must be greater than 0");
                    return BadRequest(new { message = "Quantity must be greater than 0" });
                }
                
                var cart = await _cartService.AddItemAsync(userId, dto.ProductId, dto.Quantity);
                
                Console.WriteLine($"✅ Item added to cart successfully");
                Console.WriteLine($"   Cart ID: {cart.MongoCartId}");
                Console.WriteLine($"   Total Items: {cart.TotalItems}");
                Console.WriteLine($"   Total Amount: ₹{cart.TotalAmount}");
                Console.WriteLine("═══════════════════════════════════════════════════════");
                
                return Ok(cart);
            }
            catch (ArgumentException ex)
            {
                Console.WriteLine($"❌ ArgumentException: {ex.Message}");
                Console.WriteLine("═══════════════════════════════════════════════════════");
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                Console.WriteLine($"❌ InvalidOperationException: {ex.Message}");
                Console.WriteLine("═══════════════════════════════════════════════════════");
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                Console.WriteLine($"❌ KeyNotFoundException: {ex.Message}");
                Console.WriteLine("═══════════════════════════════════════════════════════");
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Unexpected error: {ex.Message}");
                Console.WriteLine($"   StackTrace: {ex.StackTrace}");
                Console.WriteLine("═══════════════════════════════════════════════════════");
                return StatusCode(500, new { message = "An error occurred while adding item to cart", error = ex.Message });
            }
        }

        /// <summary>
        /// Update cart item quantity
        /// PUT /api/mongo/cart/user/{userId}/items/{productId}
        /// Body: { "quantity": 3 }
        /// </summary>
        [HttpPut("user/{userId}/items/{productId}")]
        public async Task<IActionResult> UpdateCartItem(string userId, string productId, [FromBody] UpdateCartItemDto dto)
        {
            Console.WriteLine("═══════════════════════════════════════════════════════");
            Console.WriteLine($"✏️ [MongoCartController] PUT /api/mongo/cart/user/{userId}/items/{productId}");
            Console.WriteLine($"   New Quantity: {dto.Quantity}");
            Console.WriteLine("═══════════════════════════════════════════════════════");
            
            try
            {
                // Validate input
                if (dto.Quantity <= 0)
                {
                    Console.WriteLine("❌ Quantity must be greater than 0");
                    return BadRequest(new { message = "Quantity must be greater than 0" });
                }
                
                var cart = await _cartService.UpdateItemQuantityAsync(userId, productId, dto.Quantity);
                
                Console.WriteLine($"✅ Item quantity updated successfully");
                Console.WriteLine($"   Total Items: {cart.TotalItems}");
                Console.WriteLine($"   Total Amount: ₹{cart.TotalAmount}");
                Console.WriteLine("═══════════════════════════════════════════════════════");
                
                return Ok(cart);
            }
            catch (ArgumentException ex)
            {
                Console.WriteLine($"❌ ArgumentException: {ex.Message}");
                Console.WriteLine("═══════════════════════════════════════════════════════");
                return BadRequest(new { message = ex.Message });
            }
            catch (KeyNotFoundException ex)
            {
                Console.WriteLine($"❌ KeyNotFoundException: {ex.Message}");
                Console.WriteLine("═══════════════════════════════════════════════════════");
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                Console.WriteLine($"❌ InvalidOperationException: {ex.Message}");
                Console.WriteLine("═══════════════════════════════════════════════════════");
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Unexpected error: {ex.Message}");
                Console.WriteLine("═══════════════════════════════════════════════════════");
                return StatusCode(500, new { message = "An error occurred while updating cart item", error = ex.Message });
            }
        }

        /// <summary>
        /// Remove item from cart
        /// DELETE /api/mongo/cart/user/{userId}/items/{productId}
        /// </summary>
        [HttpDelete("user/{userId}/items/{productId}")]
        public async Task<IActionResult> RemoveFromCart(string userId, string productId)
        {
            Console.WriteLine("═══════════════════════════════════════════════════════");
            Console.WriteLine($"🗑️ [MongoCartController] DELETE /api/mongo/cart/user/{userId}/items/{productId}");
            Console.WriteLine("═══════════════════════════════════════════════════════");
            
            try
            {
                var cart = await _cartService.RemoveItemAsync(userId, productId);
                
                Console.WriteLine($"✅ Item removed from cart successfully");
                Console.WriteLine($"   Remaining Items: {cart.TotalItems}");
                Console.WriteLine($"   Total Amount: ₹{cart.TotalAmount}");
                Console.WriteLine("═══════════════════════════════════════════════════════");
                
                return Ok(cart);
            }
            catch (KeyNotFoundException ex)
            {
                Console.WriteLine($"❌ KeyNotFoundException: {ex.Message}");
                Console.WriteLine("═══════════════════════════════════════════════════════");
                return NotFound(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Unexpected error: {ex.Message}");
                Console.WriteLine("═══════════════════════════════════════════════════════");
                return StatusCode(500, new { message = "An error occurred while removing cart item", error = ex.Message });
            }
        }

        /// <summary>
        /// Clear entire cart
        /// DELETE /api/mongo/cart/user/{userId}
        /// </summary>
        [HttpDelete("user/{userId}")]
        public async Task<IActionResult> ClearCart(string userId)
        {
            Console.WriteLine("═══════════════════════════════════════════════════════");
            Console.WriteLine($"🧹 [MongoCartController] DELETE /api/mongo/cart/user/{userId}");
            Console.WriteLine("═══════════════════════════════════════════════════════");
            
            try
            {
                await _cartService.ClearCartAsync(userId);
                
                Console.WriteLine($"✅ Cart cleared successfully");
                Console.WriteLine("═══════════════════════════════════════════════════════");
                
                return Ok(new { message = "Cart cleared successfully" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error clearing cart: {ex.Message}");
                Console.WriteLine("═══════════════════════════════════════════════════════");
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Get current user's cart (using JWT token)
        /// GET /api/mongo/cart/me
        /// </summary>
        [HttpGet("me")]
        public async Task<IActionResult> GetMyCart()
        {
            try
            {
                var userId = GetUserIdFromToken();
                
                Console.WriteLine($"📋 [MongoCartController] GET /api/mongo/cart/me");
                Console.WriteLine($"   User ID from token: {userId}");
                
                var cart = await _cartService.GetCartAsync(userId);
                
                Console.WriteLine($"✅ Cart retrieved: {cart.TotalItems} items, Total: ₹{cart.TotalAmount}");
                
                return Ok(cart);
            }
            catch (UnauthorizedAccessException ex)
            {
                Console.WriteLine($"❌ Unauthorized: {ex.Message}");
                return Unauthorized(new { message = "User ID not found in token" });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error getting cart: {ex.Message}");
                return StatusCode(500, new { message = "An error occurred while fetching cart", error = ex.Message });
            }
        }

        /// <summary>
        /// Get MongoDB User ID from JWT token
        /// </summary>
        private string GetUserIdFromToken()
        {
            // Try NameIdentifier claim (most common)
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim != null && !string.IsNullOrWhiteSpace(userIdClaim.Value))
            {
                return userIdClaim.Value;
            }

            // Try "sub" claim (JWT standard)
            userIdClaim = User.FindFirst("sub");
            if (userIdClaim != null && !string.IsNullOrWhiteSpace(userIdClaim.Value))
            {
                return userIdClaim.Value;
            }

            // Try "userId" claim (custom)
            userIdClaim = User.FindFirst("userId");
            if (userIdClaim != null && !string.IsNullOrWhiteSpace(userIdClaim.Value))
            {
                return userIdClaim.Value;
            }

            // Try "nameid" claim (alternative)
            userIdClaim = User.FindFirst("nameid");
            if (userIdClaim != null && !string.IsNullOrWhiteSpace(userIdClaim.Value))
            {
                return userIdClaim.Value;
            }

            throw new UnauthorizedAccessException("User ID not found in token");
        }
    }
}