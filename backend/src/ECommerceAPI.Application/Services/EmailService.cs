using System;
using System.Net;
using System.Net.Mail;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Infrastructure.Configuration;

namespace ECommerceAPI.Infrastructure.Services
{
    /// <summary>
    /// Email Service Implementation using SMTP
    /// </summary>
    public class EmailService : IEmailService
    {
        private readonly EmailSettings _emailSettings;
        private readonly ILogger<EmailService> _logger;

        public EmailService(
            IOptions<EmailSettings> emailSettings,
            ILogger<EmailService> logger)
        {
            _emailSettings = emailSettings.Value;
            _logger = logger;
        }

        public async Task<bool> SendEmailAsync(string toEmail, string subject, string body)
        {
            try
            {
                using var smtpClient = new SmtpClient(_emailSettings.SmtpHost)
                {
                    Port = int.Parse(_emailSettings.SmtpPort),
                    Credentials = new NetworkCredential(
                        _emailSettings.SmtpUsername,
                        _emailSettings.SmtpPassword),
                    EnableSsl = bool.Parse(_emailSettings.EnableSsl)
                };

                var mailMessage = new MailMessage
                {
                    From = new MailAddress(_emailSettings.FromEmail, _emailSettings.FromName),
                    Subject = subject,
                    Body = body,
                    IsBodyHtml = true
                };
                mailMessage.To.Add(toEmail);

                await smtpClient.SendMailAsync(mailMessage);
                _logger.LogInformation($"Email sent successfully to {toEmail}");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send email to {toEmail}");
                return false;
            }
        }

        public async Task<bool> SendOtpEmailAsync(string toEmail, string otpCode, int validityMinutes)
        {
            try
            {
                var subject = "Your OTP Code - ShopAI";
                var body = $@"
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
        .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
        .otp-box {{ background-color: #f4f4f4; padding: 20px; text-align: center; border-radius: 5px; margin: 20px 0; }}
        .otp-code {{ font-size: 32px; font-weight: bold; color: #007bff; letter-spacing: 5px; }}
        .warning {{ color: #dc3545; font-size: 14px; margin-top: 20px; }}
    </style>
</head>
<body>
    <div class='container'>
        <h2>Your OTP Code</h2>
        <p>Hello,</p>
        <p>You have requested an OTP for login. Please use the following code:</p>
        
        <div class='otp-box'>
            <div class='otp-code'>{otpCode}</div>
        </div>
        
        <p><strong>This code is valid for {validityMinutes} minutes.</strong></p>
        
        <div class='warning'>
            <p>⚠️ If you didn't request this code, please ignore this email and ensure your account is secure.</p>
        </div>
        
        <p>Thank you,<br>ShopAI Team</p>
    </div>
</body>
</html>";

                return await SendEmailAsync(toEmail, subject, body);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Failed to send OTP email to {toEmail}");
                return false;
            }
        }
    }
}