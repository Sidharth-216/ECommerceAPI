using System.Threading.Tasks;

namespace ECommerceAPI.Application.Interfaces
{
    /// <summary>
    /// OTP Service Interface for handling OTP generation and verification
    /// </summary>
    public interface IOtpService
    {
        /// <summary>
        /// Generate and send OTP to mobile number
        /// </summary>
        Task<bool> GenerateAndSendOtpAsync(string mobile);
        
        /// <summary>
        /// Verify OTP for mobile number
        /// </summary>
        Task<bool> VerifyOtpAsync(string mobile, string otp);
        
        /// <summary>
        /// Check if OTP is still valid
        /// </summary>
        Task<bool> IsOtpValidAsync(string mobile);
    }
}