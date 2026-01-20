using System;

namespace ECommerceAPI.Domain.Entities
{
    /// <summary>
    /// OTP Entity for storing OTP verification data
    /// </summary>
    public class Otp
    {
        public int Id { get; set; }
        public string Mobile { get; set; }
        public string OtpCode { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime ExpiresAt { get; set; }
        public bool IsUsed { get; set; }
        public int AttemptCount { get; set; }
    }
}