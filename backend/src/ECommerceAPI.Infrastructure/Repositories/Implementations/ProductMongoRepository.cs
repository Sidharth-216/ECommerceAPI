using MongoDB.Driver;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using ECommerceAPI.Domain.Entities.Mongo;
using ECommerceAPI.Infrastructure.Configuration;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Infrastructure.Repositories.Implementations
{
    public class ProductMongoRepository : IProductMongoRepository
    {
        private readonly IMongoCollection<ProductMongo> _products;

        public ProductMongoRepository(
            IOptions<MongoDbSettings> settings,
            IMongoClient mongoClient)
        {
            var database = mongoClient.GetDatabase(settings.Value.DatabaseName);
            _products = database.GetCollection<ProductMongo>(
                settings.Value.ProductsCollectionName);
            
            // Register class maps for proper BSON serialization
            RegisterClassMaps();
            
            // Create indexes
            CreateIndexes();
        }

        private void RegisterClassMaps()
        {
            try
            {
                // Register CategoryInfo class map if not already registered
                if (!BsonClassMap.IsClassMapRegistered(typeof(CategoryInfo)))
                {
                    BsonClassMap.RegisterClassMap<CategoryInfo>(cm =>
                    {
                        cm.AutoMap();
                        cm.SetIgnoreExtraElements(true);
                    });
                }

                // Register ProductMongo class map if not already registered
                if (!BsonClassMap.IsClassMapRegistered(typeof(ProductMongo)))
                {
                    BsonClassMap.RegisterClassMap<ProductMongo>(cm =>
                    {
                        cm.AutoMap();
                        cm.SetIgnoreExtraElements(true);
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ Warning: Could not register class maps: {ex.Message}");
            }
        }

        private void CreateIndexes()
        {
            try
            {
                var isActiveIndex = Builders<ProductMongo>.IndexKeys
                    .Ascending(p => p.IsActive)
                    .Descending(p => p.CreatedAt);
                _products.Indexes.CreateOne(new CreateIndexModel<ProductMongo>(isActiveIndex));

                // Index for SQL ID lookup during migration
                var sqlIdIndex = Builders<ProductMongo>.IndexKeys
                    .Ascending(p => p.SqlId);
                _products.Indexes.CreateOne(new CreateIndexModel<ProductMongo>(sqlIdIndex));
                
                // Text index for search
                var textIndex = Builders<ProductMongo>.IndexKeys
                    .Text(p => p.Name)
                    .Text(p => p.Description)
                    .Text(p => p.Brand);
                _products.Indexes.CreateOne(new CreateIndexModel<ProductMongo>(textIndex));
                
                // Compound index for filtering
                var filterIndex = Builders<ProductMongo>.IndexKeys
                    .Ascending(p => p.Category.Id)
                    .Ascending(p => p.Price)
                    .Ascending(p => p.Brand);
                _products.Indexes.CreateOne(new CreateIndexModel<ProductMongo>(filterIndex));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ Warning: Could not create indexes: {ex.Message}");
                // Don't throw - indexes are optional optimization
            }
        }

        private static FilterDefinition<ProductMongo> ActiveProductsFilter()
        {
            var builder = Builders<ProductMongo>.Filter;
            return builder.Or(
                builder.Eq("IsActive", true),
                builder.Eq("IsActive", "true"),
                builder.Eq("IsActive", BsonNull.Value),
                builder.Exists("IsActive", false)
            );
        }

        public async Task<IEnumerable<ProductMongo>> GetAllAsync()
        {
            try
            {
                Console.WriteLine("📦 [ProductMongoRepository] GetAllAsync - Fetching all products");

                var products = await _products
                    .Find(ActiveProductsFilter())
                    .SortByDescending(p => p.CreatedAt)
                    .ToListAsync();
                
                Console.WriteLine($"✅ Retrieved {products.Count} products from MongoDB");
                
                return products;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error in GetAllAsync: {ex.Message}");
                Console.WriteLine($"Stack trace: {ex.StackTrace}");
                throw;
            }
        }

        public async Task<(IReadOnlyList<ProductMongo> Items, long TotalCount)> GetPageAsync(int page, int pageSize)
        {
            var safePage = page < 1 ? 1 : page;
            var safePageSize = pageSize < 1 ? 24 : Math.Min(pageSize, 100);
            var skip = (safePage - 1) * safePageSize;
            var filter = ActiveProductsFilter();

            var totalCount = await _products.CountDocumentsAsync(filter);
            var items = await _products
                .Find(filter)
                .SortByDescending(p => p.CreatedAt)
                .Skip(skip)
                .Limit(safePageSize)
                .ToListAsync();

            return (items, totalCount);
        }

        public async Task<ProductMongo> GetByIdAsync(string id)
        {
            Console.WriteLine($"🔍 [ProductMongoRepository] GetByIdAsync - ID: {id}");
            
            try
            {
                var product = await _products
                    .Find(p => p.Id == id)
                    .FirstOrDefaultAsync();
                
                if (product != null)
                {
                    Console.WriteLine($"✅ Product found: {product.Name}");
                }
                else
                {
                    Console.WriteLine($"❌ Product not found with ID: {id}");
                }
                
                return product;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error in GetByIdAsync: {ex.Message}");
                throw;
            }
        }

        public async Task<ProductMongo> GetBySqlIdAsync(int sqlId)
        {
            Console.WriteLine($"🔍 [ProductMongoRepository] GetBySqlIdAsync - SQL ID: {sqlId}");
            
            try
            {
                return await _products
                    .Find(p => p.SqlId == sqlId)
                    .FirstOrDefaultAsync();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error in GetBySqlIdAsync: {ex.Message}");
                throw;
            }
        }

        public async Task<IEnumerable<ProductMongo>> SearchAsync(
            string query,
            int? categoryId,
            decimal? minPrice,
            decimal? maxPrice,
            string brand)
        {
            Console.WriteLine($"🔍 [ProductMongoRepository] SearchAsync");
            Console.WriteLine($"   Query: {query}");
            Console.WriteLine($"   Category ID: {categoryId}");
            Console.WriteLine($"   Price Range: {minPrice} - {maxPrice}");
            Console.WriteLine($"   Brand: {brand}");
            
            try
            {
                var filterBuilder = Builders<ProductMongo>.Filter;
                var filter = ActiveProductsFilter();

                if (!string.IsNullOrEmpty(query))
                {
                    filter &= filterBuilder.Regex(
                        x => x.Name,
                        new BsonRegularExpression(query, "i"));
                }

                if (categoryId.HasValue)
                {
                    filter &= filterBuilder.Eq(
                        x => x.Category.Id,
                        categoryId.Value);
                }

                if (minPrice.HasValue)
                {
                    filter &= filterBuilder.Gte(x => x.Price, minPrice.Value);
                }

                if (maxPrice.HasValue)
                {
                    filter &= filterBuilder.Lte(x => x.Price, maxPrice.Value);
                }

                if (!string.IsNullOrEmpty(brand))
                {
                    filter &= filterBuilder.Eq(x => x.Brand, brand);
                }

                var results = await _products.Find(filter).ToListAsync();
                
                Console.WriteLine($"✅ Found {results.Count} products matching search criteria");
                
                return results;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error in SearchAsync: {ex.Message}");
                throw;
            }
        }

        public async Task<ProductMongo> AddAsync(ProductMongo product)
        {
            Console.WriteLine($"➕ [ProductMongoRepository] AddAsync - Product: {product.Name}");
            
            try
            {
                // Set default values
                product.CreatedAt = DateTime.UtcNow;
                product.UpdatedAt = DateTime.UtcNow;
                product.IsActive = true;
                
                await _products.InsertOneAsync(product);
                
                Console.WriteLine($"✅ Product added successfully with ID: {product.Id}");
                
                return product;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error in AddAsync: {ex.Message}");
                throw;
            }
        }

        public async Task<bool> UpdateAsync(string id, ProductMongo product)
        {
            Console.WriteLine($"✏️ [ProductMongoRepository] UpdateAsync - ID: {id}");
            
            try
            {
                product.UpdatedAt = DateTime.UtcNow;
                
                var result = await _products.ReplaceOneAsync(
                    p => p.Id == id, 
                    product);
                
                var success = result.ModifiedCount > 0;
                
                if (success)
                {
                    Console.WriteLine($"✅ Product updated successfully");
                }
                else
                {
                    Console.WriteLine($"⚠️ No product was modified (may not exist or no changes)");
                }
                
                return success;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error in UpdateAsync: {ex.Message}");
                throw;
            }
        }

        public async Task<bool> DeleteAsync(string id)
        {
            Console.WriteLine($"🗑️ [ProductMongoRepository] DeleteAsync - ID: {id}");
            
            try
            {
                // Soft delete - set IsActive to false
                var update = Builders<ProductMongo>.Update
                    .Set(p => p.IsActive, false)
                    .Set(p => p.UpdatedAt, DateTime.UtcNow);
                
                var result = await _products.UpdateOneAsync(
                    p => p.Id == id, 
                    update);
                
                var success = result.ModifiedCount > 0;
                
                if (success)
                {
                    Console.WriteLine($"✅ Product soft-deleted successfully");
                }
                else
                {
                    Console.WriteLine($"⚠️ Product not found or already deleted");
                }
                
                return success;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error in DeleteAsync: {ex.Message}");
                throw;
            }
        }

        public async Task<IEnumerable<ProductMongo>> GetSuggestionsAsync(string query)
        {
            Console.WriteLine($"💡 [ProductMongoRepository] GetSuggestionsAsync - Query: {query}");
            
            try
            {
                var filterBuilder = Builders<ProductMongo>.Filter;
                
                // Build search filter
                var searchFilter = filterBuilder.Or(
                    filterBuilder.Regex(p => p.Name, new BsonRegularExpression(query, "i")),
                    filterBuilder.Regex(p => p.Brand, new BsonRegularExpression(query, "i")),
                    filterBuilder.Regex("category.name", new BsonRegularExpression(query, "i"))
                );

                var filter = filterBuilder.And(ActiveProductsFilter(), searchFilter);
                
                var results = await _products
                    .Find(filter)
                    .Limit(8)
                    .ToListAsync();
                
                Console.WriteLine($"✅ Found {results.Count} suggestions");
                
                return results;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error in GetSuggestionsAsync: {ex.Message}");
                throw;
            }
        }
    }
}