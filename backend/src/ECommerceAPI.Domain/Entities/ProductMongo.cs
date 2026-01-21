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
        public string Name { get; set; }
        
        [BsonElement("description")]
        public string Description { get; set; }
        
        [BsonElement("price")]
        public decimal Price { get; set; }
        
        // Embedded category info instead of FK
        [BsonElement("category")]
        public CategoryInfo Category { get; set; }
        
        [BsonElement("imageUrl")]
        public string ImageUrl { get; set; }
        
        [BsonElement("stockQuantity")]
        public int StockQuantity { get; set; }
        
        [BsonElement("brand")]
        public string Brand { get; set; }
        
        [BsonElement("rating")]
        public decimal Rating { get; set; }
        
        [BsonElement("reviewCount")]
        public int ReviewCount { get; set; }
        
        [BsonElement("isActive")]
        public bool IsActive { get; set; }
        
        // Specifications as BsonDocument for flexibility
        [BsonElement("specifications")]
        public BsonDocument Specifications { get; set; }
        
        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; }
        
        [BsonElement("updatedAt")]
        public DateTime? UpdatedAt { get; set; }
        
        // For backward compatibility during migration
        [BsonElement("sqlId")]
        public int? SqlId { get; set; }
    }
    
    // Embedded document - no separate collection needed
    public class CategoryInfo
    {
        [BsonElement("id")]
        public int Id { get; set; }
        
        [BsonElement("name")]
        public string Name { get; set; }
    }
}