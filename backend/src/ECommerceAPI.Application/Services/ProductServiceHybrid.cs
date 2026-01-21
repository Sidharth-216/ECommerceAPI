using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using ECommerceAPI.Application.DTOs.Products;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Domain.Entities;
using ECommerceAPI.Domain.Entities.Mongo;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Application.Services
{
    public class ProductServiceHybrid : IProductService
    {
        private readonly IProductRepository _sqlRepository;
        private readonly IProductMongoRepository _mongoRepository;
        private readonly IConfiguration _configuration;
        private readonly bool _useMongo;
        private readonly bool _dualWrite;

        public ProductServiceHybrid(
            IProductRepository sqlRepository,
            IProductMongoRepository mongoRepository,
            IConfiguration configuration)
        {
            _sqlRepository = sqlRepository;
            _mongoRepository = mongoRepository;
            _configuration = configuration;
            
            // Feature flags to control migration
            _useMongo = _configuration.GetValue<bool>("FeatureFlags:UseMongoForProducts");
            _dualWrite = _configuration.GetValue<bool>("FeatureFlags:DualWriteProducts");
        }

        public async Task<IEnumerable<ProductDto>> GetAllProductsAsync()
        {
            if (_useMongo)
            {
                var mongoProducts = await _mongoRepository.GetAllAsync();
                return mongoProducts.Select(MapMongoToDto);
            }
            
            var sqlProducts = await _sqlRepository.GetAllAsync();
            return sqlProducts.Select(MapSqlToDto);
        }

        public async Task<ProductDto> GetProductByIdAsync(int id)
        {
            if (_useMongo)
            {
                // Try to find by SQL ID first during migration
                var mongoProduct = await _mongoRepository.GetBySqlIdAsync(id);
                if (mongoProduct == null)
                    throw new KeyNotFoundException($"Product with ID {id} not found");
                return MapMongoToDto(mongoProduct);
            }
            
            var sqlProduct = await _sqlRepository.GetByIdAsync(id);
            if (sqlProduct == null)
                throw new KeyNotFoundException($"Product with ID {id} not found");
            
            return MapSqlToDto(sqlProduct);
        }

        public async Task<ProductDto> CreateProductAsync(ProductCreateDto createDto)
        {
            Product sqlProduct = null;
            ProductMongo mongoProduct = null;

            // Create SQL product (primary during migration)
            sqlProduct = new Product
            {
                Name = createDto.Name,
                Description = createDto.Description,
                Price = createDto.Price,
                CategoryId = createDto.CategoryId,
                ImageUrl = createDto.ImageUrl,
                StockQuantity = createDto.StockQuantity,
                Brand = createDto.Brand,
                Specifications = createDto.Specifications,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            sqlProduct = await _sqlRepository.AddAsync(sqlProduct);

            // Dual write to MongoDB if enabled
            if (_dualWrite || _useMongo)
            {
                // Fetch category info for embedding
                var category = await GetCategoryInfo(createDto.CategoryId);
                
                mongoProduct = new ProductMongo
                {
                    Name = createDto.Name,
                    Description = createDto.Description,
                    Price = createDto.Price,
                    Category = category,
                    ImageUrl = createDto.ImageUrl,
                    StockQuantity = createDto.StockQuantity,
                    Brand = createDto.Brand,
                    Specifications = ParseSpecifications(createDto.Specifications),
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    SqlId = sqlProduct.Id // Store SQL ID for reference
                };

                await _mongoRepository.AddAsync(mongoProduct);
            }

            return _useMongo && mongoProduct != null 
                ? MapMongoToDto(mongoProduct) 
                : MapSqlToDto(sqlProduct);
        }

        public async Task<ProductDto> UpdateProductAsync(int id, ProductCreateDto updateDto)
        {
            // Update SQL
            var sqlProduct = await _sqlRepository.GetByIdAsync(id);
            if (sqlProduct == null)
                throw new KeyNotFoundException($"Product with ID {id} not found");

            sqlProduct.Name = updateDto.Name;
            sqlProduct.Description = updateDto.Description;
            sqlProduct.Price = updateDto.Price;
            sqlProduct.CategoryId = updateDto.CategoryId;
            sqlProduct.ImageUrl = updateDto.ImageUrl;
            sqlProduct.StockQuantity = updateDto.StockQuantity;
            sqlProduct.Brand = updateDto.Brand;
            sqlProduct.Specifications = updateDto.Specifications;
            sqlProduct.UpdatedAt = DateTime.UtcNow;

            await _sqlRepository.UpdateAsync(sqlProduct);

            // Dual write to MongoDB
            if (_dualWrite || _useMongo)
            {
                var mongoProduct = await _mongoRepository.GetBySqlIdAsync(id);
                if (mongoProduct != null)
                {
                    var category = await GetCategoryInfo(updateDto.CategoryId);
                    
                    mongoProduct.Name = updateDto.Name;
                    mongoProduct.Description = updateDto.Description;
                    mongoProduct.Price = updateDto.Price;
                    mongoProduct.Category = category;
                    mongoProduct.ImageUrl = updateDto.ImageUrl;
                    mongoProduct.StockQuantity = updateDto.StockQuantity;
                    mongoProduct.Brand = updateDto.Brand;
                    mongoProduct.Specifications = ParseSpecifications(updateDto.Specifications);
                    mongoProduct.UpdatedAt = DateTime.UtcNow;

                    await _mongoRepository.UpdateAsync(mongoProduct.Id, mongoProduct);
                }
            }

            return MapSqlToDto(sqlProduct);
        }

        // Helper methods
        private ProductDto MapSqlToDto(Product product)
        {
            return new ProductDto
            {
                Id = product.Id,
                Name = product.Name,
                Description = product.Description,
                Price = product.Price,
                CategoryId = product.CategoryId,
                CategoryName = product.Category?.Name,
                ImageUrl = product.ImageUrl,
                StockQuantity = product.StockQuantity,
                Brand = product.Brand,
                Rating = product.Rating,
                ReviewCount = product.ReviewCount,
                Specifications = product.Specifications,
                IsAvailable = product.IsActive && product.StockQuantity > 0
            };
        }

        private ProductDto MapMongoToDto(ProductMongo product)
        {
            return new ProductDto
            {
                Id = product.SqlId ?? 0, // Return SQL ID for compatibility
                Name = product.Name,
                Description = product.Description,
                Price = product.Price,
                CategoryId = product.Category.Id,
                CategoryName = product.Category.Name,
                ImageUrl = product.ImageUrl,
                StockQuantity = product.StockQuantity,
                Brand = product.Brand,
                Rating = product.Rating,
                ReviewCount = product.ReviewCount,
                Specifications = product.Specifications?.ToString(),
                IsAvailable = product.IsActive && product.StockQuantity > 0
            };
        }

        // Stub - implement based on your Category service
        private async Task<CategoryInfo> GetCategoryInfo(int categoryId)
        {
            // Fetch from your category service/repository
            return new CategoryInfo { Id = categoryId, Name = "Category Name" };
        }

        private MongoDB.Bson.BsonDocument ParseSpecifications(string specs)
        {
            if (string.IsNullOrEmpty(specs))
                return new MongoDB.Bson.BsonDocument();
            
            try
            {
                return MongoDB.Bson.BsonDocument.Parse(specs);
            }
            catch
            {
                return new MongoDB.Bson.BsonDocument { { "raw", specs } };
            }
        }

        // Implement other interface methods...
        public async Task<IEnumerable<ProductDto>> SearchProductsAsync(ProductSearchDto searchDto)
        {
            if (_useMongo)
            {
                var products = await _mongoRepository.SearchAsync(
                    searchDto.Query, searchDto.CategoryId, 
                    searchDto.MinPrice, searchDto.MaxPrice, searchDto.Brand);
                return products.Select(MapMongoToDto);
            }
            
            var sqlProducts = await _sqlRepository.SearchAsync(
                searchDto.Query, searchDto.CategoryId,
                searchDto.MinPrice, searchDto.MaxPrice, searchDto.Brand);
            return sqlProducts.Select(MapSqlToDto);
        }

        public async Task<bool> DeleteProductAsync(int id)
        {
            var result = await _sqlRepository.DeleteAsync(id);
            
            if (_dualWrite || _useMongo)
            {
                var mongoProduct = await _mongoRepository.GetBySqlIdAsync(id);
                if (mongoProduct != null)
                {
                    await _mongoRepository.DeleteAsync(mongoProduct.Id);
                }
            }
            
            return result;
        }

        public async Task<bool> CheckStockAvailabilityAsync(int productId, int quantity)
        {
            if (_useMongo)
            {
                var product = await _mongoRepository.GetBySqlIdAsync(productId);
                return product != null && product.StockQuantity >= quantity;
            }
            
            var sqlProduct = await _sqlRepository.GetByIdAsync(productId);
            return sqlProduct != null && sqlProduct.StockQuantity >= quantity;
        }
    }
}