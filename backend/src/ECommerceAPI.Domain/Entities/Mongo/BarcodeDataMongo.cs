using System;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace ECommerceAPI.Domain.Entities.Mongo
{
    /// <summary>
    /// MongoDB Barcode Data Entity
    /// Stores product information indexed by barcode for fast lookup
    /// Minimizes product collection queries during barcode scanning
    /// </summary>
    [BsonIgnoreExtraElements] 
    public class BarcodeDataMongo
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        [BsonElement("barcode")]
        public string Barcode { get; set; } // Main lookup key - UNIQUE INDEX

        [BsonElement("productId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string ProductId { get; set; } // Reference to ProductMongo

        [BsonElement("name")]
        public string Name { get; set; }

        [BsonElement("brand")]
        [BsonIgnoreIfNull]
        public string Brand { get; set; }

        [BsonElement("description")]
        [BsonIgnoreIfNull]
        public string Description { get; set; }

        [BsonElement("category")]
        [BsonIgnoreIfNull]
        public string Category { get; set; }

        [BsonElement("price")]
        public decimal Price { get; set; }

        [BsonElement("imageUrl")]
        [BsonIgnoreIfNull]
        public string ImageUrl { get; set; }

        [BsonElement("source")]
        [BsonIgnoreIfNull]
        public string Source { get; set; } // "manual" | "import" | "sync"

        [BsonElement("createdAt")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime CreatedAt { get; set; }

        [BsonElement("updatedAt")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        [BsonIgnoreIfNull]
        public DateTime? UpdatedAt { get; set; }

        [BsonElement("isActive")]
        [BsonIgnoreIfNull]
        [BsonIgnoreIfDefault]
        public bool? IsActive { get; set; } = true;
    }
}
