using MongoDB.Driver;
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
            
            // Create indexes
            CreateIndexes();
        }

        private void CreateIndexes()
        {
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

        public async Task<IEnumerable<ProductMongo>> GetAllAsync()
        {
            return await _products
                .Find(p => p.IsActive)
                .ToListAsync();
        }

        public async Task<ProductMongo> GetByIdAsync(string id)
        {
            return await _products
                .Find(p => p.Id == id)
                .FirstOrDefaultAsync();
        }

        public async Task<ProductMongo> GetBySqlIdAsync(int sqlId)
        {
            return await _products
                .Find(p => p.SqlId == sqlId)
                .FirstOrDefaultAsync();
        }

        public async Task<IEnumerable<ProductMongo>> SearchAsync(
            string query, 
            int? categoryId, 
            decimal? minPrice, 
            decimal? maxPrice, 
            string brand)
        {
            var filterBuilder = Builders<ProductMongo>.Filter;
            var filters = new List<FilterDefinition<ProductMongo>>
            {
                filterBuilder.Eq(p => p.IsActive, true)
            };

            if (!string.IsNullOrEmpty(query))
            {
                filters.Add(filterBuilder.Text(query));
            }

            if (categoryId.HasValue)
            {
                filters.Add(filterBuilder.Eq(p => p.Category.Id, categoryId.Value));
            }

            if (minPrice.HasValue)
            {
                filters.Add(filterBuilder.Gte(p => p.Price, minPrice.Value));
            }

            if (maxPrice.HasValue)
            {
                filters.Add(filterBuilder.Lte(p => p.Price, maxPrice.Value));
            }

            if (!string.IsNullOrEmpty(brand))
            {
                filters.Add(filterBuilder.Eq(p => p.Brand, brand));
            }

            var combinedFilter = filterBuilder.And(filters);
            return await _products.Find(combinedFilter).ToListAsync();
        }

        public async Task<ProductMongo> AddAsync(ProductMongo product)
        {
            await _products.InsertOneAsync(product);
            return product;
        }

        public async Task<bool> UpdateAsync(string id, ProductMongo product)
        {
            var result = await _products.ReplaceOneAsync(
                p => p.Id == id, 
                product);
            return result.ModifiedCount > 0;
        }

        public async Task<bool> DeleteAsync(string id)
        {
            var update = Builders<ProductMongo>.Update
                .Set(p => p.IsActive, false)
                .Set(p => p.UpdatedAt, DateTime.UtcNow);
            
            var result = await _products.UpdateOneAsync(
                p => p.Id == id, 
                update);
            
            return result.ModifiedCount > 0;
        }
    }
}