using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using MongoDB.Driver;
using ECommerceAPI.Domain.Entities.Mongo;
using ECommerceAPI.Infrastructure.Configuration;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Infrastructure.Repositories.Implementations
{
    public class AddressMongoRepository : IAddressMongoRepository
    {
        private readonly IMongoCollection<AddressMongo> _addresses;

        public AddressMongoRepository(IOptions<MongoDbSettings> settings)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            _addresses = database.GetCollection<AddressMongo>("addresses");

            CreateIndexes();
        }

        private void CreateIndexes()
        {
            var indexKeys = Builders<AddressMongo>.IndexKeys;

            // Index on userId for fast user address lookups
            var userIdIndex = new CreateIndexModel<AddressMongo>(
                indexKeys.Ascending(a => a.UserId)
            );

            // Index on userId + isDefault for finding default addresses
            var defaultAddressIndex = new CreateIndexModel<AddressMongo>(
                indexKeys.Ascending(a => a.UserId).Ascending(a => a.IsDefault)
            );

            // Index on sqlId for migration lookups
            var sqlIdIndex = new CreateIndexModel<AddressMongo>(
                indexKeys.Ascending(a => a.SqlId),
                new CreateIndexOptions { Sparse = true }
            );

            _addresses.Indexes.CreateMany(new[] 
            { 
                userIdIndex, 
                defaultAddressIndex, 
                sqlIdIndex 
            });
        }

        public async Task<AddressMongo> GetByIdAsync(string id)
        {
            return await _addresses.Find(a => a.Id == id).FirstOrDefaultAsync();
        }

        public async Task<IEnumerable<AddressMongo>> GetByUserIdStringAsync(string userId)
        {
            return await _addresses
                .Find(a => a.UserId == userId)
                .SortByDescending(a => a.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<AddressMongo>> GetByUserIdAsync(int userId)
        {
            return await GetByUserIdStringAsync(userId.ToString());
        }

        public async Task<AddressMongo> AddAsync(AddressMongo address)
        {
            if (string.IsNullOrEmpty(address.Id))
            {
                address.Id = null; // Let MongoDB generate ObjectId
            }

            address.CreatedAt = DateTime.UtcNow;
            address.UpdatedAt = DateTime.UtcNow;

            await _addresses.InsertOneAsync(address);
            return address;
        }

        public async Task UpdateAsync(AddressMongo address)
        {
            address.UpdatedAt = DateTime.UtcNow;
            await _addresses.ReplaceOneAsync(a => a.Id == address.Id, address);
        }

        public async Task DeleteAsync(string id)
        {
            await _addresses.DeleteOneAsync(a => a.Id == id);
        }

        public async Task<AddressMongo> GetDefaultAddressAsync(string userId)
        {
            return await _addresses
                .Find(a => a.UserId == userId && a.IsDefault)
                .FirstOrDefaultAsync();
        }

        public async Task UnsetDefaultAddressesAsync(string userId, string exceptId = null)
        {
            var filter = Builders<AddressMongo>.Filter.And(
                Builders<AddressMongo>.Filter.Eq(a => a.UserId, userId),
                Builders<AddressMongo>.Filter.Eq(a => a.IsDefault, true)
            );

            if (!string.IsNullOrEmpty(exceptId))
            {
                filter = Builders<AddressMongo>.Filter.And(
                    filter,
                    Builders<AddressMongo>.Filter.Ne(a => a.Id, exceptId)
                );
            }

            var update = Builders<AddressMongo>.Update
                .Set(a => a.IsDefault, false)
                .Set(a => a.UpdatedAt, DateTime.UtcNow);

            await _addresses.UpdateManyAsync(filter, update);
        }
    }
}