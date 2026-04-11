using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using MongoDB.Bson;
using MongoDB.Driver;
using ECommerceAPI.Domain.Entities.Mongo;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Infrastructure.Repositories.Implementations
{
    /// <summary>
    /// MongoDB repository for QR payment sessions.
    /// Collection name: "qr_payments"
    /// </summary>
    public class QRPaymentRepository : IQRPaymentRepository
    {
        private readonly IMongoCollection<MongoQRPayment> _payments;

        public QRPaymentRepository(IMongoDatabase database)
        {
            _payments = database.GetCollection<MongoQRPayment>("qr_payments");
            CreateIndexes();
        }

        // ─────────────────────────────────────────────────────────────────────
        // Index setup (runs once at startup – MongoDB ignores duplicates)
        // ─────────────────────────────────────────────────────────────────────

        private void CreateIndexes()
        {
            // orderId – most queries filter by this
            _payments.Indexes.CreateOne(new CreateIndexModel<MongoQRPayment>(
                Builders<MongoQRPayment>.IndexKeys.Ascending(p => p.OrderId)));

            // userId – for user-facing status checks
            _payments.Indexes.CreateOne(new CreateIndexModel<MongoQRPayment>(
                Builders<MongoQRPayment>.IndexKeys.Ascending(p => p.UserId)));

            // status – admin queries for pending confirmations
            _payments.Indexes.CreateOne(new CreateIndexModel<MongoQRPayment>(
                Builders<MongoQRPayment>.IndexKeys.Ascending(p => p.Status)));

            // TTL index: automatically delete expired sessions after 24 h of expiry
            _payments.Indexes.CreateOne(new CreateIndexModel<MongoQRPayment>(
                Builders<MongoQRPayment>.IndexKeys.Ascending(p => p.ExpiresAt),
                new CreateIndexOptions
                {
                    ExpireAfter = TimeSpan.FromHours(24),
                    Name = "ttl_expires_at"
                }));
        }

        // ─────────────────────────────────────────────────────────────────────
        // IQRPaymentRepository implementation
        // ─────────────────────────────────────────────────────────────────────

        public async Task<MongoQRPayment> GetByIdAsync(string id)
        {
            if (string.IsNullOrWhiteSpace(id) || !ObjectId.TryParse(id, out _))
                return null;

            return await _payments.Find(p => p.Id == id).FirstOrDefaultAsync();
        }

        public async Task<MongoQRPayment> GetActiveByOrderIdAsync(string orderId)
        {
            if (string.IsNullOrWhiteSpace(orderId)) return null;

            // "Active" = not Cancelled and not Expired
            var filter = Builders<MongoQRPayment>.Filter.And(
                Builders<MongoQRPayment>.Filter.Eq(p => p.OrderId, orderId),
                Builders<MongoQRPayment>.Filter.Nin(p => p.Status,
                    new[] { QRPaymentStatus.Cancelled, QRPaymentStatus.Expired })
            );

            return await _payments
                .Find(filter)
                .SortByDescending(p => p.CreatedAt)
                .FirstOrDefaultAsync();
        }

        public async Task<IEnumerable<MongoQRPayment>> GetByOrderIdAsync(string orderId)
        {
            if (string.IsNullOrWhiteSpace(orderId))
                return new List<MongoQRPayment>();

            return await _payments
                .Find(p => p.OrderId == orderId)
                .SortByDescending(p => p.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<MongoQRPayment>> GetPendingConfirmationsAsync()
        {
            // Admin should act only after user marks payment as received.
            var filter = Builders<MongoQRPayment>.Filter.Eq(
                p => p.Status,
                QRPaymentStatus.PaymentReceived);

            return await _payments
                .Find(filter)
                .SortByDescending(p => p.CreatedAt)
                .ToListAsync();
        }

        public async Task<IEnumerable<MongoQRPayment>> GetAllAsync()
        {
            return await _payments
                .Find(_ => true)
                .SortByDescending(p => p.CreatedAt)
                .ToListAsync();
        }

        public async Task<MongoQRPayment> AddAsync(MongoQRPayment payment)
        {
            if (payment == null) throw new ArgumentNullException(nameof(payment));

            if (payment.CreatedAt == default) payment.CreatedAt = DateTime.UtcNow;

            await _payments.InsertOneAsync(payment);
            return payment;
        }

        public async Task<bool> UpdateAsync(MongoQRPayment payment)
        {
            if (payment == null) throw new ArgumentNullException(nameof(payment));
            if (string.IsNullOrWhiteSpace(payment.Id)) return false;

            payment.UpdatedAt = DateTime.UtcNow;

            var result = await _payments.ReplaceOneAsync(
                p => p.Id == payment.Id,
                payment);

            return result.ModifiedCount > 0;
        }
    }
}