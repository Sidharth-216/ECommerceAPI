using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ECommerceAPI.Domain.Entities;

namespace ECommerceAPI.Infrastructure.Repositories.Interfaces
{
    /// <summary>
    /// Email OTP Repository Interface
    /// </summary>
    public interface IEmailOtpRepository
    {
        /// <summary>
        /// Add new OTP record
        /// </summary>
        Task<EmailOtp> AddAsync(EmailOtp emailOtp);

        /// <summary>
        /// Get the latest valid OTP for an email
        /// </summary>
        Task<EmailOtp> GetLatestValidOtpAsync(string email);

        /// <summary>
        /// Get OTP by email and code
        /// </summary>
        Task<EmailOtp> GetByEmailAndCodeAsync(string email, string otpCode);

        /// <summary>
        /// Update OTP record
        /// </summary>
        Task UpdateAsync(EmailOtp emailOtp);

        /// <summary>
        /// Delete expired OTPs
        /// </summary>
        Task DeleteExpiredOtpsAsync(DateTime beforeDate);

        /// <summary>
        /// Get all OTPs for an email (for admin/debug purposes)
        /// </summary>
        Task<List<EmailOtp>> GetAllByEmailAsync(string email);

        /// <summary>
        /// Invalidate all previous OTPs for an email
        /// </summary>
        Task InvalidateAllForEmailAsync(string email);
    }
}