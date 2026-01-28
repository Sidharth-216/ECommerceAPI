using System;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace ECommerceAPI.Domain.Entities.Mongo
{
    /// <summary>
    /// MongoDB Address Entity
    /// </summary>
    public class AddressMongo
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        [BsonElement("userId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string UserId { get; set; }

        [BsonElement("addressLine1")]
        [BsonRequired]
        public string AddressLine1 { get; set; }

        [BsonElement("addressLine2")]
        public string AddressLine2 { get; set; }

        [BsonElement("city")]
        [BsonRequired]
        public string City { get; set; }

        [BsonElement("state")]
        public string State { get; set; }

        [BsonElement("postalCode")]
        public string PostalCode { get; set; }

        [BsonElement("country")]
        [BsonRequired]
        public string Country { get; set; }

        [BsonElement("isDefault")]
        public bool IsDefault { get; set; }

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedAt")]
        public DateTime? UpdatedAt { get; set; }

        [BsonElement("sqlId")]
        public int? SqlId { get; set; } // For migration/sync with SQL
    }
}