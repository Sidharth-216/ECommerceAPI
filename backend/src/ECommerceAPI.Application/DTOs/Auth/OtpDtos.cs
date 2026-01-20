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
    /// Verify OTP and login
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
}