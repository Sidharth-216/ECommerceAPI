using System.Threading.Tasks;

namespace ECommerceAPI.Application.Interfaces
{
    public interface IMongoEmailOtpService
    {
        Task<bool> GenerateAndSendOtpAsync(string email);
        Task<bool> VerifyOtpAsync(string email, string otp);
        Task<bool> IsOtpValidAsync(string email);
    }
}