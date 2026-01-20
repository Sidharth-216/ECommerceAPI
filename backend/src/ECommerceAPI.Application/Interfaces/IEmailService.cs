using System.Threading.Tasks;

namespace ECommerceAPI.Application.Interfaces
{
    /// <summary>
    /// Email Service Interface
    /// Handles sending emails (for OTP, notifications, etc.)
    /// </summary>
    public interface IEmailService
    {
        /// <summary>
        /// Send email
        /// </summary>
        /// <param name="toEmail">Recipient email address</param>
        /// <param name="subject">Email subject</param>
        /// <param name="body">Email body (can be HTML)</param>
        /// <returns>True if email was sent successfully</returns>
        Task<bool> SendEmailAsync(string toEmail, string subject, string body);

        /// <summary>
        /// Send email with attachments
        /// </summary>
        Task<bool> SendEmailWithAttachmentAsync(string toEmail, string subject, string body, string attachmentPath);
    }
}