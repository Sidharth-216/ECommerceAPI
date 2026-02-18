using System;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Application.Services
{
    public class MongoEmailOtpService : IMongoEmailOtpService
    {
        private readonly IMongoEmailOtpRepository _emailOtpRepository;
        private readonly IConfiguration _configuration;
        private readonly ILogger<MongoEmailOtpService> _logger;

        private const int OTP_VALIDITY_MINUTES = 5;
        private const int MAX_ATTEMPTS = 3;

        public MongoEmailOtpService(
            IMongoEmailOtpRepository emailOtpRepository,
            IConfiguration configuration,
            ILogger<MongoEmailOtpService> logger)
        {
            _emailOtpRepository = emailOtpRepository;
            _configuration = configuration;
            _logger = logger;
        }

        public async Task<bool> GenerateAndSendOtpAsync(string email)
        {
            try
            {
                // Invalidate old OTPs
                await _emailOtpRepository.InvalidateAllForEmailAsync(email);

                // Generate OTP
                var otpCode = new Random().Next(100000, 999999).ToString();

                // Save to MongoDB
                await _emailOtpRepository.AddAsync(new Domain.Entities.MongoDB.MongoEmailOtp
                {
                    Email = email,
                    OtpCode = otpCode,
                    CreatedAt = DateTime.UtcNow,
                    ExpiresAt = DateTime.UtcNow.AddMinutes(OTP_VALIDITY_MINUTES),
                    IsUsed = false,
                    AttemptCount = 0
                });

                // Send via SMTP
                var emailSent = await SendOtpEmailAsync(email, otpCode);

                if (!emailSent)
                    _logger.LogWarning($"Failed to send OTP email to {email}");
                else
                    _logger.LogInformation($"OTP sent to {email}");

                return emailSent;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to generate/send OTP for {email}");
                return false;
            }
        }

        public async Task<bool> VerifyOtpAsync(string email, string otp)
        {
            try
            {
                var otpRecord = await _emailOtpRepository.GetLatestValidOtpAsync(email);

                if (otpRecord == null || otpRecord.IsUsed ||
                    DateTime.UtcNow > otpRecord.ExpiresAt ||
                    otpRecord.AttemptCount >= MAX_ATTEMPTS)
                {
                    _logger.LogWarning($"OTP verification failed for {email}");
                    return false;
                }

                otpRecord.AttemptCount++;

                if (otpRecord.OtpCode != otp)
                {
                    await _emailOtpRepository.UpdateAsync(otpRecord);
                    _logger.LogWarning($"Invalid OTP attempt for {email}");
                    return false;
                }

                otpRecord.IsUsed = true;
                otpRecord.UsedAt = DateTime.UtcNow;
                await _emailOtpRepository.UpdateAsync(otpRecord);

                _logger.LogInformation($"OTP verified successfully for {email}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to verify OTP for {email}");
                return false;
            }
        }

        public async Task<bool> IsOtpValidAsync(string email)
        {
            var otpRecord = await _emailOtpRepository.GetLatestValidOtpAsync(email);
            return otpRecord != null && !otpRecord.IsUsed && DateTime.UtcNow <= otpRecord.ExpiresAt;
        }

        // ─── Private SMTP Sender ──────────────────────────────────────────────────

        private async Task<bool> SendOtpEmailAsync(string email, string otpCode)
        {
            try
            {
                var smtp = _configuration.GetSection("EmailSettings");

                var host = smtp["SmtpHost"];
                var port = int.Parse(smtp["SmtpPort"]!);
                var username = smtp["SmtpUsername"];
                var password = smtp["SmtpPassword"];
                var fromEmail = smtp["FromEmail"];
                var fromName = smtp["FromName"] ?? "ShopAI";
                var enableSsl = bool.Parse(smtp["EnableSsl"] ?? "true");

                using var client = new SmtpClient(host, port)
                {
                    Credentials = new NetworkCredential(username, password),
                    EnableSsl = enableSsl,
                    DeliveryMethod = SmtpDeliveryMethod.Network
                };

                var mail = new MailMessage
                {
                    From = new MailAddress(fromEmail!, fromName),
                    Subject = "Your OTP Verification Code",
                    IsBodyHtml = true,
                    Body = $@"
                    <!DOCTYPE html>
                    <html lang='en'>
                    <head>
                    <meta charset='UTF-8' />
                    <meta name='viewport' content='width=device-width, initial-scale=1.0'/>
                    <title>ShopAI - OTP Verification</title>
                    </head>
                    <body style='margin:0;padding:0;background-color:#f0fdfa;font-family:Arial,sans-serif;'>

                    <!-- Wrapper -->
                    <table width='100%' cellpadding='0' cellspacing='0' style='background-color:#f0fdfa;padding:40px 0;'>
                        <tr>
                        <td align='center'>
                            <table width='520' cellpadding='0' cellspacing='0' style='background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(20,184,166,0.12);'>

                            <!-- Header with gradient -->
                            <tr>
                                <td style='background:linear-gradient(to right,#14b8a6,#0891b2);padding:36px 40px;text-align:center;'>
                                <h1 style='margin:0;color:#ffffff;font-size:28px;font-weight:800;letter-spacing:1px;'>
                                    🛍️ ShopAI
                                </h1>
                                <p style='margin:8px 0 0;color:#ccfbf1;font-size:14px;letter-spacing:0.5px;'>
                                    Your Smart Shopping Companion
                                </p>
                                </td>
                            </tr>

                            <!-- Body -->
                            <tr>
                                <td style='padding:40px 40px 20px;'>
                                <h2 style='margin:0 0 8px;font-size:22px;color:#134e4a;font-weight:700;'>
                                    Verify Your Identity
                                </h2>
                                <p style='margin:0 0 28px;color:#6b7280;font-size:15px;line-height:1.6;'>
                                    Hi there! 👋 We received a request to verify your email address.
                                    Use the OTP below to complete your verification. This code is valid for
                                    <strong style='color:#0f766e;'>{OTP_VALIDITY_MINUTES} minutes</strong> only.
                                </p>

                                <!-- OTP Box -->
                                <div style='background:linear-gradient(to right,#f0fdfa,#ecfeff);border:2px dashed #14b8a6;border-radius:12px;padding:28px;text-align:center;margin-bottom:28px;'>
                                    <p style='margin:0 0 8px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:2px;font-weight:600;'>
                                    Your One-Time Password
                                    </p>
                                    <div style='font-size:44px;font-weight:800;letter-spacing:12px;color:#0f766e;margin:8px 0;font-family:""Courier New"",monospace;'>
                                    {otpCode}
                                    </div>
                                    <p style='margin:8px 0 0;font-size:12px;color:#9ca3af;'>
                                    ⏱ Expires in {OTP_VALIDITY_MINUTES} minutes
                                    </p>
                                </div>

                                <!-- Warning box -->
                                <div style='background:#fef9c3;border-left:4px solid #eab308;border-radius:8px;padding:14px 18px;margin-bottom:28px;'>
                                    <p style='margin:0;font-size:13px;color:#854d0e;line-height:1.5;'>
                                    🔒 <strong>Never share this OTP</strong> with anyone, including ShopAI support.
                                    If you didn't request this, please ignore this email.
                                    </p>
                                </div>

                                <!-- Divider -->
                                <hr style='border:none;border-top:1px solid #e5e7eb;margin:0 0 24px;'/>

                                <p style='margin:0;font-size:13px;color:#9ca3af;line-height:1.6;'>
                                    Having trouble? Contact us at
                                    <a href='mailto:support@shopai.com' style='color:#0891b2;text-decoration:none;font-weight:600;'>support@shopai.com</a>
                                </p>
                                </td>
                            </tr>

                            <!-- Footer -->
                            <tr>
                                <td style='background:#f8fafc;padding:24px 40px;text-align:center;border-top:1px solid #e5e7eb;'>
                                <p style='margin:0 0 6px;font-size:13px;color:#6b7280;'>
                                    © {DateTime.UtcNow.Year} <strong style='color:#0f766e;'>ShopAI</strong>. All rights reserved.
                                </p>
                                <p style='margin:0;font-size:12px;color:#9ca3af;'>
                                    This is an automated email. Please do not reply directly to this message.
                                </p>
                                </td>
                            </tr>

                            </table>
                        </td>
                        </tr>
                    </table>

                    </body>
                    </html>"
                };
                mail.To.Add(email);

                await client.SendMailAsync(mail);
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"SMTP send failed for {email}");
                return false;
            }
        }
    }
}