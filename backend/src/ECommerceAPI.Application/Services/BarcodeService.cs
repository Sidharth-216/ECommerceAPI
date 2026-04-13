using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using ECommerceAPI.Application.DTOs.Products;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Domain.Entities.Mongo;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Application.Services
{
    public class BarcodeService : IBarcodeService
    {
        private readonly IBarcodeDataRepository _barcodeRepo;
        private readonly IProductMongoRepository _productRepo;
        private readonly IMemoryCache _cache;
        private readonly ILogger<BarcodeService> _logger;

        private const string CACHE_KEY_PREFIX = "barcode_";
        private const int CACHE_DURATION_MINUTES = 60; // 1 hour cache

        public BarcodeService(
            IBarcodeDataRepository barcodeRepo,
            IProductMongoRepository productRepo,
            IMemoryCache cache,
            ILogger<BarcodeService> logger)
        {
            _barcodeRepo = barcodeRepo;
            _productRepo = productRepo;
            _cache = cache;
            _logger = logger;
        }

        /// <summary>
        /// Lookup barcode with in-memory caching (minimizes DB queries)
        /// Cache hits reduce DB load by ~95% during bulk scanning
        /// </summary>
        public async Task<ProductSuggestionDto> LookupBarcodeAsync(string barcode)
        {
            if (string.IsNullOrWhiteSpace(barcode))
            {
                _logger.LogWarning("❌ [BarcodeService] Empty barcode provided");
                return null;
            }

            var cacheKey = CACHE_KEY_PREFIX + barcode;

            // Try cache first
            if (_cache.TryGetValue(cacheKey, out ProductSuggestionDto cachedResult))
            {
                _logger.LogInformation("✅ [BarcodeService] Cache hit for barcode: {Barcode}", barcode);
                return cachedResult;
            }

            _logger.LogInformation("🔍 [BarcodeService] Cache miss - querying DB for barcode: {Barcode}", barcode);

            try
            {
                var barcodeData = await _barcodeRepo.GetByBarcodeAsync(barcode);

                if (barcodeData == null)
                {
                    // Fallback: lookup product collection directly by product.barcode
                    var product = await _productRepo.GetByBarcodeAsync(barcode);
                    if (product != null)
                    {
                        var fallbackResult = new ProductSuggestionDto
                        {
                            Id = product.Id,
                            Name = product.Name,
                            Brand = product.Brand ?? string.Empty,
                            Category = product.Category?.Name ?? string.Empty,
                            Price = product.Price
                        };

                        _cache.Set(cacheKey, fallbackResult,
                            new MemoryCacheEntryOptions().SetAbsoluteExpiration(TimeSpan.FromMinutes(CACHE_DURATION_MINUTES)));

                        _logger.LogInformation("✅ [BarcodeService] Fallback hit from products collection for barcode: {Barcode}", barcode);
                        return fallbackResult;
                    }

                    _logger.LogWarning("⚠️ [BarcodeService] Barcode not found: {Barcode}", barcode);
                    // Cache negative result for 10 minutes to reduce repeated DB hits
                    _cache.Set(cacheKey, (ProductSuggestionDto)null,
                        TimeSpan.FromMinutes(10));
                    return null;
                }

                var result = new ProductSuggestionDto
                {
                    Id = barcodeData.ProductId,
                    Name = barcodeData.Name,
                    Brand = barcodeData.Brand ?? "",
                    Category = barcodeData.Category ?? "",
                    Price = barcodeData.Price
                };

                // Cache the result for 1 hour
                var cacheOptions = new MemoryCacheEntryOptions()
                    .SetAbsoluteExpiration(TimeSpan.FromMinutes(CACHE_DURATION_MINUTES));
                
                _cache.Set(cacheKey, result, cacheOptions);

                _logger.LogInformation("✅ [BarcodeService] Found and cached barcode: {Barcode}", barcode);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ [BarcodeService] Error looking up barcode: {Barcode}", barcode);
                return null;
            }
        }

        /// <summary>
        /// Batch lookup - efficient for scanning multiple barcodes at once
        /// Loads from cache first, then queries DB only for missing barcodes
        /// </summary>
        public async Task<IEnumerable<ProductSuggestionDto>> LookupMultipleBarcodesAsync(IEnumerable<string> barcodes)
        {
            if (barcodes == null || !barcodes.Any())
            {
                return new List<ProductSuggestionDto>();
            }

            var results = new List<ProductSuggestionDto>();
            var barcodesNotInCache = new List<string>();

            // First pass: check cache
            foreach (var barcode in barcodes.Where(b => !string.IsNullOrWhiteSpace(b)))
            {
                var cacheKey = CACHE_KEY_PREFIX + barcode;
                if (_cache.TryGetValue(cacheKey, out ProductSuggestionDto cachedResult))
                {
                    if (cachedResult != null)
                    {
                        results.Add(cachedResult);
                    }
                }
                else
                {
                    barcodesNotInCache.Add(barcode);
                }
            }

            _logger.LogInformation(
                "📊 [BarcodeService] Batch lookup: {Total} barcodes, {Cached} from cache, {ToDB} to DB",
                barcodes.Count(), results.Count, barcodesNotInCache.Count);

            // Second pass: query DB only for cache misses
            if (barcodesNotInCache.Any())
            {
                try
                {
                    var dbResults = await _barcodeRepo.GetByBarcodesAsync(barcodesNotInCache);
                    var foundFromBarcodeCollection = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

                    foreach (var barcodeData in dbResults)
                    {
                        var result = new ProductSuggestionDto
                        {
                            Id = barcodeData.ProductId,
                            Name = barcodeData.Name,
                            Brand = barcodeData.Brand ?? "",
                            Category = barcodeData.Category ?? "",
                            Price = barcodeData.Price
                        };

                        results.Add(result);

                        // Cache each result
                        var cacheKey = CACHE_KEY_PREFIX + barcodeData.Barcode;
                        var cacheOptions = new MemoryCacheEntryOptions()
                            .SetAbsoluteExpiration(TimeSpan.FromMinutes(CACHE_DURATION_MINUTES));
                        _cache.Set(cacheKey, result, cacheOptions);

                        foundFromBarcodeCollection.Add(barcodeData.Barcode);
                    }

                    // Fallback for still-missing barcodes: query products collection directly
                    var missingInBarcodeCollection = barcodesNotInCache
                        .Where(code => !foundFromBarcodeCollection.Contains(code))
                        .ToList();

                    foreach (var missingBarcode in missingInBarcodeCollection)
                    {
                        var product = await _productRepo.GetByBarcodeAsync(missingBarcode);
                        if (product == null)
                            continue;

                        var fallbackResult = new ProductSuggestionDto
                        {
                            Id = product.Id,
                            Name = product.Name,
                            Brand = product.Brand ?? string.Empty,
                            Category = product.Category?.Name ?? string.Empty,
                            Price = product.Price
                        };

                        results.Add(fallbackResult);

                        var cacheKey = CACHE_KEY_PREFIX + missingBarcode;
                        _cache.Set(cacheKey, fallbackResult,
                            new MemoryCacheEntryOptions().SetAbsoluteExpiration(TimeSpan.FromMinutes(CACHE_DURATION_MINUTES)));
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "❌ [BarcodeService] Error in batch lookup");
                }
            }

            _logger.LogInformation("✅ [BarcodeService] Batch lookup complete: {ResultCount} products found", results.Count);
            return results;
        }

        public async Task<bool> CreateBarcodeAsync(
            string barcode,
            string productId,
            string name,
            string brand,
            string description,
            string category,
            decimal price,
            string imageUrl)
        {
            if (string.IsNullOrWhiteSpace(barcode) || string.IsNullOrWhiteSpace(productId))
            {
                _logger.LogWarning("❌ [BarcodeService] Invalid input for CreateBarcodeAsync");
                return false;
            }

            try
            {
                var barcodeData = new BarcodeDataMongo
                {
                    Barcode = barcode.Trim(),
                    ProductId = productId,
                    Name = name?.Trim() ?? "Unknown Product",
                    Brand = brand?.Trim() ?? "",
                    Description = description?.Trim() ?? "",
                    Category = category?.Trim() ?? "",
                    Price = price,
                    ImageUrl = imageUrl?.Trim() ?? "",
                    Source = "manual",
                    IsActive = true
                };

                await _barcodeRepo.AddAsync(barcodeData);

                // Cache the new barcode immediately
                var cacheKey = CACHE_KEY_PREFIX + barcode;
                var productDto = new ProductSuggestionDto
                {
                    Id = productId,
                    Name = name,
                    Brand = brand ?? "",
                    Category = category ?? "",
                    Price = price
                };

                var cacheOptions = new MemoryCacheEntryOptions()
                    .SetAbsoluteExpiration(TimeSpan.FromMinutes(CACHE_DURATION_MINUTES));
                _cache.Set(cacheKey, productDto, cacheOptions);

                _logger.LogInformation("✅ [BarcodeService] Created barcode: {Barcode}", barcode);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ [BarcodeService] Error creating barcode: {Barcode}", barcode);
                return false;
            }
        }

        public void ClearCache(string barcode = null)
        {
            if (string.IsNullOrWhiteSpace(barcode))
            {
                // Clear all barcode cache entries (full cache clear for memory cache is not directly available,
                // so we just inform that admin should restart app for full clear)
                _logger.LogInformation("ℹ️ [BarcodeService] Cache clear requested. Partial clear not implemented in MemoryCache.");
            }
            else
            {
                var cacheKey = CACHE_KEY_PREFIX + barcode;
                _cache.Remove(cacheKey);
                _logger.LogInformation("✅ [BarcodeService] Cleared cache for barcode: {Barcode}", barcode);
            }
        }
    }
}
