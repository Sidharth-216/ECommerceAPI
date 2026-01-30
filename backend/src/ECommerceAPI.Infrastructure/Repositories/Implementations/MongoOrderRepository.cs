using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using MongoDB.Driver;
using MongoDB.Bson;
using ECommerceAPI.Domain.Entities.MongoDB;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Infrastructure.Repositories.Implementations
{
    /// <summary>
    /// MongoDB Order Repository Implementation
    /// </summary>
    public class MongoOrderRepository : IMongoOrderRepository
    {
        private readonly IMongoCollection<MongoOrder> _orders;

        public MongoOrderRepository(IMongoDatabase database)
        {
            _orders = database.GetCollection<MongoOrder>("orders");
            CreateIndexes();
        }

        private void CreateIndexes()
        {
            // Index on userId for fast user order queries
            var userIdIndexKeys = Builders<MongoOrder>.IndexKeys.Ascending(o => o.UserId);
            var userIdIndexModel = new CreateIndexModel<MongoOrder>(userIdIndexKeys);

            // Index on orderNumber for unique constraint and fast lookup
            var orderNumberIndexKeys = Builders<MongoOrder>.IndexKeys.Ascending(o => o.OrderNumber);
            var orderNumberIndexOptions = new CreateIndexOptions { Unique = true };
            var orderNumberIndexModel = new CreateIndexModel<MongoOrder>(orderNumberIndexKeys, orderNumberIndexOptions);

            // Index on createdAt for sorting
            var createdAtIndexKeys = Builders<MongoOrder>.IndexKeys.Descending(o => o.CreatedAt);
            var createdAtIndexModel = new CreateIndexModel<MongoOrder>(createdAtIndexKeys);

            // Index on status for filtering
            var statusIndexKeys = Builders<MongoOrder>.IndexKeys.Ascending(o => o.Status);
            var statusIndexModel = new CreateIndexModel<MongoOrder>(statusIndexKeys);

            // Compound index for user + status queries
            var userStatusIndexKeys = Builders<MongoOrder>.IndexKeys
                .Ascending(o => o.UserId)
                .Ascending(o => o.Status);
            var userStatusIndexModel = new CreateIndexModel<MongoOrder>(userStatusIndexKeys);

            // Index on shippingAddressId
            var addressIndexKeys = Builders<MongoOrder>.IndexKeys.Ascending(o => o.ShippingAddressId);
            var addressIndexModel = new CreateIndexModel<MongoOrder>(addressIndexKeys);

            _orders.Indexes.CreateMany(new[]
            {
                userIdIndexModel,
                orderNumberIndexModel,
                createdAtIndexModel,
                statusIndexModel,
                userStatusIndexModel,
                addressIndexModel
            });
        }

        public async Task<MongoOrder> GetByIdAsync(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
                return null;

            // Validate ObjectId format
            if (!ObjectId.TryParse(id, out _))
                return null;

            return await _orders.Find(o => o.Id == id).FirstOrDefaultAsync();
        }

        public async Task<MongoOrder> GetByOrderNumberAsync(string orderNumber)
        {
            if (string.IsNullOrWhiteSpace(orderNumber))
                return null;

            return await _orders.Find(o => o.OrderNumber == orderNumber).FirstOrDefaultAsync();
        }

        public async Task<IEnumerable<MongoOrder>> GetByUserIdAsync(string userId)
        {
            if (string.IsNullOrWhiteSpace(userId))
                return new List<MongoOrder>();

            return await _orders
                .Find(o => o.UserId == userId)
                .SortByDescending(o => o.CreatedAt)
                .ToListAsync();
        }

        public async Task<MongoOrder> AddAsync(MongoOrder order)
        {
            if (order == null)
                throw new ArgumentNullException(nameof(order));

            // Set creation timestamp if not set
            if (order.CreatedAt == default)
                order.CreatedAt = DateTime.UtcNow;

            await _orders.InsertOneAsync(order);
            return order;
        }

        public async Task UpdateAsync(MongoOrder order)
        {
            if (order == null)
                throw new ArgumentNullException(nameof(order));

            if (string.IsNullOrWhiteSpace(order.Id))
                throw new ArgumentException("Order ID is required for update");

            // Set update timestamp
            order.UpdatedAt = DateTime.UtcNow;

            var result = await _orders.ReplaceOneAsync(o => o.Id == order.Id, order);
            
            if (result.MatchedCount == 0)
                throw new KeyNotFoundException($"Order not found with ID: {order.Id}");
        }

        public async Task<IEnumerable<MongoOrder>> GetAllAsync()
        {
            return await _orders
                .Find(_ => true)
                .SortByDescending(o => o.CreatedAt)
                .ToListAsync();
        }

        public async Task<bool> ExistsAsync(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
                return false;

            if (!ObjectId.TryParse(id, out _))
                return false;

            var count = await _orders.CountDocumentsAsync(o => o.Id == id);
            return count > 0;
        }

        public async Task DeleteAsync(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
                throw new ArgumentException("Order ID is required");

            if (!ObjectId.TryParse(id, out _))
                throw new FormatException($"Invalid MongoDB ObjectId format: {id}");

            var result = await _orders.DeleteOneAsync(o => o.Id == id);
            
            if (result.DeletedCount == 0)
                throw new KeyNotFoundException($"Order not found with ID: {id}");
        }

        public async Task<IEnumerable<MongoOrder>> GetByStatusAsync(string status)
        {
            if (string.IsNullOrWhiteSpace(status))
                return new List<MongoOrder>();

            return await _orders
                .Find(o => o.Status == status)
                .SortByDescending(o => o.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<MongoOrder>> GetOrdersByDateRangeAsync(DateTime startDate, DateTime endDate)
        {
            var filter = Builders<MongoOrder>.Filter.And(
                Builders<MongoOrder>.Filter.Gte(o => o.CreatedAt, startDate),
                Builders<MongoOrder>.Filter.Lte(o => o.CreatedAt, endDate)
            );

            return await _orders
                .Find(filter)
                .SortByDescending(o => o.CreatedAt)
                .ToListAsync();
        }
    }
}