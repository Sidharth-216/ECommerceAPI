using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Domain.Entities.Mongo;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Application.Services
{
    public class MongoAddressService : IMongoAddressService
    {
        private readonly IAddressMongoRepository _repository;

        public MongoAddressService(IAddressMongoRepository repository)
        {
            _repository = repository ?? throw new ArgumentNullException(nameof(repository));
        }

        public async Task<AddressMongo> GetByIdAsync(string id)
        {
            return await _repository.GetByIdAsync(id);
        }

        public async Task<IEnumerable<AddressMongo>> GetByUserIdAsync(string userId)
        {
            return await _repository.GetByUserIdAsync(userId);
        }

        public async Task<AddressMongo> AddAsync(AddressMongo address)
        {
            if (address == null)
                throw new ArgumentNullException(nameof(address));

            return await _repository.AddAsync(address);
        }

        public async Task UpdateAsync(AddressMongo address)
        {
            if (address == null)
                throw new ArgumentNullException(nameof(address));

            await _repository.UpdateAsync(address);
        }

        public async Task DeleteAsync(string id)
        {
            await _repository.DeleteAsync(id);
        }

        public async Task<AddressMongo> GetDefaultAddressAsync(string userId)
        {
            return await _repository.GetDefaultAddressAsync(userId);
        }

        public async Task UnsetDefaultAddressesAsync(string userId, string exceptId = null)
        {
            await _repository.UnsetDefaultAddressesAsync(userId, exceptId);
        }
    }
}
