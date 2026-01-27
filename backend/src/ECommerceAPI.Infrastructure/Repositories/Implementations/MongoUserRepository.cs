using System.Collections.Generic;
using System.Threading.Tasks;
using MongoDB.Driver;
using ECommerceAPI.Domain.Entities.MongoDB;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;
using Microsoft.Extensions.Options;
using ECommerceAPI.Infrastructure.Configuration;

namespace ECommerceAPI.Infrastructure.Repositories.Implementations
{
    public class MongoUserRepository : IMongoUserRepository
    {
        private readonly IMongoCollection<MongoUser> _users;

        public MongoUserRepository(IOptions<MongoDbSettings> settings)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            _users = database.GetCollection<MongoUser>("users");

            // Create indexes
            CreateIndexes();
        }

        private void CreateIndexes()
        {
            // Email index (unique)
            var emailIndexKeys = Builders<MongoUser>.IndexKeys.Ascending(u => u.Email);
            var emailIndexOptions = new CreateIndexOptions { Unique = true };
            var emailIndexModel = new CreateIndexModel<MongoUser>(emailIndexKeys, emailIndexOptions);

            // Mobile index (unique, sparse for nullable)
            var mobileIndexKeys = Builders<MongoUser>.IndexKeys.Ascending(u => u.Mobile);
            var mobileIndexOptions = new CreateIndexOptions { Unique = true, Sparse = true };
            var mobileIndexModel = new CreateIndexModel<MongoUser>(mobileIndexKeys, mobileIndexOptions);

            // SQL User ID index for migration lookups
            var sqlUserIdIndexKeys = Builders<MongoUser>.IndexKeys.Ascending(u => u.SqlUserId);
            var sqlUserIdIndexOptions = new CreateIndexOptions { Sparse = true };
            var sqlUserIdIndexModel = new CreateIndexModel<MongoUser>(sqlUserIdIndexKeys, sqlUserIdIndexOptions);

            _users.Indexes.CreateMany(new[] { emailIndexModel, mobileIndexModel, sqlUserIdIndexModel });
        }

        public async Task<MongoUser> GetByIdAsync(string id)
        {
            return await _users.Find(u => u.Id == id).FirstOrDefaultAsync();
        }

        public async Task<MongoUser> GetByEmailAsync(string email)
        {
            return await _users.Find(u => u.Email == email).FirstOrDefaultAsync();
        }

        public async Task<MongoUser> GetByMobileAsync(string mobile)
        {
            return await _users.Find(u => u.Mobile == mobile).FirstOrDefaultAsync();
        }

        public async Task<MongoUser> GetBySqlUserIdAsync(int sqlUserId)
        {
            return await _users.Find(u => u.SqlUserId == sqlUserId).FirstOrDefaultAsync();
        }

        public async Task<MongoUser> AddAsync(MongoUser user)
        {
            await _users.InsertOneAsync(user);
            return user;
        }

        public async Task UpdateAsync(MongoUser user)
        {
            await _users.ReplaceOneAsync(u => u.Id == user.Id, user);
        }

        public async Task<bool> EmailExistsAsync(string email)
        {
            return await _users.Find(u => u.Email == email).AnyAsync();
        }

        public async Task<bool> MobileExistsAsync(string mobile)
        {
            if (string.IsNullOrEmpty(mobile))
                return false;
            return await _users.Find(u => u.Mobile == mobile).AnyAsync();
        }

        public async Task<IEnumerable<MongoUser>> GetAllAsync()
        {
            return await _users.Find(_ => true).ToListAsync();
        }

        public async Task DeleteAsync(string id)
        {
            await _users.DeleteOneAsync(u => u.Id == id);
        }
    }
}