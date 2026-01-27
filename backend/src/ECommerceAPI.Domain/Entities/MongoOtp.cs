using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;

namespace ECommerceAPI.Domain.Entities.MongoDB
{
    /// <summary>
    /// MongoDB OTP Entity for Mobile OTP
    /// </summary>
    public class MongoOtp
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        [BsonElement("mobile")]
        [BsonRequired]
        public string Mobile { get; set; }

        [BsonElement("otpCode")]
        [BsonRequired]
        public string OtpCode { get; set; }

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; }

        [BsonElement("expiresAt")]
        public DateTime ExpiresAt { get; set; }

        [BsonElement("isUsed")]
        public bool IsUsed { get; set; }

        [BsonElement("attemptCount")]
        public int AttemptCount { get; set; }

        [BsonElement("usedAt")]
        public DateTime? UsedAt { get; set; }
    }

    /// <summary>
    /// MongoDB Email OTP Entity
    /// </summary>
    public class MongoEmailOtp
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        [BsonElement("email")]
        [BsonRequired]
        public string Email { get; set; }

        [BsonElement("otpCode")]
        [BsonRequired]
        public string OtpCode { get; set; }

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; }

        [BsonElement("expiresAt")]
        public DateTime ExpiresAt { get; set; }

        [BsonElement("isUsed")]
        public bool IsUsed { get; set; }

        [BsonElement("usedAt")]
        public DateTime? UsedAt { get; set; }

        [BsonElement("ipAddress")]
        public string IpAddress { get; set; }

        [BsonElement("attemptCount")]
        public int AttemptCount { get; set; }

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