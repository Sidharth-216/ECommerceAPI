using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using ECommerceAPI.Domain.Entities;
using ECommerceAPI.Infrastructure.Data;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Infrastructure.Repositories
{
    /// <summary>
    /// Email OTP Repository Implementation
    /// </summary>
    public class EmailOtpRepository : IEmailOtpRepository
    {
        private readonly ApplicationDbContext _context;

        public EmailOtpRepository(ApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<EmailOtp> AddAsync(EmailOtp emailOtp)
        {
            await _context.EmailOtps.AddAsync(emailOtp);
            await _context.SaveChangesAsync();
            return emailOtp;
        }

        public async Task<EmailOtp> GetLatestValidOtpAsync(string email)
        {
            return await _context.EmailOtps
                .Where(o => o.Email == email && !o.IsUsed && o.ExpiresAt > DateTime.UtcNow)
                .OrderByDescending(o => o.CreatedAt)
                .FirstOrDefaultAsync();
        }

        public async Task<EmailOtp> GetByEmailAndCodeAsync(string email, string otpCode)
        {
            return await _context.EmailOtps
                .Where(o => o.Email == email && o.OtpCode == otpCode)
                .OrderByDescending(o => o.CreatedAt)
                .FirstOrDefaultAsync();
        }

        public async Task UpdateAsync(EmailOtp emailOtp)
        {
            _context.EmailOtps.Update(emailOtp);
            await _context.SaveChangesAsync();
        }

        public async Task DeleteExpiredOtpsAsync(DateTime beforeDate)
        {
            var expiredOtps = await _context.EmailOtps
                .Where(o => o.ExpiresAt < beforeDate)
                .ToListAsync();

            _context.EmailOtps.RemoveRange(expiredOtps);
            await _context.SaveChangesAsync();
        }

        public async Task<List<EmailOtp>> GetAllByEmailAsync(string email)
        {
            return await _context.EmailOtps
                .Where(o => o.Email == email)
                .OrderByDescending(o => o.CreatedAt)
                .ToListAsync();
        }

        public async Task InvalidateAllForEmailAsync(string email)
        {
            var otps = await _context.EmailOtps
                .Where(o => o.Email == email && !o.IsUsed)
                .ToListAsync();

            foreach (var otp in otps)
            {
                otp.MarkAsUsed();
            }

            await _context.SaveChangesAsync();
        }
    }
}