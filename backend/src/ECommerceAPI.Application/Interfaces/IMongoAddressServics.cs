using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ECommerceAPI.Domain.Entities.Mongo;

namespace ECommerceAPI.Application.Interfaces
{
    public interface IMongoAddressService
    {
        // String UserId methods (MongoDB ObjectId)
        Task<AddressMongo> GetByIdAsync(string id);
        Task<IEnumerable<AddressMongo>> GetByUserIdAsync(string userId);
        Task<AddressMongo> AddAsync(AddressMongo address);
        Task UpdateAsync(AddressMongo address);
        Task DeleteAsync(string id);
        Task<AddressMongo> GetDefaultAddressAsync(string userId);
        Task UnsetDefaultAddressesAsync(string userId, string exceptId = null);
      
    }
}