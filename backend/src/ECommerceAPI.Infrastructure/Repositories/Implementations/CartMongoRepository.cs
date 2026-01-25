using System;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using ECommerceAPI.Domain.Entities.Mongo;
using ECommerceAPI.Infrastructure.Configuration;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Infrastructure.Repositories.Implementations
{
    public class CartMongoRepository : ICartMongoRepository
    {
        private readonly IMongoCollection<CartMongo> _carts;

        public CartMongoRepository(IOptions<MongoDbSettings> settings)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);

            _carts = database.GetCollection<CartMongo>("carts");

            CreateIndexes();
        }

        private void CreateIndexes()
        {
            var indexKeys = Builders<CartMongo>.IndexKeys;

            var userIdIndex = new CreateIndexModel<CartMongo>(
                indexKeys.Ascending(c => c.UserId),
                new CreateIndexOptions { Unique = true }
            );

            var sqlIdIndex = new CreateIndexModel<CartMongo>(
                indexKeys.Ascending(c => c.SqlId)
            );

            var activeIndex = new CreateIndexModel<CartMongo>(
                indexKeys.Ascending(c => c.IsActive).Ascending(c => c.UserId)
            );

            _carts.Indexes.CreateMany(new[]
            {
                userIdIndex,
                sqlIdIndex,
                activeIndex
            });
        }

        public async Task<CartMongo> GetByUserIdAsync(int userId)
        {
            return await _carts.Find(c => c.UserId == userId.ToString() && c.IsActive == true)
                .FirstOrDefaultAsync();
        }

        public async Task<CartMongo> GetBySqlIdAsync(int sqlId)
        {
            return await _carts.Find(c => c.SqlId == sqlId)
                .FirstOrDefaultAsync();
        }

        public async Task<CartMongo> GetByIdAsync(string mongoId)
        {
            return await _carts.Find(c => c.Id == mongoId)
                .FirstOrDefaultAsync();
        }

        public async Task AddAsync(CartMongo cart)
        {
            cart.CreatedAt = DateTime.UtcNow;
            cart.UpdatedAt = DateTime.UtcNow;
            cart.IsActive = true;

            CalculateTotals(cart);

            await _carts.InsertOneAsync(cart);
        }

        public async Task UpdateAsync(string id, CartMongo cart)
        {
            cart.UpdatedAt = DateTime.UtcNow;
            CalculateTotals(cart);

            await _carts.ReplaceOneAsync(c => c.Id == id, cart);
        }

        public async Task DeleteAsync(string id)
        {
            var update = Builders<CartMongo>.Update
                .Set(c => c.IsActive, false)
                .Set(c => c.UpdatedAt, DateTime.UtcNow);

            await _carts.UpdateOneAsync(c => c.Id == id, update);
        }

        public async Task DeleteByUserIdAsync(int userId)
        {
            var update = Builders<CartMongo>.Update
                .Set(c => c.IsActive, false)
                .Set(c => c.UpdatedAt, DateTime.UtcNow);

            await _carts.UpdateManyAsync(c => c.UserId == userId.ToString(), update);
        }

        public async Task<IEnumerable<CartMongo>> GetAllAsync()
        {
            return await _carts.Find(_ => true).ToListAsync();
        }

        public async Task<CartItemMongo?> GetCartItemAsync(int userId, string productId)
        {
            var cart = await GetByUserIdAsync(userId);
            return cart?.Items?.FirstOrDefault(i => i.ProductId == productId) ?? null;
        }

        public async Task<bool> UpdateCartTotalsAsync(string id)
        {
            var cart = await GetByIdAsync(id);
            if (cart == null) return false;

            CalculateTotals(cart);

            var update = Builders<CartMongo>.Update
                .Set(c => c.TotalAmount, cart.TotalAmount)
                .Set(c => c.TotalItems, cart.TotalItems)
                .Set(c => c.UpdatedAt, DateTime.UtcNow);

            var result = await _carts.UpdateOneAsync(c => c.Id == id, update);
            return result.ModifiedCount > 0;
        }

        private void CalculateTotals(CartMongo cart)
        {
            if (cart.Items == null || !cart.Items.Any())
            {
                cart.TotalAmount = 0;
                cart.TotalItems = 0;
                return;
            }

            cart.TotalAmount = cart.Items.Sum(i => i.Subtotal);
            cart.TotalItems = cart.Items.Sum(i => i.Quantity);
        }
    }
}
