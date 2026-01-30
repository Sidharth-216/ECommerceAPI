using System.Collections.Generic;
using System.Threading.Tasks;
using ECommerceAPI.Domain.Entities.MongoDB;

namespace ECommerceAPI.Infrastructure.Repositories.Interfaces
{
    /// <summary>
    /// MongoDB Order Repository Interface
    /// </summary>
    public interface IMongoOrderRepository
    {
        /// <summary>
        /// Get order by MongoDB ObjectId
        /// </summary>
        Task<MongoOrder> GetByIdAsync(string id);

        /// <summary>
        /// Get order by order number
        /// </summary>
        Task<MongoOrder> GetByOrderNumberAsync(string orderNumber);

        /// <summary>
        /// Get all orders for a user
        /// </summary>
        Task<IEnumerable<MongoOrder>> GetByUserIdAsync(string userId);

        /// <summary>
        /// Add a new order
        /// </summary>
        Task<MongoOrder> AddAsync(MongoOrder order);

        /// <summary>
        /// Update an existing order
        /// </summary>
        Task UpdateAsync(MongoOrder order);

        /// <summary>
        /// Get all orders
        /// </summary>
        Task<IEnumerable<MongoOrder>> GetAllAsync();

        /// <summary>
        /// Check if order exists
        /// </summary>
        Task<bool> ExistsAsync(string id);

        /// <summary>
        /// Delete an order (soft delete recommended)
        /// </summary>
        Task DeleteAsync(string id);

        /// <summary>
        /// Get orders by status
        /// </summary>
        Task<IEnumerable<MongoOrder>> GetByStatusAsync(string status);

        /// <summary>
        /// Get orders within date range
        /// </summary>
        Task<IEnumerable<MongoOrder>> GetOrdersByDateRangeAsync(System.DateTime startDate, System.DateTime endDate);
    }
}