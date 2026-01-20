using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Cart;

namespace ECommerceAPI.Application.Interfaces
{
    /// <summary>
    /// Cart Service Interface - Defines shopping cart operations
    /// </summary>
    public interface ICartService
    {
        Task<CartDto> GetCartAsync(int userId);
        Task<CartDto> AddToCartAsync(int userId, int productId, int quantity);
        Task<CartDto> UpdateQuantityAsync(int userId, int productId, int quantity);
        Task RemoveFromCartAsync(int userId, int productId);
        Task ClearCartAsync(int userId);
    }
}