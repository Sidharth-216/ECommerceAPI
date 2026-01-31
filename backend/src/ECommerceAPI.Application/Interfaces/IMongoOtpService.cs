using System.Threading.Tasks;

namespace ECommerceAPI.Application.Interfaces
{
    public interface IMongoOtpService
    {
        Task<bool> GenerateAndSendOtpAsync(string mobile);
        Task<bool> VerifyOtpAsync(string mobile, string otp);
        Task<bool> IsOtpValidAsync(string mobile);
    }
}