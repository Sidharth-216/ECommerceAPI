using System.Threading.Tasks;
using ECommerceAPI.Domain.Entities;

namespace ECommerceAPI.Infrastructure.Repositories.Interfaces
{
    public interface IOtpRepository
    {
        Task<Otp> AddAsync(Otp otp);
        Task UpdateAsync(Otp otp);
        Task<Otp> GetLatestValidOtpAsync(string mobile);
        Task InvalidateExistingOtpsAsync(string mobile);
        Task InvalidateOtpAsync(int otpId);
    }
}