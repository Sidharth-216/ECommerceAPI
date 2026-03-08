using System.Collections.Generic;
using System.Threading.Tasks;
using ECommerceAPI.Domain.Entities.Mongo;

namespace ECommerceAPI.Infrastructure.Repositories.Interfaces
{
    /// <summary>
    /// Repository interface for QR payment sessions stored in MongoDB.
    /// </summary>
    public interface IQRPaymentRepository
    {
        /// <summary>Get payment session by its own ObjectId</summary>
        Task<MongoQRPayment> GetByIdAsync(string id);

        /// <summary>
        /// Get the active (non-expired, non-cancelled) payment session for an order.
        /// Returns null if none exists.
        /// </summary>
        Task<MongoQRPayment> GetActiveByOrderIdAsync(string orderId);

        /// <summary>Get ALL payment sessions for an order (history)</summary>
        Task<IEnumerable<MongoQRPayment>> GetByOrderIdAsync(string orderId);

        /// <summary>
        /// Get all sessions awaiting admin confirmation
        /// (status == PaymentReceived or AwaitingPayment and not yet expired)
        /// </summary>
        Task<IEnumerable<MongoQRPayment>> GetPendingConfirmationsAsync();

        /// <summary>Get all sessions (admin view)</summary>
        Task<IEnumerable<MongoQRPayment>> GetAllAsync();

        /// <summary>Insert a new payment session</summary>
        Task<MongoQRPayment> AddAsync(MongoQRPayment payment);

        /// <summary>Replace the existing document (full update)</summary>
        Task<bool> UpdateAsync(MongoQRPayment payment);
    }
}