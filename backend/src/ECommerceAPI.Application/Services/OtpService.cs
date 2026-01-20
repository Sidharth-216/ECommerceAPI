using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Application.Services
{
    /// <summary>
    /// OTP Service Implementation
    /// Generates 6-digit OTP valid for 5 minutes
    /// For production, integrate with SMS gateway (Twilio, AWS SNS, etc.)
    /// </summary>
    public class OtpService : IOtpService
    {
        private readonly IOtpRepository _otpRepository;
        private readonly ILogger<OtpService> _logger;
        private const int OTP_LENGTH = 6;
        private const int OTP_VALIDITY_MINUTES = 5;
        private const int MAX_ATTEMPTS = 3;

        public OtpService(IOtpRepository otpRepository, ILogger<OtpService> logger)
        {
            _otpRepository = otpRepository;
            _logger = logger;
        }

        public async Task<bool> GenerateAndSendOtpAsync(string mobile)
        {
            try
            {
                // Invalidate any existing OTPs for this mobile
                await _otpRepository.InvalidateExistingOtpsAsync(mobile);

                // Generate random 6-digit OTP
                var random = new Random();
                var otpCode = random.Next(100000, 999999).ToString();

                // Create OTP record
                var otp = new Domain.Entities.Otp
                {
                    Mobile = mobile,
                    OtpCode = otpCode,
                    CreatedAt = DateTime.UtcNow,
                    ExpiresAt = DateTime.UtcNow.AddMinutes(OTP_VALIDITY_MINUTES),
                    IsUsed = false,
                    AttemptCount = 0
                };

                await _otpRepository.AddAsync(otp);

                // TODO: Integrate with SMS gateway (Twilio, AWS SNS, etc.)
                // For demo purposes, log the OTP
                _logger.LogInformation($"OTP for {mobile}: {otpCode} (Valid for {OTP_VALIDITY_MINUTES} minutes)");
                
                // In development, you can also write to a file or console
                Console.WriteLine($"═══════════════════════════════════");
                Console.WriteLine($"📱 OTP for {mobile}: {otpCode}");
                Console.WriteLine($"⏰ Valid until: {otp.ExpiresAt:HH:mm:ss}");
                Console.WriteLine($"═══════════════════════════════════");

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

                if (otpRecord == null)
                {
                    _logger.LogWarning($"No valid OTP found for {mobile}");
                    return false;
                }

                // Check if OTP has expired
                if (DateTime.UtcNow > otpRecord.ExpiresAt)
                {
                    _logger.LogWarning($"OTP expired for {mobile}");
                    return false;
                }

                // Check if OTP has been used
                if (otpRecord.IsUsed)
                {
                    _logger.LogWarning($"OTP already used for {mobile}");
                    return false;
                }

                // Check max attempts
                if (otpRecord.AttemptCount >= MAX_ATTEMPTS)
                {
                    _logger.LogWarning($"Max OTP attempts exceeded for {mobile}");
                    await _otpRepository.InvalidateOtpAsync(otpRecord.Id);
                    return false;
                }

                // Increment attempt count
                otpRecord.AttemptCount++;
                await _otpRepository.UpdateAsync(otpRecord);

                // Verify OTP
                if (otpRecord.OtpCode != otp)
                {
                    _logger.LogWarning($"Invalid OTP for {mobile}");
                    return false;
                }

                // Mark OTP as used
                otpRecord.IsUsed = true;
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
            return otpRecord != null && 
                   !otpRecord.IsUsed && 
                   DateTime.UtcNow <= otpRecord.ExpiresAt;
        }
    }
}