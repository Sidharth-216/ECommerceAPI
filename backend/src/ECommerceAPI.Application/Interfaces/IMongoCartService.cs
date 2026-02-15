using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Cart;

namespace ECommerceAPI.Application.Interfaces
{
    /// <summary>
    /// MongoDB Cart Service Interface
    /// Handles shopping cart operations using MongoDB storage
    /// </summary>
    public interface IMongoCartService
    {
        /// <summary>
        /// Get cart for a user (MongoDB ObjectId)
        /// </summary>
        Task<CartDto> GetCartAsync(string userId);

        /// <summary>
        /// Add item to cart
        /// </summary>
        Task<CartDto> AddItemAsync(string userId, string productId, int quantity = 1);

        /// <summary>
        /// Update item quantity in cart
        /// </summary>
        Task<CartDto> UpdateItemQuantityAsync(string userId, string productId, int quantity);

        /// <summary>
        /// Remove item from cart
        /// </summary>
        Task<CartDto> RemoveItemAsync(string userId, string productId);

        /// <summary>
        /// Clear entire cart
        /// </summary>
        Task ClearCartAsync(string userId);
    }
}