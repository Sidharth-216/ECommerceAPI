using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using MongoDB.Driver;
using Microsoft.Extensions.Options;
using ECommerceAPI.Domain.Entities.MongoDB;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;
using ECommerceAPI.Infrastructure.Configuration;

namespace ECommerceAPI.Infrastructure.Repositories.Implementations
{
    /// <summary>
    /// MongoDB OTP Repository Implementation
    /// </summary>
    public class MongoOtpRepository : IMongoOtpRepository
    {
        private readonly IMongoCollection<MongoOtp> _otps;

        public MongoOtpRepository(IOptions<MongoDbSettings> settings)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            _otps = database.GetCollection<MongoOtp>("otps");

            // Create indexes
            CreateIndexes();
        }

        private void CreateIndexes()
        {
            // Mobile index
            var mobileIndexKeys = Builders<MongoOtp>.IndexKeys.Ascending(o => o.Mobile);
            var mobileIndexModel = new CreateIndexModel<MongoOtp>(mobileIndexKeys);

            // Expiration index (TTL index - auto delete expired documents)
            var expiresAtIndexKeys = Builders<MongoOtp>.IndexKeys.Ascending(o => o.ExpiresAt);
            var expiresAtIndexOptions = new CreateIndexOptions { ExpireAfter = TimeSpan.FromMinutes(10) };
            var expiresAtIndexModel = new CreateIndexModel<MongoOtp>(expiresAtIndexKeys, expiresAtIndexOptions);

            _otps.Indexes.CreateMany(new[] { mobileIndexModel, expiresAtIndexModel });
        }

        public async Task<MongoOtp> AddAsync(MongoOtp otp)
        {
            await _otps.InsertOneAsync(otp);
            return otp;
        }

        public async Task UpdateAsync(MongoOtp otp)
        {
            await _otps.ReplaceOneAsync(o => o.Id == otp.Id, otp);
        }

        public async Task<MongoOtp> GetLatestValidOtpAsync(string mobile)
        {
            return await _otps
                .Find(o => o.Mobile == mobile && !o.IsUsed)
                .SortByDescending(o => o.CreatedAt)
                .FirstOrDefaultAsync();
        }

        public async Task InvalidateExistingOtpsAsync(string mobile)
        {
            var filter = Builders<MongoOtp>.Filter.And(
                Builders<MongoOtp>.Filter.Eq(o => o.Mobile, mobile),
                Builders<MongoOtp>.Filter.Eq(o => o.IsUsed, false)
            );

            var update = Builders<MongoOtp>.Update.Set(o => o.IsUsed, true);

            await _otps.UpdateManyAsync(filter, update);
        }

        public async Task InvalidateOtpAsync(string otpId)
        {
            var filter = Builders<MongoOtp>.Filter.Eq(o => o.Id, otpId);
            var update = Builders<MongoOtp>.Update.Set(o => o.IsUsed, true);
            await _otps.UpdateOneAsync(filter, update);
        }
    }

    /// <summary>
    /// MongoDB Email OTP Repository Implementation
    /// </summary>
    public class MongoEmailOtpRepository : IMongoEmailOtpRepository
    {
        private readonly IMongoCollection<MongoEmailOtp> _emailOtps;

        public MongoEmailOtpRepository(IOptions<MongoDbSettings> settings)
        {
            var client = new MongoClient(settings.Value.ConnectionString);
            var database = client.GetDatabase(settings.Value.DatabaseName);
            _emailOtps = database.GetCollection<MongoEmailOtp>("emailOtps");

            CreateIndexes();
        }

        private void CreateIndexes()
        {
            // Email index
            var emailIndexKeys = Builders<MongoEmailOtp>.IndexKeys.Ascending(e => e.Email);
            var emailIndexModel = new CreateIndexModel<MongoEmailOtp>(emailIndexKeys);

            // Expiration index (TTL)
            var expiresAtIndexKeys = Builders<MongoEmailOtp>.IndexKeys.Ascending(e => e.ExpiresAt);
            var expiresAtIndexOptions = new CreateIndexOptions { ExpireAfter = TimeSpan.FromMinutes(10) };
            var expiresAtIndexModel = new CreateIndexModel<MongoEmailOtp>(expiresAtIndexKeys, expiresAtIndexOptions);

            _emailOtps.Indexes.CreateMany(new[] { emailIndexModel, expiresAtIndexModel });
        }

        public async Task<MongoEmailOtp> AddAsync(MongoEmailOtp emailOtp)
        {
            await _emailOtps.InsertOneAsync(emailOtp);
            return emailOtp;
        }

        public async Task<MongoEmailOtp> GetLatestValidOtpAsync(string email)
        {
            return await _emailOtps
                .Find(e => e.Email == email && !e.IsUsed)
                .SortByDescending(e => e.CreatedAt)
                .FirstOrDefaultAsync();
        }

        public async Task<MongoEmailOtp> GetByEmailAndCodeAsync(string email, string otpCode)
        {
            return await _emailOtps
                .Find(e => e.Email == email && e.OtpCode == otpCode && !e.IsUsed)
                .FirstOrDefaultAsync();
        }

        public async Task UpdateAsync(MongoEmailOtp emailOtp)
        {
            await _emailOtps.ReplaceOneAsync(e => e.Id == emailOtp.Id, emailOtp);
        }

        public async Task DeleteExpiredOtpsAsync(DateTime beforeDate)
        {
            var filter = Builders<MongoEmailOtp>.Filter.Lt(e => e.ExpiresAt, beforeDate);
            await _emailOtps.DeleteManyAsync(filter);
        }

        public async Task<List<MongoEmailOtp>> GetAllByEmailAsync(string email)
        {
            return await _emailOtps
                .Find(e => e.Email == email)
                .SortByDescending(e => e.CreatedAt)
                .ToListAsync();
        }

        public async Task InvalidateAllForEmailAsync(string email)
        {
            var filter = Builders<MongoEmailOtp>.Filter.And(
                Builders<MongoEmailOtp>.Filter.Eq(e => e.Email, email),
                Builders<MongoEmailOtp>.Filter.Eq(e => e.IsUsed, false)
            );

            var update = Builders<MongoEmailOtp>.Update
                .Set(e => e.IsUsed, true)
                .Set(e => e.UsedAt, DateTime.UtcNow);

            await _emailOtps.UpdateManyAsync(filter, update);
        }
    }
}