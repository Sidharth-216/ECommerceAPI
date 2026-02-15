using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace ECommerceAPI.Domain.Entities.MongoDB
{
    /// <summary>
    /// MongoDB Cart Item - Embedded document in MongoCart
    /// </summary>
    public class MongoCartItem
    {
        /// <summary>
        /// Product ID (MongoDB ObjectId reference)
        /// </summary>
        [BsonElement("productId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string ProductId { get; set; }

        /// <summary>
        /// Product ID as string (for backward compatibility)
        /// </summary>
        [BsonElement("productIdString")]
        public string ProductIdString { get; set; }

        /// <summary>
        /// Product name (cached for performance)
        /// </summary>
        [BsonElement("productName")]
        public string ProductName { get; set; }

        /// <summary>
        /// Product price at time of adding to cart
        /// </summary>
        [BsonElement("price")]
        public decimal Price { get; set; }

        /// <summary>
        /// Quantity of this product in cart
        /// </summary>
        [BsonElement("quantity")]
        public int Quantity { get; set; }

        /// <summary>
        /// Product image URL (cached for performance)
        /// </summary>
        [BsonElement("imageUrl")]
        public string ImageUrl { get; set; }

        /// <summary>
        /// Product brand (cached for performance)
        /// </summary>
        [BsonElement("brand")]
        public string Brand { get; set; }
    }
}