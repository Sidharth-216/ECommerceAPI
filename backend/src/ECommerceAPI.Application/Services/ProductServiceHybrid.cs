using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
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
        private readonly ILogger<ProductServiceHybrid> _logger;
        private readonly bool _useMongo;
        private readonly bool _dualWrite;

        public ProductServiceHybrid(
            IProductRepository sqlRepository,
            IProductMongoRepository mongoRepository,
            IConfiguration configuration,
            ILogger<ProductServiceHybrid> logger)
        {
            _sqlRepository = sqlRepository;
            _mongoRepository = mongoRepository;
            _configuration = configuration;
            _logger = logger;
            
            // Feature flags to control migration
            _useMongo = _configuration.GetValue<bool>("FeatureFlags:UseMongoForProducts");
            _dualWrite = _configuration.GetValue<bool>("FeatureFlags:DualWriteProducts");

            _logger.LogInformation($"ProductServiceHybrid initialized: UseMongo={_useMongo}, DualWrite={_dualWrite}");
        }

        public async Task<IEnumerable<ProductDto>> GetAllProductsAsync()
        {
            try
            {
                if (_useMongo)
                {
                    var mongoProducts = await _mongoRepository.GetAllAsync();
                    if (mongoProducts == null)
                    {
                        _logger.LogError("MongoDB returned null for GetAllAsync");
                        throw new Exception("Failed to fetch products from MongoDB");
                    }

                    return mongoProducts
                        .Where(p => p.IsActive)
                        .Select(MapMongoToDto);
                }

                var sqlProducts = await _sqlRepository.GetAllAsync();
                return sqlProducts.Select(MapSqlToDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in GetAllProductsAsync");
                throw;
            }
        }

        public async Task<ProductDto> GetProductByIdAsync(int id)
        {
            try
            {
                if (_useMongo)
                {
                    var mongoProduct = await _mongoRepository.GetBySqlIdAsync(id);
                    if (mongoProduct == null)
                    {
                        throw new KeyNotFoundException($"Product with ID {id} not found");
                    }
                    return MapMongoToDto(mongoProduct);
                }

                var sqlProduct = await _sqlRepository.GetByIdAsync(id);
                if (sqlProduct == null)
                {
                    throw new KeyNotFoundException($"Product with ID {id} not found");
                }
                return MapSqlToDto(sqlProduct);
            }
            catch (KeyNotFoundException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in GetProductByIdAsync for ID {id}");
                throw;
            }
        }

        public async Task<ProductDto> CreateProductAsync(ProductCreateDto createDto)
        {
            Product sqlProduct = null;
            ProductMongo mongoProduct = null;

            try
            {
                // Always create in SQL first (source of truth during migration)
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
                _logger.LogInformation($"Product created in SQL with ID: {sqlProduct.Id}");

                // Dual write to MongoDB if enabled
                if (_dualWrite || _useMongo)
                {
                    try
                    {
                        var category = await GetCategoryInfoAsync(createDto.CategoryId);
                        
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
                            SqlId = sqlProduct.Id
                        };

                        await _mongoRepository.AddAsync(mongoProduct);
                        _logger.LogInformation($"Product synced to MongoDB with SqlId: {sqlProduct.Id}");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Failed to sync product {sqlProduct.Id} to MongoDB");
                        // Continue - SQL write succeeded
                    }
                }

                return _useMongo && mongoProduct != null 
                    ? MapMongoToDto(mongoProduct) 
                    : MapSqlToDto(sqlProduct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in CreateProductAsync");
                throw;
            }
        }

        public async Task<ProductDto> UpdateProductAsync(int id, ProductCreateDto updateDto)
        {
            try
            {
                // Update SQL (source of truth)
                var sqlProduct = await _sqlRepository.GetByIdAsync(id);
                if (sqlProduct == null)
                {
                    throw new KeyNotFoundException($"Product with ID {id} not found");
                }

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
                _logger.LogInformation($"Product {id} updated in SQL");

                // Dual write to MongoDB
                if (_dualWrite || _useMongo)
                {
                    try
                    {
                        var mongoProduct = await _mongoRepository.GetBySqlIdAsync(id);
                        if (mongoProduct != null)
                        {
                            var category = await GetCategoryInfoAsync(updateDto.CategoryId);
                            
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
                            _logger.LogInformation($"Product {id} synced to MongoDB");
                        }
                        else
                        {
                            _logger.LogWarning($"Product {id} not found in MongoDB for update");
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Failed to sync product {id} to MongoDB");
                    }
                }

                return MapSqlToDto(sqlProduct);
            }
            catch (KeyNotFoundException)
            {
                throw;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in UpdateProductAsync for ID {id}");
                throw;
            }
        }

        public async Task<IEnumerable<ProductDto>> SearchProductsAsync(ProductSearchDto searchDto)
        {
            try
            {
                if (_useMongo)
                {
                    var products = await _mongoRepository.SearchAsync(
                        searchDto.Query, 
                        searchDto.CategoryId, 
                        searchDto.MinPrice, 
                        searchDto.MaxPrice, 
                        searchDto.Brand);
                    return products.Select(MapMongoToDto);
                }
                
                var sqlProducts = await _sqlRepository.SearchAsync(
                    searchDto.Query, 
                    searchDto.CategoryId,
                    searchDto.MinPrice, 
                    searchDto.MaxPrice, 
                    searchDto.Brand);
                return sqlProducts.Select(MapSqlToDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in SearchProductsAsync");
                throw;
            }
        }

        public async Task<bool> DeleteProductAsync(int id)
        {
            try
            {
                var result = await _sqlRepository.DeleteAsync(id);
                
                if (_dualWrite || _useMongo)
                {
                    try
                    {
                        var mongoProduct = await _mongoRepository.GetBySqlIdAsync(id);
                        if (mongoProduct != null)
                        {
                            await _mongoRepository.DeleteAsync(mongoProduct.Id);
                            _logger.LogInformation($"Product {id} deleted from MongoDB");
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, $"Failed to delete product {id} from MongoDB");
                    }
                }
                
                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in DeleteProductAsync for ID {id}");
                throw;
            }
        }

        public async Task<bool> CheckStockAvailabilityAsync(int productId, int quantity)
        {
            try
            {
                if (_useMongo)
                {
                    var product = await _mongoRepository.GetBySqlIdAsync(productId);
                    return product != null && product.StockQuantity >= quantity;
                }
                
                var sqlProduct = await _sqlRepository.GetByIdAsync(productId);
                return sqlProduct != null && sqlProduct.StockQuantity >= quantity;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in CheckStockAvailabilityAsync for product {productId}");
                throw;
            }
        }

        // Helper Methods
        private ProductDto MapSqlToDto(Product product)
        {
            return new ProductDto
            {
                Id = product.Id,
                Name = product.Name,
                Description = product.Description,
                Price = product.Price,
                CategoryId = product.CategoryId,
                CategoryName = product.Category?.Name ?? "Uncategorized",
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
            if (product.SqlId == null)
            {
                _logger.LogWarning($"MongoDB product {product.Id} has no SqlId - this may indicate incomplete migration");
            }

            return new ProductDto
            {
                MongoId = product.Id,
                Id = product.SqlId ?? 0, // Use 0 if no SqlId (should not happen in production)
                Name = product.Name,
                Description = product.Description,
                Price = product.Price,
                CategoryId = product.Category?.Id ?? 0,
                CategoryName = product.Category?.Name ?? "Uncategorized",
                ImageUrl = product.ImageUrl,
                StockQuantity = product.StockQuantity,
                Brand = product.Brand,
                Rating = product.Rating,
                ReviewCount = product.ReviewCount,
                Specifications = product.Specifications?.ToString(),
                IsAvailable = product.IsActive && product.StockQuantity > 0
            };
        }

        private async Task<CategoryInfo> GetCategoryInfoAsync(int categoryId)
        {
            // TODO: Implement proper category lookup
            // For now, return a placeholder
            // You should inject ICategoryService or ICategoryRepository to get real data
            _logger.LogWarning($"Using placeholder category info for CategoryId: {categoryId}");
            return new CategoryInfo 
            { 
                Id = categoryId, 
                Name = "General" // Replace with actual category name lookup
            };
        }

        private MongoDB.Bson.BsonDocument ParseSpecifications(string specs)
        {
            if (string.IsNullOrEmpty(specs))
                return new MongoDB.Bson.BsonDocument();
            
            try
            {
                return MongoDB.Bson.BsonDocument.Parse(specs);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, $"Failed to parse specifications as BsonDocument: {specs}");
                return new MongoDB.Bson.BsonDocument { { "raw", specs } };
            }
        }
    }
}