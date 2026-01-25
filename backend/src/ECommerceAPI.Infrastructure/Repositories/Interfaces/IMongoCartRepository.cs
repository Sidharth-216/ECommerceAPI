using System.Collections.Generic;
using System.Threading.Tasks;
using ECommerceAPI.Domain.Entities.Mongo;

namespace ECommerceAPI.Infrastructure.Repositories.Interfaces.Mongo
{
    public interface IMongoCartRepository
    {
        Task<MongoCart> GetByUserIdAsync(string userId);
        Task<MongoCart> AddOrUpdateAsync(MongoCart cart);
        Task RemoveItemAsync(string userId, string mongoProductId);
        Task ClearCartAsync(string userId);
        Task<IEnumerable<MongoCart>> GetAllAsync();
    }
}
