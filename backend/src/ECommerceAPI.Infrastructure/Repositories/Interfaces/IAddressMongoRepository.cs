using System.Collections.Generic;
using System.Threading.Tasks;
using ECommerceAPI.Domain.Entities.Mongo;

namespace ECommerceAPI.Infrastructure.Repositories.Interfaces
{
    public interface IAddressMongoRepository
    {
        // String UserId methods (MongoDB ObjectId)
        Task<AddressMongo> GetByIdAsync(string id);
        Task<IEnumerable<AddressMongo>> GetByUserIdStringAsync(string userId);
        Task<AddressMongo> AddAsync(AddressMongo address);
        Task UpdateAsync(AddressMongo address);
        Task DeleteAsync(string id);
        Task<AddressMongo> GetDefaultAddressAsync(string userId);
        Task UnsetDefaultAddressesAsync(string userId, string exceptId = null);
        
        // Legacy int UserId methods (backward compatibility)
        Task<IEnumerable<AddressMongo>> GetByUserIdAsync(int userId);
    }
}