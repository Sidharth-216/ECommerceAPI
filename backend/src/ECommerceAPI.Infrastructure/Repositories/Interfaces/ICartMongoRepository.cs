using System.Collections.Generic;
using System.Threading.Tasks;
using ECommerceAPI.Domain.Entities.Mongo;

namespace ECommerceAPI.Infrastructure.Repositories.Interfaces
{
    public interface ICartMongoRepository
    {
        // ========== New Methods - String UserId ==========
        Task<CartMongo> GetByUserIdStringAsync(string userId);
        Task<CartItemMongo?> GetCartItemByUserIdStringAsync(string userId, string productId);
        Task DeleteByUserIdStringAsync(string userId);

        // ========== Legacy Methods - int UserId ==========
        Task<CartMongo> GetByUserIdAsync(int userId);
        Task<CartItemMongo?> GetCartItemAsync(int userId, string productId);
        Task DeleteByUserIdAsync(int userId);

        // ========== Common Methods ==========
        Task<CartMongo> GetBySqlIdAsync(int sqlId);
        Task<CartMongo> GetByIdAsync(string mongoId);
        Task AddAsync(CartMongo cart);
        Task UpdateAsync(string id, CartMongo cart);
        Task DeleteAsync(string id);
        Task<IEnumerable<CartMongo>> GetAllAsync();
        Task<bool> UpdateCartTotalsAsync(string id);
    }
}