using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Cart;

namespace ECommerceAPI.Application.Interfaces
{
    public interface ICartService
    {
        Task<CartDto> GetCartAsync(int userId);

        Task<CartDto> AddToCartAsync(int userId, string productId, int quantity);

        Task<CartDto> UpdateQuantityAsync(int userId, string productId, int quantity);

        Task RemoveFromCartAsync(int userId, string productId);

        Task ClearCartAsync(int userId);
    }
}
