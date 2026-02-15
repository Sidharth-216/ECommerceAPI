using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using MongoDB.Driver;
using ECommerceAPI.Domain.Entities.MongoDB;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Infrastructure.Repositories
{
    public class MongoEmailOtpRepository : IMongoEmailOtpRepository
    {
        private readonly IMongoCollection<MongoEmailOtp> _collection;

        public MongoEmailOtpRepository(IMongoDatabase database)
        {
            _collection = database.GetCollection<MongoEmailOtp>("email_otps");
        }

        public async Task<MongoEmailOtp> AddAsync(MongoEmailOtp emailOtp)
        {
            await _collection.InsertOneAsync(emailOtp);
            return emailOtp;
        }

        public async Task<MongoEmailOtp?> GetLatestValidOtpAsync(string email)
        {
            return await _collection
                .Find(o => o.Email == email && !o.IsUsed && o.ExpiresAt > DateTime.UtcNow)
                .SortByDescending(o => o.CreatedAt)
                .FirstOrDefaultAsync();
        }

        public async Task<MongoEmailOtp?> GetByEmailAndCodeAsync(string email, string otpCode)
        {
            return await _collection
                .Find(o => o.Email == email && o.OtpCode == otpCode)
                .FirstOrDefaultAsync();
        }

        public async Task UpdateAsync(MongoEmailOtp emailOtp)
        {
            await _collection.ReplaceOneAsync(
                o => o.Id == emailOtp.Id,
                emailOtp
            );
        }

        public async Task DeleteExpiredOtpsAsync(DateTime beforeDate)
        {
            await _collection.DeleteManyAsync(o => o.ExpiresAt < beforeDate);
        }

        public async Task<List<MongoEmailOtp>> GetAllByEmailAsync(string email)
        {
            return await _collection
                .Find(o => o.Email == email)
                .ToListAsync();
        }

        public async Task InvalidateAllForEmailAsync(string email)
        {
            var update = Builders<MongoEmailOtp>.Update
                .Set(o => o.IsUsed, true)
                .Set(o => o.UsedAt, DateTime.UtcNow);

            await _collection.UpdateManyAsync(
                o => o.Email == email && !o.IsUsed,
                update
            );
        }
    }
}
