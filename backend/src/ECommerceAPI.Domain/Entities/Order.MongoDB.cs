using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;
using System.Collections.Generic;

namespace ECommerceAPI.Domain.Entities.MongoDB
{
    /// <summary>
    /// MongoDB Order entity
    /// </summary>
    public class MongoOrder
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        [BsonElement("userId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string UserId { get; set; }

        [BsonElement("orderNumber")]
        public string OrderNumber { get; set; }

        [BsonElement("totalAmount")]
        public decimal TotalAmount { get; set; }

        [BsonElement("status")]
        public string Status { get; set; }

        [BsonElement("shippingAddressId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string ShippingAddressId { get; set; }

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; }

        [BsonElement("completedAt")]
        [BsonIgnoreIfNull]
        public DateTime? CompletedAt { get; set; }

        [BsonElement("items")]
        public List<MongoOrderItem> Items { get; set; }

        [BsonElement("paymentId")]
        [BsonRepresentation(BsonType.ObjectId)]
        [BsonIgnoreIfNull]
        public string PaymentId { get; set; }

        // Keep SQL ID for migration tracking
        [BsonElement("sqlId")]
        [BsonIgnoreIfNull]
        public int? SqlId { get; set; }

        [BsonElement("updatedAt")]
        [BsonIgnoreIfNull]
        public DateTime? UpdatedAt { get; set; }
    }

    /// <summary>
    /// MongoDB OrderItem - embedded in Order document
    /// </summary>
    public class MongoOrderItem
    {
        [BsonElement("productId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string ProductId { get; set; }

        [BsonElement("productName")]
        public string ProductName { get; set; }

        [BsonElement("quantity")]
        public int Quantity { get; set; }

        [BsonElement("price")]
        public decimal Price { get; set; }

        [BsonElement("imageUrl")]
        [BsonIgnoreIfNull]
        public string ImageUrl { get; set; }

        // Keep SQL IDs for migration tracking
        [BsonElement("sqlProductId")]
        [BsonIgnoreIfNull]
        public int? SqlProductId { get; set; }
    }
}