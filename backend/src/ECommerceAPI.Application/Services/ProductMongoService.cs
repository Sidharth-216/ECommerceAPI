// ─────────────────────────────────────────────────────────────────
// FILE: ECommerceAPI.Application/Services/ProductMongoService.cs
// CHANGES:
//   1. CreateAsync — resolves CategoryInfo from CategoryName string
//      (admin path) OR CategoryId (legacy path). Specifications is
//      no longer abused as a category carrier.
//   2. UpdateAsync — same resolution logic for category.
//   3. DeleteAsync — returns bool as before (no behaviour change for
//      customer; soft-delete preserved).
//   4. GetAllAsync — filters out soft-deleted products so they don't
//      appear in the admin product list after deletion.
// Customer-facing GetAll / Search / Suggest are NOT changed.
// ─────────────────────────────────────────────────────────────────

using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Products;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Domain.Entities.Mongo;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;
using Microsoft.Extensions.Logging;

namespace ECommerceAPI.Application.Services
{
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

        // ── READ ────────────────────────────────────────────────────────

        /// <summary>
        /// Returns only active products (soft-deleted ones are excluded).
        /// Both admin inventory and customer product page use this.
        /// </summary>
        public async Task<IEnumerable<ProductMongo>> GetAllAsync()
        {
            _logger.LogInformation("📦 [ProductMongoService] GetAllAsync");
            var all = await _repo.GetAllAsync();

            // Filter out soft-deleted items (IsActive == false).
            // Documents that pre-date the IsActive field (null) are treated as active.
            return all.Where(p => p.IsActive != false);
        }

        public async Task<PagedProductsResponseDto> GetPageAsync(int page, int pageSize)
        {
            var safePage = page < 1 ? 1 : page;
            var safePageSize = pageSize < 1 ? 24 : Math.Min(pageSize, 100);

            var (items, totalCount) = await _repo.GetPageAsync(safePage, safePageSize);
            var totalPages = (int)Math.Ceiling(totalCount / (double)safePageSize);

            return new PagedProductsResponseDto
            {
                Items = items,
                Page = safePage,
                PageSize = safePageSize,
                TotalCount = totalCount,
                TotalPages = totalPages
            };
        }

        public Task<ProductMongo> GetByIdAsync(string id)
        {
            _logger.LogInformation("🔍 [ProductMongoService] GetByIdAsync: {Id}", id);
            return _repo.GetByIdAsync(id);
        }

        public Task<IEnumerable<ProductMongo>> SearchAsync(ProductSearchDto dto)
        {
            _logger.LogInformation("🔍 [ProductMongoService] SearchAsync: {Query}", dto?.Query);
            return _repo.SearchAsync(dto.Query, dto.CategoryId, dto.MinPrice, dto.MaxPrice, dto.Brand);
        }

        public Task<IEnumerable<ProductMongo>> SuggestAsync(string query)
        {
            _logger.LogInformation("💡 [ProductMongoService] SuggestAsync: {Query}", query);
            return _repo.GetSuggestionsAsync(query);
        }

        // ── WRITE ───────────────────────────────────────────────────────

        /// <summary>
        /// Admin: Create a new product.
        /// Category resolution priority:
        ///   1. dto.CategoryName  (string sent by admin UI, e.g. "Electronics")
        ///   2. dto.Specifications (old hack — kept for backward compat)
        ///   3. dto.CategoryId    (numeric, legacy)
        ///   4. "Uncategorized"   (fallback)
        /// </summary>
        public async Task<ProductMongo> CreateAsync(ProductCreateDto dto)
        {
            try
            {
                _logger.LogInformation("➕ [ProductMongoService] CreateAsync: {Name}", dto.Name);

                var categoryInfo = ResolveCategoryInfo(dto);

                var product = new ProductMongo
                {
                    Name        = dto.Name?.Trim() ?? "Unnamed Product",
                    Description = dto.Description?.Trim() ?? "",
                    Price       = dto.Price,
                    Brand       = dto.Brand?.Trim() ?? "",
                    ImageUrl    = dto.ImageUrl?.Trim() ?? "",
                    StockQuantity = dto.StockQuantity,
                    Category    = categoryInfo,
                    IsActive    = true,
                    CreatedAt   = DateTime.UtcNow,
                    UpdatedAt   = DateTime.UtcNow
                };

                var result = await _repo.AddAsync(product);
                _logger.LogInformation("✅ Product created: {Id}", result.Id);
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ CreateAsync failed for: {Name}", dto?.Name);
                throw;
            }
        }

