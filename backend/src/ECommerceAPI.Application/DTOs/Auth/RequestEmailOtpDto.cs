using System.ComponentModel.DataAnnotations;

namespace ECommerceAPI.Application.DTOs.Auth
{
    /// <summary>
    /// Request DTO for Email OTP
    /// </summary>
    public class RequestEmailOtpDto
    {
        [Required]
        [EmailAddress]
        public string Email { get; set; }
    }

    /// <summary>
    /// Verify Email OTP DTO
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