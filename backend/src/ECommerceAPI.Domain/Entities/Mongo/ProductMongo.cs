using System;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace ECommerceAPI.Domain.Entities.Mongo
{
    /// <summary>
    /// MongoDB Product Entity - COMPLETE WORKING VERSION
    /// ✅ All BsonElement attributes configured
    /// ✅ CategoryInfo fixed with proper mapping
    /// ✅ IsActive as nullable to prevent casting errors
    /// </summary>
    
    [BsonIgnoreExtraElements] 
    public class ProductMongo
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        [BsonElement("sqlId")]
        [BsonIgnoreIfNull]
        public int? SqlId { get; set; }

        [BsonElement("name")]
        public string Name { get; set; }

        [BsonElement("description")]
        [BsonIgnoreIfNull]
        public string Description { get; set; }

        [BsonElement("price")]
        public decimal Price { get; set; }

        [BsonElement("category")]
        [BsonIgnoreIfNull]
        public CategoryInfo Category { get; set; }

        [BsonElement("imageUrl")]
        [BsonIgnoreIfNull]
        public string ImageUrl { get; set; }

        [BsonElement("stockQuantity")]
        public int StockQuantity { get; set; }

        [BsonElement("brand")]
        [BsonIgnoreIfNull]
        public string Brand { get; set; }

        [BsonElement("rating")]
        [BsonIgnoreIfNull]
        public decimal? Rating { get; set; }

        [BsonElement("reviewCount")]
        [BsonIgnoreIfNull]
        public int? ReviewCount { get; set; }

        [BsonElement("isActive")]
        [BsonIgnoreIfNull]
        [BsonIgnoreIfDefault]
        public bool? IsActive { get; set; }

        [BsonElement("specifications")]
        [BsonIgnoreIfNull]
        public object Specifications { get; set; }

        [BsonElement("barcode")]
        [BsonIgnoreIfNull]
        public string Barcode { get; set; }

        [BsonElement("createdAt")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime CreatedAt { get; set; }

        [BsonElement("updatedAt")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        [BsonIgnoreIfNull]
        public DateTime? UpdatedAt { get; set; }
    }

    /// <summary>
    /// ✅ CRITICAL FIX: CategoryInfo with [BsonElement] attributes
    /// MongoDB uses lowercase: { "id": 1, "name": "Mobiles" }
    /// C# uses PascalCase: { Id, Name }
    /// [BsonElement] bridges the gap
    /// </summary>
    public class CategoryInfo
    {
        [BsonElement("id")]
        public int Id { get; set; }

        [BsonElement("name")]
        public string Name { get; set; }
    }
}