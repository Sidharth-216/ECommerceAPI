using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using ECommerceAPI.Application.Interfaces;

namespace ECommerceAPI.API.Controllers
{
    /// <summary>
    /// Inventory Controller - Check stock availability
    /// AI AGENT ACCESSIBLE
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class InventoryController : ControllerBase
    {
        private readonly IProductService _productService;

        public InventoryController(IProductService productService)
        {
            _productService = productService;
        }

        /// <summary>
        /// Check stock status - AI AGENT ACCESSIBLE
        /// </summary>
        [HttpGet("status/{productId}")]
        public async Task<ActionResult<object>> GetStockStatus(int productId)
        {
            try
            {
                var product = await _productService.GetProductByIdAsync(productId);
                return Ok(new
                {
                    productId = product.Id,
                    productName = product.Name,
                    stockQuantity = product.StockQuantity,
                    isAvailable = product.IsAvailable
                });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
        }
    }
}
