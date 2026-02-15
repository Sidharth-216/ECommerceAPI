using System.Collections.Generic;
using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Orders;
using ECommerceAPI.Domain.Entities.MongoDB;

namespace ECommerceAPI.Application.Interfaces
{
    /// <summary>
    /// MongoDB Order Service Interface - CORRECTED to match existing implementation
    /// </summary>
    public interface IMongoOrderService
    {
        /// <summary>
        /// Create an order from cart (Pure MongoDB)
        /// </summary>
        Task<OrderDto> CreateOrderAsync(string mongoUserId, CreateOrderDto createDto);

        /// <summary>
        /// Create an order from cart (SQL compatibility - throws NotSupportedException)
        /// </summary>
        Task<OrderDto> CreateOrderAsync(int sqlUserId, CreateOrderDto createDto);

        /// <summary>
        /// Get all orders for a user (Pure MongoDB)
        /// </summary>
        Task<IEnumerable<OrderDto>> GetUserOrdersAsync(string mongoUserId);

        /// <summary>
        /// Get all orders for a user (SQL compatibility - throws NotSupportedException)
        /// </summary>
        Task<IEnumerable<OrderDto>> GetUserOrdersAsync(int sqlUserId);

        /// <summary>
        /// Get order by MongoDB ID (Pure MongoDB)
        /// </summary>
        Task<OrderDto> GetOrderByMongoIdAsync(string mongoId, string mongoUserId);

        /// <summary>
        /// Get order by MongoDB ID (SQL compatibility - throws NotSupportedException)
        /// </summary>
        Task<OrderDto> GetOrderByMongoIdAsync(string mongoId, int sqlUserId);

        /// <summary>
        /// Get order by order number (Pure MongoDB)
        /// </summary>
        Task<OrderDto> GetOrderByOrderNumberAsync(string orderNumber, string mongoUserId);

        /// <summary>
        /// Get order by order number (SQL compatibility - throws NotSupportedException)
        /// </summary>
        Task<OrderDto> GetOrderByOrderNumberAsync(string orderNumber, int sqlUserId);

        /// <summary>
        /// Cancel an order (Pure MongoDB) - Returns Task (void)
        /// </summary>
        Task CancelOrderAsync(string mongoId, string mongoUserId);

        /// <summary>
        /// Cancel an order (SQL compatibility - throws NotSupportedException)
        /// </summary>
        Task CancelOrderAsync(string mongoId, int sqlUserId);

        /// <summary>
        /// Get all orders (Admin)
        /// </summary>
        Task<IEnumerable<OrderDto>> GetAllOrdersAsync();

        /// <summary>
        /// Check if order exists
        /// </summary>
        Task<bool> OrderExistsAsync(string mongoId);

        /// <summary>
        /// Update order status (ADMIN ONLY)
        /// </summary>
        /// <param name="orderId">MongoDB ObjectId of the order</param>
        /// <param name="newStatus">New status (Pending, Processing, Shipped, Delivered, Cancelled)</param>
        /// <returns>True if update successful, false if order not found</returns>
        Task<bool> UpdateOrderStatusAsync(string orderId, string newStatus);
    }
}