        /// <summary>
        /// Admin: Update an existing product.
        /// Same category resolution logic as CreateAsync.
        /// </summary>
        public async Task<bool> UpdateAsync(string id, ProductCreateDto dto)
        {
            try
            {
                _logger.LogInformation("✏️ [ProductMongoService] UpdateAsync: {Id}", id);

                var product = await _repo.GetByIdAsync(id);
                if (product == null)
                {
                    _logger.LogWarning("⚠️ Product not found: {Id}", id);
                    return false;
                }

                // Apply updates — only overwrite if the new value is non-null/non-empty
                product.Name          = dto.Name?.Trim() is { Length: > 0 } n ? n : product.Name;
                product.Description   = dto.Description?.Trim() ?? product.Description;
                product.Price         = dto.Price > 0 ? dto.Price : product.Price;
                product.Brand         = dto.Brand?.Trim() is { Length: > 0 } b ? b : product.Brand;
                product.StockQuantity = dto.StockQuantity >= 0 ? dto.StockQuantity : product.StockQuantity;
                product.ImageUrl      = dto.ImageUrl?.Trim() ?? product.ImageUrl;
                product.UpdatedAt     = DateTime.UtcNow;

                // Resolve category (only update if something meaningful was provided)
                var newCategory = ResolveCategoryInfo(dto);
                if (newCategory != null)
                {
                    product.Category = newCategory;
                }

                var success = await _repo.UpdateAsync(id, product);

                if (success)
                    _logger.LogInformation("✅ Product updated: {Id}", id);
                else
                    _logger.LogWarning("⚠️ Product update returned no modifications: {Id}", id);

                return success;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ UpdateAsync failed for: {Id}", id);
                throw;
            }
        }

        /// <summary>
        /// Admin: Soft-delete a product.
        /// The repository sets IsActive = false; GetAllAsync filters these out.
        /// </summary>
        public async Task<bool> DeleteAsync(string id)
        {
            try
            {
                _logger.LogInformation("🗑️ [ProductMongoService] DeleteAsync: {Id}", id);
                var success = await _repo.DeleteAsync(id);

                if (success)
                    _logger.LogInformation("✅ Product soft-deleted: {Id}", id);
                else
                    _logger.LogWarning("⚠️ DeleteAsync — product not found or already deleted: {Id}", id);

                return success;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ DeleteAsync failed for: {Id}", id);
                throw;
            }
        }

        // ── HELPERS ─────────────────────────────────────────────────────

        /// <summary>
        /// Resolves a CategoryInfo from the DTO using the priority:
        ///   CategoryName → Specifications → CategoryId → null
        /// Returns null only when nothing meaningful is available
        /// (caller preserves existing category in that case).
        /// </summary>
        private static CategoryInfo ResolveCategoryInfo(ProductCreateDto dto)
        {
            // Priority 1: explicit CategoryName string from admin UI
            if (!string.IsNullOrWhiteSpace(dto.CategoryName))
            {
                return new CategoryInfo
                {
                    Id   = dto.CategoryId, // may be 0 — that's fine
                    Name = dto.CategoryName.Trim()
                };
            }

            // Priority 2: old Specifications hack (backward compat)
            if (!string.IsNullOrWhiteSpace(dto.Specifications))
            {
                return new CategoryInfo
                {
                    Id   = dto.CategoryId,
                    Name = dto.Specifications.Trim()
                };
            }

            // Priority 3: numeric CategoryId only (no name available)
            if (dto.CategoryId > 0)
            {
                return new CategoryInfo
                {
                    Id   = dto.CategoryId,
                    Name = "Uncategorized"
                };
            }

            // Nothing provided — return null so caller can decide
            return null;
        }
    }
}