using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using ECommerceAPI.Domain.Entities.MongoDB;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Application.Services
{
    /// <summary>
    /// MongoDB OTP Service for Mobile OTP
    /// </summary>
    public interface IMongoOtpService
    {
        Task<bool> GenerateAndSendOtpAsync(string mobile);
        Task<bool> VerifyOtpAsync(string mobile, string otp);
        Task<bool> IsOtpValidAsync(string mobile);
    }

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

                var random = new Random();
                var otpCode = random.Next(100000, 999999).ToString();

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

                Console.WriteLine($"═══════════════════════════════════");
                Console.WriteLine($"📱 MongoDB OTP for {mobile}: {otpCode}");
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

                if (DateTime.UtcNow > otpRecord.ExpiresAt)
                {
                    _logger.LogWarning($"OTP expired for {mobile}");
                    return false;
                }

                if (otpRecord.IsUsed)
                {
                    _logger.LogWarning($"OTP already used for {mobile}");
                    return false;
                }

                if (otpRecord.AttemptCount >= MAX_ATTEMPTS)
                {
                    _logger.LogWarning($"Max OTP attempts exceeded for {mobile}");
                    await _otpRepository.InvalidateOtpAsync(otpRecord.Id);
                    return false;
                }

                otpRecord.AttemptCount++;
                await _otpRepository.UpdateAsync(otpRecord);

                if (otpRecord.OtpCode != otp)
                {
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
            return otpRecord != null &&
                   !otpRecord.IsUsed &&
                   DateTime.UtcNow <= otpRecord.ExpiresAt;
        }
    }

    /// <summary>
    /// MongoDB Email OTP Service
    /// </summary>
    public interface IMongoEmailOtpService
    {
        Task<bool> GenerateAndSendOtpAsync(string email);
        Task<bool> VerifyOtpAsync(string email, string otp);
        Task<bool> IsOtpValidAsync(string email);
    }

    public class MongoEmailOtpService : IMongoEmailOtpService
    {
        private readonly IMongoEmailOtpRepository _emailOtpRepository;
        private readonly ILogger<MongoEmailOtpService> _logger;
        private const int OTP_LENGTH = 6;
        private const int OTP_VALIDITY_MINUTES = 5;
        private const int MAX_ATTEMPTS = 3;

        public MongoEmailOtpService(
            IMongoEmailOtpRepository emailOtpRepository,
            ILogger<MongoEmailOtpService> logger)
        {
            _emailOtpRepository = emailOtpRepository;
            _logger = logger;
        }

        public async Task<bool> GenerateAndSendOtpAsync(string email)
        {
            try
            {
                await _emailOtpRepository.InvalidateAllForEmailAsync(email);

                var random = new Random();
                var otpCode = random.Next(100000, 999999).ToString();

                var emailOtp = new MongoEmailOtp
                {
                    Email = email,
                    OtpCode = otpCode,
                    CreatedAt = DateTime.UtcNow,
                    ExpiresAt = DateTime.UtcNow.AddMinutes(OTP_VALIDITY_MINUTES),
                    IsUsed = false,
                    AttemptCount = 0
                };

                await _emailOtpRepository.AddAsync(emailOtp);

                _logger.LogInformation($"Email OTP for {email}: {otpCode}");

                Console.WriteLine($"═══════════════════════════════════");
                Console.WriteLine($"📧 MongoDB Email OTP for {email}: {otpCode}");
                Console.WriteLine($"⏰ Valid until: {emailOtp.ExpiresAt:HH:mm:ss}");
                Console.WriteLine($"═══════════════════════════════════");

                return true;
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

                if (otpRecord == null)
                {
                    _logger.LogWarning($"No valid email OTP found for {email}");
                    return false;
                }

                if (!otpRecord.IsValid())
                {
                    _logger.LogWarning($"Email OTP expired or already used for {email}");
                    return false;
                }

                if (otpRecord.AttemptCount >= MAX_ATTEMPTS)
                {
                    _logger.LogWarning($"Max email OTP attempts exceeded for {email}");
                    otpRecord.MarkAsUsed();
                    await _emailOtpRepository.UpdateAsync(otpRecord);
                    return false;
                }

                otpRecord.AttemptCount++;
                await _emailOtpRepository.UpdateAsync(otpRecord);

                if (otpRecord.OtpCode != otp)
                {
                    _logger.LogWarning($"Invalid email OTP for {email}");
                    return false;
                }

                otpRecord.MarkAsUsed();
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
            return otpRecord?.IsValid() ?? false;
        }
    }
}