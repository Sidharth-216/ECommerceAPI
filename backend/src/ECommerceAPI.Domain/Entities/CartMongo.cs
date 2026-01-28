using System;
using System.Collections.Generic;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace ECommerceAPI.Domain.Entities.Mongo
{
    public class CartMongo
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; } // ✅ DO NOT initialize - let MongoDB set it

        [BsonElement("userId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string UserId { get; set; }

        [BsonElement("sqlId")]
        public int? SqlId { get; set; }

        [BsonElement("items")]
        public List<CartItemMongo> Items { get; set; } = new List<CartItemMongo>();

        [BsonElement("totalAmount")]
        public decimal TotalAmount { get; set; }

        [BsonElement("totalItems")]
        public int TotalItems { get; set; }

        [BsonElement("isActive")]
        public bool IsActive { get; set; } = true;

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        [BsonElement("updatedAt")]
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }
}