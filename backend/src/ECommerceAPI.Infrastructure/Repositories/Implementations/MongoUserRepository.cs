using MongoDB.Driver;
using System.Collections.Generic;
using System.Threading.Tasks;
using ECommerceAPI.Domain.Entities.Mongo;
using ECommerceAPI.Infrastructure.Repositories.Interfaces.Mongo;
using ECommerceAPI.Infrastructure.Data;

namespace ECommerceAPI.Infrastructure.Repositories.Implementations.Mongo
{
    public class MongoUserRepository : IMongoUserRepository
    {
        private readonly MongoDbContext _context;

        public MongoUserRepository(MongoDbContext context)
        {
            _context = context;
        }

        public async Task<MongoUser> GetByIdAsync(string id)
        {
            return await _context.Users.Find(u => u.Id == id).FirstOrDefaultAsync();
        }

        public async Task<MongoUser> GetByEmailAsync(string email)
        {
            return await _context.Users.Find(u => u.Email == email).FirstOrDefaultAsync();
        }

        public async Task<MongoUser> GetByMobileAsync(string mobile)
        {
            return await _context.Users.Find(u => u.Mobile == mobile).FirstOrDefaultAsync();
        }

        public async Task<MongoUser> AddAsync(MongoUser user)
        {
            await _context.Users.InsertOneAsync(user);
            return user;
        }

        public async Task UpdateAsync(MongoUser user)
        {
            await _context.Users.ReplaceOneAsync(u => u.Id == user.Id, user);
        }

        public async Task<bool> EmailExistsAsync(string email)
        {
            var count = await _context.Users.CountDocumentsAsync(u => u.Email == email);
            return count > 0;
        }

        public async Task<bool> MobileExistsAsync(string mobile)
        {
            var count = await _context.Users.CountDocumentsAsync(u => u.Mobile == mobile);
            return count > 0;
        }

        public async Task<IEnumerable<MongoUser>> GetAllAsync()
        {
            return await _context.Users.Find(_ => true).ToListAsync();
        }

        public async Task DeleteAsync(string id)
        {
            await _context.Users.DeleteOneAsync(u => u.Id == id);
        }
    }
}
