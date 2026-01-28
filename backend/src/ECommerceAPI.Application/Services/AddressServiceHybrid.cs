using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ECommerceAPI.Domain.Entities;
using ECommerceAPI.Domain.Entities.Mongo;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Application.Services
{
    public interface IAddressServiceHybrid
    {
        // Legacy int userId methods
        Task<Address> AddAsync(int userId, Address address);
        Task<List<Address>> GetAllAsync(int userId);
        Task<Address?> UpdateAsync(int userId, int addressId, Address updated);
        Task<bool> DeleteAsync(int userId, int addressId);

        // New string userId methods (MongoDB)
        Task<AddressMongo> AddByUserIdStringAsync(string userId, AddressMongo address);
        Task<List<AddressMongo>> GetAllByUserIdStringAsync(string userId);
        Task<AddressMongo?> UpdateByUserIdStringAsync(string userId, string addressId, AddressMongo updated);
        Task<bool> DeleteByUserIdStringAsync(string userId, string addressId);
    }

    public class AddressServiceHybrid : IAddressServiceHybrid
    {
        private readonly IAddressRepository _sqlRepository;
        private readonly IAddressMongoRepository _mongoRepository;
        private readonly IConfiguration _configuration;
        private readonly ILogger<AddressServiceHybrid> _logger;

        private readonly bool _useMongo;

        public AddressServiceHybrid(
            IAddressRepository sqlRepository,
            IAddressMongoRepository mongoRepository,
            IConfiguration configuration,
            ILogger<AddressServiceHybrid> logger)
        {
            _sqlRepository = sqlRepository;
            _mongoRepository = mongoRepository;
            _configuration = configuration;
            _logger = logger;

            _useMongo = _configuration.GetValue<bool>("FeatureFlags:UseMongoForAddresses");

            _logger.LogInformation($"AddressServiceHybrid initialized: UseMongo={_useMongo}");
        }

        // ========================================================================
        // MongoDB STRING USERID METHODS
        // ========================================================================

        public async Task<AddressMongo> AddByUserIdStringAsync(string userId, AddressMongo address)
        {
            if (address == null)
                throw new ArgumentNullException(nameof(address));

            address.UserId = userId;
            address.CreatedAt = DateTime.UtcNow;

            // If this is set as default, unset other defaults
            if (address.IsDefault)
            {
                await _mongoRepository.UnsetDefaultAddressesAsync(userId);
            }

            return await _mongoRepository.AddAsync(address);
        }

        public async Task<List<AddressMongo>> GetAllByUserIdStringAsync(string userId)
        {
            var addresses = await _mongoRepository.GetByUserIdStringAsync(userId);
            return addresses.ToList();
        }

        public async Task<AddressMongo?> UpdateByUserIdStringAsync(string userId, string addressId, AddressMongo updated)
        {
            if (updated == null)
                throw new ArgumentNullException(nameof(updated));

            var address = await _mongoRepository.GetByIdAsync(addressId);

            if (address == null || address.UserId != userId)
                return null;

            address.AddressLine1 = updated.AddressLine1;
            address.AddressLine2 = updated.AddressLine2;
            address.City = updated.City;
            address.State = updated.State;
            address.PostalCode = updated.PostalCode;
            address.Country = updated.Country;
            address.IsDefault = updated.IsDefault;

            // If setting as default, unset others
            if (updated.IsDefault)
            {
                await _mongoRepository.UnsetDefaultAddressesAsync(userId, addressId);
            }

            await _mongoRepository.UpdateAsync(address);
            return address;
        }

        public async Task<bool> DeleteByUserIdStringAsync(string userId, string addressId)
        {
            var address = await _mongoRepository.GetByIdAsync(addressId);

            if (address == null || address.UserId != userId)
                return false;

            await _mongoRepository.DeleteAsync(addressId);
            return true;
        }

        // ========================================================================
        // LEGACY INT USERID METHODS (SQL)
        // ========================================================================

        public async Task<Address> AddAsync(int userId, Address address)
        {
            if (address == null)
                throw new ArgumentNullException(nameof(address));

            address.Id = 0;
            address.UserId = userId;
            address.CreatedAt = DateTime.UtcNow;

            if (address.IsDefault)
            {
                var others = await _sqlRepository.GetByUserIdAsync(userId);
                foreach (var other in others.Where(a => a.IsDefault))
                {
                    other.IsDefault = false;
                    await _sqlRepository.UpdateAsync(other);
                }
            }

            return await _sqlRepository.AddAsync(address);
        }

        public async Task<List<Address>> GetAllAsync(int userId)
        {
            var addresses = await _sqlRepository.GetByUserIdAsync(userId);
            return addresses.OrderByDescending(a => a.CreatedAt).ToList();
        }

        public async Task<Address?> UpdateAsync(int userId, int addressId, Address updated)
        {
            if (updated == null)
                throw new ArgumentNullException(nameof(updated));

            var address = await _sqlRepository.GetByIdAsync(addressId);

            if (address == null || address.UserId != userId)
                return null;

            address.AddressLine1 = updated.AddressLine1;
            address.AddressLine2 = updated.AddressLine2;
            address.City = updated.City;
            address.State = updated.State;
            address.PostalCode = updated.PostalCode;
            address.Country = updated.Country;
            address.IsDefault = updated.IsDefault;

            if (updated.IsDefault)
            {
                var others = await _sqlRepository.GetByUserIdAsync(userId);
                foreach (var other in others.Where(a => a.Id != addressId && a.IsDefault))
                {
                    other.IsDefault = false;
                    await _sqlRepository.UpdateAsync(other);
                }
            }

            await _sqlRepository.UpdateAsync(address);
            return address;
        }

        public async Task<bool> DeleteAsync(int userId, int addressId)
        {
            var address = await _sqlRepository.GetByIdAsync(addressId);

            if (address == null || address.UserId != userId)
                return false;

            await _sqlRepository.DeleteAsync(addressId);
            return true;
        }
    }
}