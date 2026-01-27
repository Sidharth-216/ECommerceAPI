using System.Collections.Generic;
using System.Threading.Tasks;
using ECommerceAPI.Domain.Entities.MongoDB;

namespace ECommerceAPI.Infrastructure.Repositories.Interfaces
{
    /// <summary>
    /// MongoDB User Repository Interface
    /// </summary>
    public interface IMongoUserRepository
    {
        Task<MongoUser> GetByIdAsync(string id);
        Task<MongoUser> GetByEmailAsync(string email);
        Task<MongoUser> GetByMobileAsync(string mobile);
        Task<MongoUser> AddAsync(MongoUser user);
        Task UpdateAsync(MongoUser user);
        Task<bool> EmailExistsAsync(string email);
        Task<bool> MobileExistsAsync(string mobile);
        Task<IEnumerable<MongoUser>> GetAllAsync();
        Task DeleteAsync(string id);
        Task<MongoUser> GetBySqlUserIdAsync(int sqlUserId);
    }
}