using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Products;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Domain.Entities.Mongo;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;
using Microsoft.Extensions.Logging;

namespace ECommerceAPI.Application.Services
{
    /// <summary>
    /// Product MongoDB Service - FIXED with proper category handling
    /// </summary>
    public class ProductMongoService : IProductMongoService
    {
        private readonly IProductMongoRepository _repo;
        private readonly ILogger<ProductMongoService> _logger;

        public ProductMongoService(
            IProductMongoRepository repo,
            ILogger<ProductMongoService> logger)
        {
            _repo = repo;
            _logger = logger;
        }

        public Task<IEnumerable<ProductMongo>> GetAllAsync()
        {
            _logger.LogInformation("📦 [ProductMongoService] Getting all products");
            return _repo.GetAllAsync();
        }

        public Task<ProductMongo> GetByIdAsync(string id)
        {
            _logger.LogInformation($"🔍 [ProductMongoService] Getting product by ID: {id}");
            return _repo.GetByIdAsync(id);
        }

        public async Task<ProductMongo> CreateAsync(ProductCreateDto dto)
        {
            try
            {
                _logger.LogInformation($"➕ [ProductMongoService] Creating product: {dto.Name}");

                // Parse category - handle both string category names and CategoryInfo objects
                CategoryInfo categoryInfo = null;

                // If CategoryId is provided, create CategoryInfo
                if (dto.CategoryId > 0)
                {
                    categoryInfo = new CategoryInfo
                    {
                        Id = dto.CategoryId,
                        Name = dto.Brand ?? "Uncategorized" // Use Brand as fallback or fetch from DB
                    };
                }
                // If there's a category string in Specifications, try to parse it
                else if (!string.IsNullOrEmpty(dto.Specifications))
                {
                    // Assuming category name is passed in Specifications as a workaround
                    categoryInfo = new CategoryInfo
                    {
                        Id = 0, // Default ID
                        Name = dto.Specifications
                    };
                }

                var product = new ProductMongo
                {
                    Name = dto.Name ?? "Unnamed Product",
                    Description = dto.Description ?? "",
                    Price = dto.Price,
                    Brand = dto.Brand ?? "",
                    ImageUrl = dto.ImageUrl ?? "",
                    StockQuantity = dto.StockQuantity,
                    Category = categoryInfo,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow,
                    IsActive = true
                };

                var result = await _repo.AddAsync(product);
                _logger.LogInformation($"✅ Product created with ID: {result.Id}");
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error creating product: {dto?.Name}");
                throw;
            }
        }

        public async Task<bool> UpdateAsync(string id, ProductCreateDto dto)
        {
            try
            {
                _logger.LogInformation($"✏️ [ProductMongoService] Updating product: {id}");

                var product = await _repo.GetByIdAsync(id);
                if (product == null)
                {
                    _logger.LogWarning($"⚠️ Product not found: {id}");
                    return false;
                }

                // Update fields
                product.Name = dto.Name ?? product.Name;
                product.Description = dto.Description ?? product.Description;
                product.Price = dto.Price;
                product.Brand = dto.Brand ?? product.Brand;
                product.StockQuantity = dto.StockQuantity;
                product.ImageUrl = dto.ImageUrl ?? product.ImageUrl;
                product.UpdatedAt = DateTime.UtcNow;

                // Update category if provided
                if (dto.CategoryId > 0)
                {
                    product.Category = new CategoryInfo
                    {
                        Id = dto.CategoryId,
                        Name = dto.Brand ?? product.Category?.Name ?? "Uncategorized"
                    };
                }
                else if (!string.IsNullOrEmpty(dto.Specifications))
                {
                    // Handle category name passed in Specifications
                    if (product.Category == null)
                    {
                        product.Category = new CategoryInfo { Id = 0, Name = dto.Specifications };
                    }
                    else
                    {
                        product.Category.Name = dto.Specifications;
                    }
                }

                var success = await _repo.UpdateAsync(id, product);
                
                if (success)
                {
                    _logger.LogInformation($"✅ Product updated: {id}");
                }
                else
                {
                    _logger.LogWarning($"⚠️ Product update failed: {id}");
                }

                return success;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error updating product: {id}");
                throw;
            }
        }

        public async Task<bool> DeleteAsync(string id)
        {
            try
            {
                _logger.LogInformation($"🗑️ [ProductMongoService] Deleting product: {id}");
                var success = await _repo.DeleteAsync(id);
                
                if (success)
                {
                    _logger.LogInformation($"✅ Product deleted: {id}");
                }
                else
                {
                    _logger.LogWarning($"⚠️ Product delete failed: {id}");
                }

                return success;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error deleting product: {id}");
                throw;
            }
        }

        public Task<IEnumerable<ProductMongo>> SearchAsync(ProductSearchDto dto)
        {
            _logger.LogInformation($"🔍 [ProductMongoService] Searching products: {dto?.Query}");
            return _repo.SearchAsync(dto.Query, dto.CategoryId, dto.MinPrice, dto.MaxPrice, dto.Brand);
        }

        public Task<IEnumerable<ProductMongo>> SuggestAsync(string query)
        {
            _logger.LogInformation($"💡 [ProductMongoService] Getting suggestions: {query}");
            return _repo.GetSuggestionsAsync(query);
        }
    }
}