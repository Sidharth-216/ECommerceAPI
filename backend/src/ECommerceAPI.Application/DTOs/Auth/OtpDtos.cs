using System.ComponentModel.DataAnnotations;

namespace ECommerceAPI.Application.DTOs.Auth
{
    /// <summary>
    /// Request OTP for mobile login
    /// </summary>
    public class RequestOtpDto
    {
        public string Mobile { get; set; }
    }

    /// <summary>
    /// Verify OTP and login via mobile
    /// </summary>
    public class VerifyOtpDto
    {
        public string Mobile { get; set; }
        public string Otp { get; set; }
    }

    /// <summary>
    /// OTP Request Response
    /// </summary>
    public class OtpResponseDto
    {
        public bool Success { get; set; }
        public string Message { get; set; }
        public int? ExpiresInSeconds { get; set; }
    }

    /// <summary>
    /// Request OTP for email login
    /// </summary>
    public class RequestEmailOtpDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }
    }

    /// <summary>
    /// Verify Email OTP and login
    /// </summary>
    public class VerifyEmailOtpDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }

        [Required]
        [StringLength(6, MinimumLength = 6)]
        public string Otp { get; set; }
    }
}
