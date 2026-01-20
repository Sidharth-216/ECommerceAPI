using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ECommerceAPI.Domain.Entities
{
    /// <summary>
    /// Email OTP Entity for storing OTP codes sent to email addresses
    /// </summary>
    [Table("EmailOtps")]
    public class EmailOtp
    {
        [Key]
        [DatabaseGenerated(DatabaseGeneratedOption.Identity)]
        public int Id { get; set; }

        [Required]
        [EmailAddress]
        [MaxLength(255)]
        public string Email { get; set; }

        [Required]
        [StringLength(6)]
        public string OtpCode { get; set; }

        [Required]
        public DateTime CreatedAt { get; set; }

        [Required]
        public DateTime ExpiresAt { get; set; }

        public bool IsUsed { get; set; }

        public DateTime? UsedAt { get; set; }

        [MaxLength(50)]
        public string IpAddress { get; set; }

        /// <summary>
        /// Check if OTP is valid (not expired and not used)
        /// </summary>
        public bool IsValid()
        {
            return !IsUsed && DateTime.UtcNow <= ExpiresAt;
        }

        /// <summary>
        /// Mark OTP as used
        /// </summary>
        public void MarkAsUsed()
        {
            IsUsed = true;
            UsedAt = DateTime.UtcNow;
        }
    }
}