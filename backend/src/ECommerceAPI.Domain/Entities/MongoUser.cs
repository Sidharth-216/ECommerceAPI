using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;
using System.Collections.Generic;

namespace ECommerceAPI.Domain.Entities.MongoDB
{
    /// <summary>
    /// MongoDB User Entity - Parallel to SQL User
    /// Uses ObjectId for compatibility with MongoDB Cart system
    /// </summary>
    public class MongoUser
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        [BsonElement("email")]
        [BsonRequired]
        public string Email { get; set; }

        [BsonElement("passwordHash")]
        [BsonRequired]
        public string PasswordHash { get; set; }

        [BsonElement("fullName")]
        [BsonRequired]
        public string FullName { get; set; }

        [BsonElement("mobile")]
        public string Mobile { get; set; }

        [BsonElement("role")]
        [BsonRepresentation(BsonType.String)]
        public string Role { get; set; } // "Customer", "Admin", etc.

        [BsonElement("isActive")]
        public bool IsActive { get; set; }

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; }

        [BsonElement("lastLoginAt")]
        public DateTime? LastLoginAt { get; set; }

        [BsonElement("sqlUserId")]
        public int? SqlUserId { get; set; } // Reference to SQL User ID for migration

        // Indexes will be created in repository
    }
}