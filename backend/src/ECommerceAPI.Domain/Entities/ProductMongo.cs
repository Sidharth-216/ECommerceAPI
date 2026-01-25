using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;

namespace ECommerceAPI.Domain.Entities.Mongo
{
    public class ProductMongo
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } // MongoDB uses string ObjectId

        [BsonElement("name")]
        [BsonRequired]
        public string Name { get; set; }

        [BsonElement("description")]
        public string Description { get; set; }

        [BsonElement("price")]
        [BsonRepresentation(BsonType.Decimal128)]
        public decimal Price { get; set; }

        // Embedded category info instead of FK
        [BsonElement("category")]
        [BsonIgnoreIfNull]
        public CategoryInfo Category { get; set; }

        [BsonElement("imageUrl")]
        public string ImageUrl { get; set; }

        [BsonElement("stockQuantity")]
        [BsonDefaultValue(0)]
        public int StockQuantity { get; set; }

        [BsonElement("brand")]
        public string Brand { get; set; }

        [BsonElement("rating")]
        [BsonRepresentation(BsonType.Decimal128)]
        [BsonDefaultValue(0)]
        public decimal Rating { get; set; }

        [BsonElement("reviewCount")]
        [BsonDefaultValue(0)]
        public int ReviewCount { get; set; }

        [BsonElement("isActive")]
        [BsonDefaultValue(true)]
        public bool IsActive { get; set; }

        // Specifications as BsonDocument for flexibility
        [BsonElement("specifications")]
        [BsonIgnoreIfNull]
        public BsonDocument Specifications { get; set; }

        [BsonElement("createdAt")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime CreatedAt { get; set; }

        [BsonElement("updatedAt")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        [BsonIgnoreIfNull]
        public DateTime? UpdatedAt { get; set; }

        // For backward compatibility during migration
        [BsonElement("sqlId")]
        [BsonIgnoreIfNull]
        [BsonRepresentation(BsonType.Int32)]
        public int? SqlId { get; set; }
    }

    // Embedded document - no separate collection needed
    public class CategoryInfo
    {
        // ⚠️ CRITICAL FIX: Remove [BsonId] from embedded document
        // Only the root document (ProductMongo) should have [BsonId]
        [BsonElement("id")]
        [BsonRepresentation(BsonType.Int32)]
        public int Id { get; set; }

        [BsonElement("name")]
        public string Name { get; set; }
    }
}