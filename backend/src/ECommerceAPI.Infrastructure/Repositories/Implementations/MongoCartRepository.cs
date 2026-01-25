using MongoDB.Driver;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ECommerceAPI.Domain.Entities.Mongo;
using ECommerceAPI.Infrastructure.Data;
using ECommerceAPI.Infrastructure.Repositories.Interfaces.Mongo;

namespace ECommerceAPI.Infrastructure.Repositories.Implementations.Mongo
{
    public class MongoCartRepository : IMongoCartRepository
    {
        private readonly MongoDbContext _context;

        public MongoCartRepository(MongoDbContext context)
        {
            _context = context;
        }

        public async Task<MongoCart> GetByUserIdAsync(string userId)
        {
            return await _context.Carts.Find(c => c.UserId == userId).FirstOrDefaultAsync();
        }

        public async Task<MongoCart> AddOrUpdateAsync(MongoCart cart)
        {
            var existing = await _context.Carts.Find(c => c.UserId == cart.UserId).FirstOrDefaultAsync();

            if (existing == null)
            {
                await _context.Carts.InsertOneAsync(cart);
            }
            else
            {
                cart.Id = existing.Id; // preserve Mongo Id
                cart.UpdatedAt = DateTime.UtcNow;
                await _context.Carts.ReplaceOneAsync(c => c.Id == existing.Id, cart);
            }

            return cart;
        }

        public async Task RemoveItemAsync(string userId, string mongoProductId)
        {
            var cart = await GetByUserIdAsync(userId);
            if (cart == null) return;

            cart.Items.RemoveAll(i => i.MongoProductId == mongoProductId);
            cart.UpdatedAt = DateTime.UtcNow;

            await _context.Carts.ReplaceOneAsync(c => c.Id == cart.Id, cart);
        }

        public async Task ClearCartAsync(string userId)
        {
            await _context.Carts.DeleteOneAsync(c => c.UserId == userId);
        }

        public async Task<IEnumerable<MongoCart>> GetAllAsync()
        {
            return await _context.Carts.Find(_ => true).ToListAsync();
        }
    }
}
