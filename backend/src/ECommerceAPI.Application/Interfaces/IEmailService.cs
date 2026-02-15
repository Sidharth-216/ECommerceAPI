using System.Threading.Tasks;

namespace ECommerceAPI.Application.Interfaces
{
    /// <summary>
    /// Email Service Interface
    /// </summary>
    public interface IEmailService
    {
        /// <summary>
        /// Sends an OTP email to the specified email address
        /// </summary>
        /// <param name="email">The recipient email address</param>
        /// <param name="otpCode">The OTP code to send</param>
        /// <param name="validityMinutes">How many minutes the OTP is valid for</param>
        /// <returns>True if email was sent successfully, false otherwise</returns>
        Task<bool> SendOtpEmailAsync(string email, string otpCode, int validityMinutes);
    }
}