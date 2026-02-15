using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using ECommerceAPI.Domain.Entities.MongoDB;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;
using ECommerceAPI.Application.Interfaces;

namespace ECommerceAPI.Application.Services
{
    /// <summary>
    /// MongoDB OTP Service for Mobile OTP
    /// </summary>
    public class MongoOtpService : IMongoOtpService
    {
        private readonly IMongoOtpRepository _otpRepository;
        private readonly ILogger<MongoOtpService> _logger;

        private const int OTP_LENGTH = 6;
        private const int OTP_VALIDITY_MINUTES = 5;
        private const int MAX_ATTEMPTS = 3;

        public MongoOtpService(IMongoOtpRepository otpRepository, ILogger<MongoOtpService> logger)
        {
            _otpRepository = otpRepository;
            _logger = logger;
        }

        public async Task<bool> GenerateAndSendOtpAsync(string mobile)
        {
            try
            {
                await _otpRepository.InvalidateExistingOtpsAsync(mobile);

                var otpCode = new Random().Next(100000, 999999).ToString();

                var otp = new MongoOtp
                {
                    Mobile = mobile,
                    OtpCode = otpCode,
                    CreatedAt = DateTime.UtcNow,
                    ExpiresAt = DateTime.UtcNow.AddMinutes(OTP_VALIDITY_MINUTES),
                    IsUsed = false,
                    AttemptCount = 0
                };

                await _otpRepository.AddAsync(otp);

                _logger.LogInformation($"OTP for {mobile}: {otpCode} (Valid for {OTP_VALIDITY_MINUTES} minutes)");

                Console.WriteLine($"📱 OTP for {mobile}: {otpCode} | Valid until: {otp.ExpiresAt:HH:mm:ss}");

                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to generate OTP for {mobile}");
                return false;
            }
        }

        public async Task<bool> VerifyOtpAsync(string mobile, string otp)
        {
            try
            {
                var otpRecord = await _otpRepository.GetLatestValidOtpAsync(mobile);
                if (otpRecord == null || otpRecord.IsUsed || DateTime.UtcNow > otpRecord.ExpiresAt || otpRecord.AttemptCount >= MAX_ATTEMPTS)
                {
                    _logger.LogWarning($"OTP verification failed for {mobile}");
                    return false;
                }

                otpRecord.AttemptCount++;
                if (otpRecord.OtpCode != otp)
                {
                    await _otpRepository.UpdateAsync(otpRecord);
                    _logger.LogWarning($"Invalid OTP for {mobile}");
                    return false;
                }

                otpRecord.IsUsed = true;
                otpRecord.UsedAt = DateTime.UtcNow;
                await _otpRepository.UpdateAsync(otpRecord);

                _logger.LogInformation($"OTP verified successfully for {mobile}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to verify OTP for {mobile}");
                return false;
            }
        }

        public async Task<bool> IsOtpValidAsync(string mobile)
        {
            var otpRecord = await _otpRepository.GetLatestValidOtpAsync(mobile);
            return otpRecord != null && !otpRecord.IsUsed && DateTime.UtcNow <= otpRecord.ExpiresAt;
        }
    }
}
