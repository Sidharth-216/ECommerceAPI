using System.Threading.Tasks;
using ECommerceAPI.Domain.Entities;

namespace ECommerceAPI.Infrastructure.Repositories.Interfaces
{
    public interface ICartRepository
    {
        Task<Cart> GetByUserIdAsync(int userId);
        Task<Cart> AddAsync(Cart cart);
        Task UpdateAsync(Cart cart);
        Task<IEnumerable<Cart>> GetAllAsync();
    }
}
