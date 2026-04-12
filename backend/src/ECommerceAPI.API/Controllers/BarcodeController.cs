using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Linq;
using ECommerceAPI.Application.DTOs.Products;
using ECommerceAPI.Application.Interfaces;

namespace ECommerceAPI.API.Controllers
{
    [ApiController]
    [Route("api/mongo/barcodes")]
    public class BarcodeController : ControllerBase
    {
        private readonly IBarcodeService _barcodeService;
        private readonly IProductMongoService _productService;

        public BarcodeController(
            IBarcodeService barcodeService,
            IProductMongoService productService)
        {
            _barcodeService = barcodeService;
            _productService = productService;
        }

        /// <summary>
        /// GET /api/mongo/barcodes/lookup?barcode=...
        /// Lookup a single barcode (cached for performance)
        /// No auth needed - admin only, but public endpoint
        /// </summary>
        [HttpGet("lookup")]
        [AllowAnonymous]
        [EnableRateLimiting("SearchPolicy")]
        [ResponseCache(Duration = 300, Location = ResponseCacheLocation.Any, VaryByQueryKeys = new[] { "barcode" })]
        public async Task<IActionResult> LookupBarcode([FromQuery] string barcode)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(barcode))
                    return BadRequest(new { message = "Barcode cannot be empty" });

                var result = await _barcodeService.LookupBarcodeAsync(barcode.Trim());

                if (result == null)
                    return NotFound(new { message = $"Barcode '{barcode}' not found", barcode = barcode });

                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to lookup barcode", error = ex.Message });
            }
        }

        /// <summary>
        /// POST /api/mongo/barcodes/lookup-batch
        /// Batch lookup for multiple barcodes (optimized with caching)
        /// Admin only
        /// </summary>
        [HttpPost("lookup-batch")]
        [Authorize(Roles = "Admin")]
        [EnableRateLimiting("SearchPolicy")]
        public async Task<IActionResult> LookupMultipleBarcodes([FromBody] BatchBarcodeLookupDto request)
        {
            try
            {
                if (request?.Barcodes == null || !request.Barcodes.Any())
                    return BadRequest(new { message = "Barcodes list cannot be empty" });

                var validBarcodes = request.Barcodes
                    .Where(b => !string.IsNullOrWhiteSpace(b))
                    .Select(b => b.Trim())
                    .Distinct()
                    .ToList();

                if (!validBarcodes.Any())
                    return BadRequest(new { message = "No valid barcodes provided" });

                var results = await _barcodeService.LookupMultipleBarcodesAsync(validBarcodes);

                return Ok(new
                {
                    message = "Batch lookup completed",
                    requestedCount = validBarcodes.Count,
                    foundCount = results.Count(),
                    results = results
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Batch lookup failed", error = ex.Message });
            }
        }

        /// <summary>
        /// POST /api/mongo/barcodes/create
        /// Create/import barcode data (admin only)
        /// Links barcode to existing or new product
        /// </summary>
        [HttpPost("create")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateBarcode([FromBody] CreateBarcodeDto request)
        {
            try
            {
                if (request == null || string.IsNullOrWhiteSpace(request.Barcode))
                    return BadRequest(new { message = "Barcode and product details are required" });

                var success = await _barcodeService.CreateBarcodeAsync(
                    request.Barcode,
                    request.ProductId,
                    request.Name,
                    request.Brand,
                    request.Description,
                    request.Category,
                    request.Price,
                    request.ImageUrl
                );

                if (!success)
                    return BadRequest(new { message = "Failed to create barcode" });

                return Ok(new { message = "Barcode created successfully", barcode = request.Barcode });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Failed to create barcode", error = ex.Message });
            }
        }

        /// <summary>
        /// POST /api/mongo/barcodes/create-batch
        /// Bulk create/import barcodes (admin only)
        /// Optimized for efficiency
        /// </summary>
        [HttpPost("create-batch")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateBarcodesBatch([FromBody] BulkCreateBarcodesDto request)
        {
            try
            {
                if (request?.Barcodes == null || !request.Barcodes.Any())
                    return BadRequest(new { message = "Barcodes list cannot be empty" });

                var createList = request.Barcodes.ToList();
                var successCount = 0;
                var failureCount = 0;
                var errors = new List<string>();

                foreach (var barcode in createList)
                {
                    if (string.IsNullOrWhiteSpace(barcode.Barcode))
                    {
                        failureCount++;
                        errors.Add($"Barcode entry without barcode code skipped");
                        continue;
                    }

                    var success = await _barcodeService.CreateBarcodeAsync(
                        barcode.Barcode,
                        barcode.ProductId,
                        barcode.Name,
                        barcode.Brand,
                        barcode.Description,
                        barcode.Category,
                        barcode.Price,
                        barcode.ImageUrl
                    );

                    if (success)
                        successCount++;
                    else
                    {
                        failureCount++;
                        errors.Add($"Failed to create barcode: {barcode.Barcode}");
                    }
                }

                return Ok(new
                {
                    message = "Batch creation completed",
                    totalRequested = createList.Count,
                    successCount = successCount,
                    failureCount = failureCount,
                    errors = errors.Any() ? errors : null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Batch creation failed", error = ex.Message });
            }
        }

        /// <summary>
        /// POST /api/mongo/barcodes/sync-from-products
        /// Sync existing products that have barcodes into barcode collection
        /// Run this once during initialization
        /// Admin only
        /// </summary>
        [HttpPost("sync-from-products")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> SyncFromProducts()
        {
            try
            {
                var allProducts = await _productService.GetAllAsync();
                var productsWithBarcodes = allProducts
                    .Where(p => !string.IsNullOrWhiteSpace(p.Barcode))
                    .ToList();

                var successCount = 0;
                var errors = new List<string>();

                foreach (var product in productsWithBarcodes)
                {
                    var categoryStr = product.Category?.Name ?? "";

                    var success = await _barcodeService.CreateBarcodeAsync(
                        product.Barcode,
                        product.Id,
                        product.Name,
                        product.Brand ?? "",
                        product.Description ?? "",
                        categoryStr,
                        product.Price,
                        product.ImageUrl ?? ""
                    );

                    if (success)
                        successCount++;
                    else
                        errors.Add($"Failed to sync: {product.Barcode}");
                }

                return Ok(new
                {
                    message = "Sync from products completed",
                    productsWithBarcodesFound = productsWithBarcodes.Count,
                    successCount = successCount,
                    errors = errors.Any() ? errors : null
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Sync failed", error = ex.Message });
            }
        }
    }
}
