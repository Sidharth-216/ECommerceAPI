using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Cart;

using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Cart;

namespace ECommerceAPI.Application.Interfaces
{
    public interface ICartService
    {
        // ========== Legacy Methods (SQL - int userId) ==========
        Task<CartDto> GetCartAsync(int userId);
        Task<CartDto> AddToCartAsync(int userId, string productId, int quantity);
        Task<CartDto> UpdateQuantityAsync(int userId, string productId, int quantity);
        Task RemoveFromCartAsync(int userId, string productId);
        Task ClearCartAsync(int userId);

        // ========== New Methods (MongoDB - string userId) ==========
        Task<CartDto> GetCartByUserIdStringAsync(string userId);
        Task<CartDto> AddToCartByUserIdStringAsync(string userId, string productId, int quantity);
        Task<CartDto> UpdateQuantityByUserIdStringAsync(string userId, string productId, int quantity);
        Task RemoveFromCartByUserIdStringAsync(string userId, string productId);
        Task ClearCartByUserIdStringAsync(string userId);
    }

}
