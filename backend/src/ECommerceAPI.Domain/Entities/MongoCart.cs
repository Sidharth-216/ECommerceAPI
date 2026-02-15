using System;
using System.Collections.Generic;
using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;

namespace ECommerceAPI.Domain.Entities.MongoDB
{
    /// <summary>
    /// MongoDB Cart Entity - Pure MongoDB, No SQL dependencies
    /// </summary>
    public class MongoCart
    {
        /// <summary>
        /// MongoDB ObjectId (_id field)
        /// </summary>
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        /// <summary>
        /// User ID (MongoDB ObjectId reference)
        /// </summary>
        [BsonElement("userId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string UserId { get; set; }

        /// <summary>
        /// List of cart items
        /// </summary>
        [BsonElement("items")]
        public List<MongoCartItem> Items { get; set; } = new List<MongoCartItem>();

        /// <summary>
        /// Cart creation timestamp
        /// </summary>
        [BsonElement("createdAt")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime CreatedAt { get; set; }

        /// <summary>
        /// Last update timestamp
        /// </summary>
        [BsonElement("updatedAt")]
        [BsonDateTimeOptions(Kind = DateTimeKind.Utc)]
        public DateTime UpdatedAt { get; set; }
    }
}