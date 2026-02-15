/*using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ECommerceAPI.Domain.Entities.MongoDB;

namespace ECommerceAPI.Infrastructure.Repositories.Interfaces
{
    public interface IMongoEmailOtpRepository
    {
        Task<MongoEmailOtp> AddAsync(MongoEmailOtp emailOtp);
        Task<MongoEmailOtp?> GetLatestValidOtpAsync(string email);
        Task<MongoEmailOtp?> GetByEmailAndCodeAsync(string email, string otpCode);
        Task UpdateAsync(MongoEmailOtp emailOtp);
        Task DeleteExpiredOtpsAsync(DateTime beforeDate);
        Task<List<MongoEmailOtp>> GetAllByEmailAsync(string email);
        Task InvalidateAllForEmailAsync(string email);
    }
}
*/
using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using ECommerceAPI.Domain.Entities.MongoDB;

namespace ECommerceAPI.Infrastructure.Repositories.Interfaces
{
    /// <summary>
    /// MongoDB Email OTP Repository Interface
    /// </summary>
    public interface IMongoEmailOtpRepository
    {
        Task<MongoEmailOtp> AddAsync(MongoEmailOtp emailOtp);
        Task<MongoEmailOtp?> GetLatestValidOtpAsync(string email);
        Task<MongoEmailOtp?> GetByEmailAndCodeAsync(string email, string otpCode);
        Task UpdateAsync(MongoEmailOtp emailOtp);
        Task DeleteExpiredOtpsAsync(DateTime beforeDate);
        Task<List<MongoEmailOtp>> GetAllByEmailAsync(string email);
        Task InvalidateAllForEmailAsync(string email);
    }
}
