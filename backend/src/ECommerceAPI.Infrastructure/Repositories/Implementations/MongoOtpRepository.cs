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
   
}