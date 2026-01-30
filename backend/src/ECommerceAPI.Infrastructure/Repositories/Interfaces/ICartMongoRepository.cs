using System.Collections.Generic;
using System.Threading.Tasks;
using ECommerceAPI.Domain.Entities.Mongo;

namespace ECommerceAPI.Infrastructure.Repositories.Interfaces
{
    public interface ICartMongoRepository
    {
        // ========== PRIMARY (MongoDB) ==========
        Task<CartMongo> GetByUserIdAsync(string userId);
        Task<CartItemMongo?> GetCartItemAsync(string userId, string productId);
        Task DeleteByUserIdAsync(string userId);

        // ========== LEGACY (SQL compatibility) ==========
        Task<CartMongo> GetByUserIdAsync(int userId);
        Task<CartItemMongo?> GetCartItemAsync(int userId, string productId);
        Task DeleteByUserIdAsync(int userId);

        // ========== COMMON ==========
        Task<CartMongo> GetBySqlIdAsync(int sqlId);
        Task<CartMongo> GetByIdAsync(string mongoId);
        Task AddAsync(CartMongo cart);
        Task UpdateAsync(string id, CartMongo cart);
        Task DeleteAsync(string id);
        Task<IEnumerable<CartMongo>> GetAllAsync();
        Task<bool> UpdateCartTotalsAsync(string id);
    }
}
