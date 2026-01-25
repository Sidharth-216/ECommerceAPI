using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;
using System.Collections.Generic;

namespace ECommerceAPI.Domain.Entities.Mongo
{
    public class MongoUser
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        [BsonElement("email")]
        public string Email { get; set; }

        [BsonElement("passwordHash")]
        public string PasswordHash { get; set; }

        [BsonElement("fullName")]
        public string FullName { get; set; }

        [BsonElement("mobile")]
        public string Mobile { get; set; }

        [BsonElement("role")]
        public string Role { get; set; } = "Customer";

        [BsonElement("isActive")]
        public bool IsActive { get; set; } = true;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("lastLoginAt")]
        public DateTime? LastLoginAt { get; set; }

        // Optional: keep SQL Id for reference during migration
        [BsonElement("sqlId")]
        public int SqlId { get; set; }

        // Optional nested collections
        [BsonElement("addresses")]
        public List<object> Addresses { get; set; } = new List<object>();
    }
}
