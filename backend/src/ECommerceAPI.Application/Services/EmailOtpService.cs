using System;
using System.Threading.Tasks;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Domain.Entities;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Application.Services
{
    /// <summary>
    /// Email OTP Service Implementation
    /// Handles generation, sending, and verification of email OTPs
    /// </summary>
    public class EmailOtpService : IEmailOtpService
    {
        private readonly IEmailOtpRepository _emailOtpRepository;
        private readonly IEmailService _emailService;
        private const int OTP_LENGTH = 6;
        private const int OTP_VALIDITY_MINUTES = 5;

        public EmailOtpService(
            IEmailOtpRepository emailOtpRepository,
            IEmailService emailService)
        {
            _emailOtpRepository = emailOtpRepository;
            _emailService = emailService;
        }

        
        public async Task<bool> GenerateAndSendOtpAsync(string email, string ipAddress)
        {
            try
            {
                await _emailOtpRepository.InvalidateAllForEmailAsync(email);

                var random = new Random();
                var otpCode = random.Next(100000, 999999).ToString();

                var emailOtp = new EmailOtp
                {
                    Email = email,
                    OtpCode = otpCode,
                    CreatedAt = DateTime.UtcNow,
                    ExpiresAt = DateTime.UtcNow.AddMinutes(OTP_VALIDITY_MINUTES),
                    IsUsed = false,
                    IpAddress = ipAddress ?? "UNKNOWN"
                };

                await _emailOtpRepository.AddAsync(emailOtp);

                var subject = "Your Login OTP - ShopAI";
                var body = $"<h2>Your OTP is {otpCode}</h2>";

                await _emailService.SendEmailAsync(email, subject, body);

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error sending email OTP: {ex.Message}");
                return false;
            }
        }


        public async Task<bool> VerifyOtpAsync(string email, string otp)
        {
            try
            {
                // Get OTP record
                var emailOtp = await _emailOtpRepository.GetByEmailAndCodeAsync(email, otp);

                if (emailOtp == null)
                {
                    return false;
                }

                // Check if OTP is valid
                if (!emailOtp.IsValid())
                {
                    return false;
                }

                // Mark OTP as used
                emailOtp.MarkAsUsed();
                await _emailOtpRepository.UpdateAsync(emailOtp);

                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error verifying email OTP: {ex.Message}");
                return false;
            }
        }

        public async Task CleanupExpiredOtpsAsync()
        {
            try
            {
                // Delete OTPs older than 24 hours
                var cutoffDate = DateTime.UtcNow.AddHours(-24);
                await _emailOtpRepository.DeleteExpiredOtpsAsync(cutoffDate);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error cleaning up expired OTPs: {ex.Message}");
            }
        }
        public async Task<bool> GenerateAndSendOtpAsync(string email)
        {
            return await GenerateAndSendOtpAsync(email, null);
        }
    }
}