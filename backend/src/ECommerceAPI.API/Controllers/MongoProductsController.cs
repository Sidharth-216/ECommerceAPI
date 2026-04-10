// ─────────────────────────────────────────────────────────────────
// FILE: ECommerceAPI.API/Controllers/MongoProductsController.cs
// CHANGES:
//   1. GET  (public)  — no auth needed, customers + admin both use it
//   2. POST/PUT/DELETE — now require [Authorize(Roles = "Admin")]
//   3. Proper HTTP status codes: 201 Created, 404 Not Found, 204 No Content
//   4. Semantic search endpoint wired up cleanly
// Customer GET routes are completely unchanged in behaviour.
// ─────────────────────────────────────────────────────────────────

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System;
using System.Threading.Tasks;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Application.DTOs.Products;

namespace ECommerceAPI.API.Controllers
{
    [ApiController]
    [Route("api/mongo/products")]
    public class MongoProductsController : ControllerBase
    {
        private readonly IProductMongoService _service;

        public MongoProductsController(IProductMongoService service)
        {
            _service = service;
        }

        // ── PUBLIC (customers + admin) ───────────────────────────────

        /// <summary>GET /api/mongo/products — all active products</summary>
        [HttpGet]
        [AllowAnonymous]
        [ResponseCache(Duration = 60, Location = ResponseCacheLocation.Any)]
        public async Task<IActionResult> GetAll()
        {
            try
            {
                var products = await _service.GetAllAsync();
                return Ok(products);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to retrieve products", error = ex.Message });
            }
        }

        /// <summary>
        /// GET /api/mongo/products/paged?page=1&pageSize=24
        /// Paginated active products for faster storefront rendering.
        /// </summary>
        [HttpGet("paged")]
        [AllowAnonymous]
        [ResponseCache(Duration = 30, Location = ResponseCacheLocation.Any, VaryByQueryKeys = new[] { "page", "pageSize" })]
        public async Task<IActionResult> GetPaged([FromQuery] int page = 1, [FromQuery] int pageSize = 24)
        {
            try
            {
                var paged = await _service.GetPageAsync(page, pageSize);
                return Ok(paged);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to retrieve paged products", error = ex.Message });
            }
        }

        /// <summary>GET /api/mongo/products/{id}</summary>
        [HttpGet("{id}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetById(string id)
        {
            try
            {
                var product = await _service.GetByIdAsync(id);
                if (product == null)
                    return NotFound(new { message = $"Product {id} not found" });

                return Ok(product);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to retrieve product", error = ex.Message });
            }
        }

        /// <summary>
        /// GET /api/mongo/products/search?query=...&topK=...
        /// Semantic / vector search used by the customer product page.
        /// </summary>
        [HttpGet("search")]
        [AllowAnonymous]
        [EnableRateLimiting("SearchPolicy")]
        [ResponseCache(Duration = 20, Location = ResponseCacheLocation.Any, VaryByQueryKeys = new[] { "query", "categoryId", "minPrice", "maxPrice", "brand" })]
        public async Task<IActionResult> Search([FromQuery] ProductSearchDto dto)
        {
            try
            {
                var results = await _service.SearchAsync(dto);
                return Ok(results);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Search failed", error = ex.Message });
            }
        }

        /// <summary>GET /api/mongo/products/suggest?q=...</summary>
        [HttpGet("suggest")]
        [AllowAnonymous]
        [EnableRateLimiting("SearchPolicy")]
        [ResponseCache(Duration = 20, Location = ResponseCacheLocation.Any, VaryByQueryKeys = new[] { "q" })]
        public async Task<IActionResult> Suggest([FromQuery] string q)
        {
            try
            {
                var results = await _service.SuggestAsync(q);
                return Ok(results);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Suggest failed", error = ex.Message });
            }
        }

        // ── ADMIN ONLY ───────────────────────────────────────────────

        /// <summary>
        /// POST /api/mongo/products
        /// Admin creates a new product.
        /// Body: { name, brand, price, stockQuantity, categoryName, description, imageUrl }
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Create([FromBody] ProductCreateDto dto)
        {
            try
            {
                if (dto == null)
                    return BadRequest(new { message = "Request body is required" });

                if (string.IsNullOrWhiteSpace(dto.Name))
                    return BadRequest(new { message = "Product name is required" });

                if (dto.Price <= 0)
                    return BadRequest(new { message = "Price must be greater than 0" });

                var product = await _service.CreateAsync(dto);
                return CreatedAtAction(nameof(GetById), new { id = product.Id }, product);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to create product", error = ex.Message });
            }
        }

        /// <summary>
        /// PUT /api/mongo/products/{id}
        /// Admin updates an existing product.
        /// </summary>
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Update(string id, [FromBody] ProductCreateDto dto)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(id))
                    return BadRequest(new { message = "Product ID is required" });

                if (dto == null)
                    return BadRequest(new { message = "Request body is required" });

                var success = await _service.UpdateAsync(id, dto);

                if (!success)
                    return NotFound(new { message = $"Product {id} not found" });

                // Return the updated document
                var updated = await _service.GetByIdAsync(id);
                return Ok(updated);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to update product", error = ex.Message });
            }
        }

        /// <summary>
        /// DELETE /api/mongo/products/{id}
        /// Admin soft-deletes a product (sets IsActive = false).
        /// Product disappears from all listings immediately.
        /// </summary>
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Delete(string id)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(id))
                    return BadRequest(new { message = "Product ID is required" });

                var success = await _service.DeleteAsync(id);

                if (!success)
                    return NotFound(new { message = $"Product {id} not found or already deleted" });

                return Ok(new { message = "Product deleted successfully", id });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to delete product", error = ex.Message });
            }
        }
    }
}