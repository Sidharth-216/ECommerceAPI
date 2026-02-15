using System;
using System.Threading.Tasks;
using ECommerceAPI.Application.Interfaces;

namespace ECommerceAPI.Infrastructure.Services
{
    public class EmailService : IEmailService
    {
        public async Task<bool> SendOtpEmailAsync(string email, string otpCode, int validityMinutes)
        {
            // 🔹 TEMP / MOCK IMPLEMENTATION
            // Replace with SMTP / SendGrid later

            Console.WriteLine("📧 Sending OTP Email");
            Console.WriteLine($"To: {email}");
            Console.WriteLine($"OTP: {otpCode}");
            Console.WriteLine($"Valid for: {validityMinutes} minutes");

            await Task.CompletedTask;
            return true;
        }
    }
}
