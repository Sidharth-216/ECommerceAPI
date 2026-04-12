using MongoDB.Driver;
using MongoDB.Bson;
using MongoDB.Bson.Serialization;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Options;
using ECommerceAPI.Domain.Entities.Mongo;
using ECommerceAPI.Infrastructure.Configuration;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Infrastructure.Repositories.Implementations
{
    public class BarcodeDataRepository : IBarcodeDataRepository
    {
        private readonly IMongoCollection<BarcodeDataMongo> _barcodeData;

        public BarcodeDataRepository(
            IOptions<MongoDbSettings> settings,
            IMongoClient mongoClient)
        {
            var database = mongoClient.GetDatabase(settings.Value.DatabaseName);
            _barcodeData = database.GetCollection<BarcodeDataMongo>("barcodes");
            
            RegisterClassMaps();
            CreateIndexes();
        }

        private void RegisterClassMaps()
        {
            try
            {
                if (!BsonClassMap.IsClassMapRegistered(typeof(BarcodeDataMongo)))
                {
                    BsonClassMap.RegisterClassMap<BarcodeDataMongo>(cm =>
                    {
                        cm.AutoMap();
                        cm.SetIgnoreExtraElements(true);
                    });
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ Warning: Could not register BarcodeDataMongo class map: {ex.Message}");
            }
        }

        private void CreateIndexes()
        {
            try
            {
                // UNIQUE index on barcode for fast lookup (PRIMARY KEY equivalent)
                var barcodeIndex = Builders<BarcodeDataMongo>.IndexKeys
                    .Ascending(b => b.Barcode);
                var barcodeIndexModel = new CreateIndexModel<BarcodeDataMongo>(
                    barcodeIndex,
                    new CreateIndexOptions { Unique = true }
                );
                _barcodeData.Indexes.CreateOne(barcodeIndexModel);

                // Index on productId for sync/updates
                var productIdIndex = Builders<BarcodeDataMongo>.IndexKeys
                    .Ascending(b => b.ProductId);
                _barcodeData.Indexes.CreateOne(new CreateIndexModel<BarcodeDataMongo>(productIdIndex));

                // Compound index for active barcodes
                var activeIndex = Builders<BarcodeDataMongo>.IndexKeys
                    .Ascending(b => b.IsActive)
                    .Descending(b => b.CreatedAt);
                _barcodeData.Indexes.CreateOne(new CreateIndexModel<BarcodeDataMongo>(activeIndex));
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ Warning: Could not create indexes: {ex.Message}");
            }
        }

        public async Task<BarcodeDataMongo> GetByBarcodeAsync(string barcode)
        {
            if (string.IsNullOrWhiteSpace(barcode))
                return null;

            return await _barcodeData
                .Find(b => b.Barcode == barcode && b.IsActive != false)
                .FirstOrDefaultAsync();
        }

        public async Task<BarcodeDataMongo> GetByIdAsync(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
                return null;

            return await _barcodeData
                .Find(b => b.Id == id)
                .FirstOrDefaultAsync();
        }

        public async Task<IEnumerable<BarcodeDataMongo>> GetByBarcodesAsync(IEnumerable<string> barcodes)
        {
            if (barcodes == null || !barcodes.Any())
                return new List<BarcodeDataMongo>();

            var filter = Builders<BarcodeDataMongo>.Filter.In(b => b.Barcode, barcodes) 
                & Builders<BarcodeDataMongo>.Filter.Ne(b => b.IsActive, false);
            
            return await _barcodeData.Find(filter).ToListAsync();
        }

        public async Task<BarcodeDataMongo> AddAsync(BarcodeDataMongo barcodeData)
        {
            if (barcodeData == null)
                throw new ArgumentNullException(nameof(barcodeData));

            barcodeData.CreatedAt = DateTime.UtcNow;
            barcodeData.UpdatedAt = DateTime.UtcNow;
            barcodeData.IsActive = true;

            await _barcodeData.InsertOneAsync(barcodeData);
            return barcodeData;
        }

        public async Task<bool> UpdateAsync(string id, BarcodeDataMongo barcodeData)
        {
            if (string.IsNullOrWhiteSpace(id) || barcodeData == null)
                return false;

            barcodeData.UpdatedAt = DateTime.UtcNow;
            
            var filter = Builders<BarcodeDataMongo>.Filter.Eq(b => b.Id, id);
            var result = await _barcodeData.ReplaceOneAsync(filter, barcodeData);
            
            return result.ModifiedCount > 0;
        }

        public async Task<bool> DeleteAsync(string id)
        {
            if (string.IsNullOrWhiteSpace(id))
                return false;

            var filter = Builders<BarcodeDataMongo>.Filter.Eq(b => b.Id, id);
            var update = Builders<BarcodeDataMongo>.Update
                .Set(b => b.IsActive, false)
                .Set(b => b.UpdatedAt, DateTime.UtcNow);

            var result = await _barcodeData.UpdateOneAsync(filter, update);
            return result.ModifiedCount > 0;
        }

        public async Task<bool> ExistsByBarcodeAsync(string barcode)
        {
            if (string.IsNullOrWhiteSpace(barcode))
                return false;

            var count = await _barcodeData
                .CountDocumentsAsync(b => b.Barcode == barcode && b.IsActive != false);
            
            return count > 0;
        }
    }
}
