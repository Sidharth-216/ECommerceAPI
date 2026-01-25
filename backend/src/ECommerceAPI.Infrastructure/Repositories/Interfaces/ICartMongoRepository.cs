using System.Collections.Generic;
using System.Threading.Tasks;
using ECommerceAPI.Domain.Entities.Mongo;

namespace ECommerceAPI.Infrastructure.Repositories.Interfaces
{
    public interface ICartMongoRepository
    {
        Task<CartMongo?> GetByIdAsync(string id);
        Task<CartMongo?> GetByUserIdAsync(int userId);
        Task AddAsync(CartMongo cart);
        Task UpdateAsync(string id, CartMongo cart);
        Task DeleteAsync(string id);
        Task<IEnumerable<CartMongo>> GetAllAsync();
    }
}
