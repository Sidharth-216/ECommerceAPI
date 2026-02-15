using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Application.Services
{
    /// <summary>
    /// MongoDB Email OTP Service
    /// </summary>
    public class MongoEmailOtpService : IMongoEmailOtpService
    {
        private readonly IMongoEmailOtpRepository _emailOtpRepository;
        private readonly IEmailService _emailService;
        private readonly ILogger<MongoEmailOtpService> _logger;

        private const int OTP_VALIDITY_MINUTES = 5;
        private const int MAX_ATTEMPTS = 3;

        public MongoEmailOtpService(
            IMongoEmailOtpRepository emailOtpRepository,
            IEmailService emailService,
            ILogger<MongoEmailOtpService> logger)
        {
            _emailOtpRepository = emailOtpRepository;
            _emailService = emailService;
            _logger = logger;
        }

        public async Task<bool> GenerateAndSendOtpAsync(string email)
        {
            try
            {
                await _emailOtpRepository.InvalidateAllForEmailAsync(email);

                var otpCode = new Random().Next(100000, 999999).ToString();

                await _emailOtpRepository.AddAsync(new Domain.Entities.MongoDB.MongoEmailOtp
                {
                    Email = email,
                    OtpCode = otpCode,
                    CreatedAt = DateTime.UtcNow,
                    ExpiresAt = DateTime.UtcNow.AddMinutes(OTP_VALIDITY_MINUTES),
                    IsUsed = false,
                    AttemptCount = 0
                });

                var emailSent = await _emailService.SendOtpEmailAsync(email, otpCode, OTP_VALIDITY_MINUTES);
                if (!emailSent)
                    _logger.LogWarning($"Failed to send OTP email to {email}");

                _logger.LogInformation($"Email OTP for {email}: {otpCode}");

                Console.WriteLine($"📧 Email OTP for {email}: {otpCode} | Valid until: {DateTime.UtcNow.AddMinutes(OTP_VALIDITY_MINUTES):HH:mm:ss}");

                return emailSent;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to generate email OTP for {email}");
                return false;
            }
        }

        public async Task<bool> VerifyOtpAsync(string email, string otp)
        {
            try
            {
                var otpRecord = await _emailOtpRepository.GetLatestValidOtpAsync(email);

                if (otpRecord == null || otpRecord.IsUsed || DateTime.UtcNow > otpRecord.ExpiresAt || otpRecord.AttemptCount >= MAX_ATTEMPTS)
                {
                    _logger.LogWarning($"Email OTP verification failed for {email}");
                    return false;
                }

                otpRecord.AttemptCount++;
                if (otpRecord.OtpCode != otp)
                {
                    await _emailOtpRepository.UpdateAsync(otpRecord);
                    _logger.LogWarning($"Invalid email OTP for {email}");
                    return false;
                }

                otpRecord.IsUsed = true;
                await _emailOtpRepository.UpdateAsync(otpRecord);

                _logger.LogInformation($"Email OTP verified successfully for {email}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to verify email OTP for {email}");
                return false;
            }
        }

        public async Task<bool> IsOtpValidAsync(string email)
        {
            var otpRecord = await _emailOtpRepository.GetLatestValidOtpAsync(email);
            return otpRecord != null && !otpRecord.IsUsed && DateTime.UtcNow <= otpRecord.ExpiresAt;
        }
    }
}
