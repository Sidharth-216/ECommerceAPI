using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ECommerceAPI.Domain.Entities;
using ECommerceAPI.Infrastructure.Data;

namespace ECommerceAPI.Application.Services
{
    public interface IAddressService
    {
        Task<Address> AddAsync(int userId, Address address);
        Task<List<Address>> GetAllAsync(int userId);
        Task<Address?> UpdateAsync(int userId, int addressId, Address updated);
        Task<bool> DeleteAsync(int userId, int addressId);
    }

    public class AddressService : IAddressService
    {
        private readonly ApplicationDbContext _context;

        public AddressService(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<Address> AddAsync(int userId, Address address)
        {
            if (address == null) throw new ArgumentNullException(nameof(address));

            address.Id = 0; // ensure insert
            address.UserId = userId;
            address.CreatedAt = DateTime.UtcNow;

            if (address.IsDefault)
            {
                // unset other defaults for this user
                var others = await _context.Addresses.Where(a => a.UserId == userId && a.IsDefault).ToListAsync();
                foreach (var o in others) o.IsDefault = false;
            }

            _context.Addresses.Add(address);
            await _context.SaveChangesAsync();

            return address;
        }

        public async Task<List<Address>> GetAllAsync(int userId)
        {
            return await _context.Addresses
                .Where(a => a.UserId == userId)
                .OrderByDescending(a => a.CreatedAt)
                .ToListAsync();
        }

        public async Task<Address?> UpdateAsync(int userId, int addressId, Address updated)
        {
            if (updated == null) throw new ArgumentNullException(nameof(updated));

            var address = await _context.Addresses.FirstOrDefaultAsync(a => a.Id == addressId && a.UserId == userId);
            if (address == null) return null;

            address.AddressLine1 = updated.AddressLine1;
            address.AddressLine2 = updated.AddressLine2;
            address.City = updated.City;
            address.State = updated.State;
            address.PostalCode = updated.PostalCode;
            address.Country = updated.Country;
            address.IsDefault = updated.IsDefault;

            if (updated.IsDefault)
            {
                var others = await _context.Addresses
                    .Where(a => a.UserId == userId && a.Id != addressId && a.IsDefault)
                    .ToListAsync();
                foreach (var o in others) o.IsDefault = false;
            }

            await _context.SaveChangesAsync();
            return address;
        }

        public async Task<bool> DeleteAsync(int userId, int addressId)
        {
            var address = await _context.Addresses.FirstOrDefaultAsync(a => a.Id == addressId && a.UserId == userId);
            if (address == null) return false;

            _context.Addresses.Remove(address);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}