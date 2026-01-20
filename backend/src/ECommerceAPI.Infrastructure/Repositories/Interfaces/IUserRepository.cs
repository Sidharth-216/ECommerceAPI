using System.Threading.Tasks;
using System.Collections.Generic;
using ECommerceAPI.Domain.Entities;

namespace ECommerceAPI.Infrastructure.Repositories.Interfaces
{
    public interface IUserRepository
    {
        Task<User> GetByIdAsync(int id);
        Task<User> GetByEmailAsync(string email);
        Task<User> GetByMobileAsync(string mobile); // NEW
        Task<User> AddAsync(User user);
        Task UpdateAsync(User user);
        Task<bool> EmailExistsAsync(string email);
        Task<bool> MobileExistsAsync(string mobile); // NEW
        Task<IEnumerable<User>> GetAllAsync();
        Task DeleteAsync(int id);
    }
}