using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Threading.Tasks;
using System.Security.Claims;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Application.DTOs.Cart;

namespace ECommerceAPI.API.Controllers
{
    /// <summary>
    /// Cart Controller - Manages shopping cart operations
    /// AI Agent has full access to these endpoints
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class CartController : ControllerBase
    {
        private readonly ICartService _cartService;

        public CartController(ICartService cartService)
        {
            _cartService = cartService;
        }

        /// <summary>
        /// Add item to cart - AI AGENT ACCESSIBLE
        /// </summary>
        [HttpPost("add")]
        public async Task<ActionResult<CartDto>> AddToCart([FromBody] AddToCartDto addDto)
        {
            var userId = GetUserId();
            var cart = await _cartService.AddToCartAsync(userId, addDto.ProductId, addDto.Quantity);
            return Ok(cart);
        }

        /// <summary>
        /// View cart - AI AGENT ACCESSIBLE
        /// </summary>
        [HttpGet("view")]
        public async Task<ActionResult<CartDto>> ViewCart()
        {
            var userId = GetUserId();
            var cart = await _cartService.GetCartAsync(userId);
            return Ok(cart);
        }

        /// <summary>
        /// Remove item from cart - AI AGENT ACCESSIBLE
        /// </summary>
        [HttpDelete("remove/{productId}")]
        public async Task<ActionResult> RemoveFromCart(int productId)
        {
            var userId = GetUserId();
            await _cartService.RemoveFromCartAsync(userId, productId);
            return NoContent();
        }

        /// <summary>
        /// Update quantity - AI AGENT ACCESSIBLE
        /// </summary>
        [HttpPut("update")]
        public async Task<ActionResult<CartDto>> UpdateQuantity(
            [FromBody] UpdateCartItemDto updateDto)
        {
            var userId = GetUserId();
            var cart = await _cartService.UpdateQuantityAsync(
                userId, updateDto.ProductId, updateDto.Quantity);
            return Ok(cart);
        }

        /// <summary>
        /// Clear cart
        /// </summary>
        [HttpDelete("clear")]
        public async Task<ActionResult> ClearCart()
        {
            var userId = GetUserId();
            await _cartService.ClearCartAsync(userId);
            return NoContent();
        }

        private int GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            return int.Parse(userIdClaim.Value);
        }
    }
}
