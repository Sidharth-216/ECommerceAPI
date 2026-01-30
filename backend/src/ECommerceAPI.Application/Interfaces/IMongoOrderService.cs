using System.Collections.Generic;
using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Orders;

namespace ECommerceAPI.Application.Interfaces
{
    /// <summary>
    /// MongoDB Order Service Interface - Pure MongoDB Support
    /// </summary>
    public interface IMongoOrderService
    {
        // ═══════════════════════════════════════════════════════════
        // PURE MONGODB METHODS (Use these for MongoDB-only mode)
        // ═══════════════════════════════════════════════════════════

        /// <summary>
        /// Create a new order from cart (Pure MongoDB)
        /// </summary>
        /// <param name="mongoUserId">MongoDB User ObjectId (24 hex characters)</param>
        /// <param name="createDto">Order creation data</param>
        Task<OrderDto> CreateOrderAsync(string mongoUserId, CreateOrderDto createDto);

        /// <summary>
        /// Get all orders for a user (Pure MongoDB)
        /// </summary>
        /// <param name="mongoUserId">MongoDB User ObjectId (24 hex characters)</param>
        Task<IEnumerable<OrderDto>> GetUserOrdersAsync(string mongoUserId);

        /// <summary>
        /// Get order by MongoDB ID (Pure MongoDB)
        /// </summary>
        /// <param name="mongoId">MongoDB Order ObjectId</param>
        /// <param name="mongoUserId">MongoDB User ObjectId</param>
        Task<OrderDto> GetOrderByMongoIdAsync(string mongoId, string mongoUserId);

        /// <summary>
        /// Get order by Order Number (Pure MongoDB)
        /// </summary>
        /// <param name="orderNumber">Order number</param>
        /// <param name="mongoUserId">MongoDB User ObjectId</param>
        Task<OrderDto> GetOrderByOrderNumberAsync(string orderNumber, string mongoUserId);

        /// <summary>
        /// Cancel an order (Pure MongoDB)
        /// </summary>
        /// <param name="mongoId">MongoDB Order ObjectId</param>
        /// <param name="mongoUserId">MongoDB User ObjectId</param>
        Task CancelOrderAsync(string mongoId, string mongoUserId);

        // ═══════════════════════════════════════════════════════════
        // LEGACY SQL OVERLOADS (For backwards compatibility)
        // These throw NotSupportedException in pure MongoDB mode
        // ═══════════════════════════════════════════════════════════

        /// <summary>
        /// [LEGACY] Create order with SQL User ID - Not supported in pure MongoDB mode
        /// </summary>
        Task<OrderDto> CreateOrderAsync(int sqlUserId, CreateOrderDto createDto);

        /// <summary>
        /// [LEGACY] Get orders with SQL User ID - Not supported in pure MongoDB mode
        /// </summary>
        Task<IEnumerable<OrderDto>> GetUserOrdersAsync(int sqlUserId);

        /// <summary>
        /// [LEGACY] Get order with SQL User ID - Not supported in pure MongoDB mode
        /// </summary>
        Task<OrderDto> GetOrderByMongoIdAsync(string mongoId, int sqlUserId);

        /// <summary>
        /// [LEGACY] Get order by number with SQL User ID - Not supported in pure MongoDB mode
        /// </summary>
        Task<OrderDto> GetOrderByOrderNumberAsync(string orderNumber, int sqlUserId);

        /// <summary>
        /// [LEGACY] Cancel order with SQL User ID - Not supported in pure MongoDB mode
        /// </summary>
        Task CancelOrderAsync(string mongoId, int sqlUserId);

        // ═══════════════════════════════════════════════════════════
        // COMMON METHODS (Work in both modes)
        // ═══════════════════════════════════════════════════════════

        /// <summary>
        /// Get all orders (Admin only)
        /// </summary>
        Task<IEnumerable<OrderDto>> GetAllOrdersAsync();

        /// <summary>
        /// Check if order exists
        /// </summary>
        /// <param name="mongoId">MongoDB Order ObjectId</param>
        Task<bool> OrderExistsAsync(string mongoId);
    }
}