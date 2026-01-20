using System.Threading.Tasks;

namespace ECommerceAPI.Application.Interfaces
{
    /// <summary>
    /// Email OTP Service Interface
    /// Handles generation, sending, and verification of email OTPs
    /// </summary>
    public interface IEmailOtpService
    {
        /// <summary>
        /// Generate and send OTP to email
        /// </summary>
        /// <param name="email">Email address to send OTP to</param>
        /// <returns>True if OTP was sent successfully</returns>
        Task<bool> GenerateAndSendOtpAsync(string email);

        /// <summary>
        /// Verify OTP for email
        /// </summary>
        /// <param name="email">Email address</param>
        /// <param name="otp">OTP code to verify</param>
        /// <returns>True if OTP is valid</returns>
        Task<bool> VerifyOtpAsync(string email, string otp);

        /// <summary>
        /// Clean up expired OTPs from database
        /// </summary>
        Task CleanupExpiredOtpsAsync();
        Task<bool> GenerateAndSendOtpAsync(string email, string ipAddress);

    }
}