using System;
using System.Collections.Generic;

namespace ECommerceAPI.Domain.Entities.Mongo
{
    public class CartMongo
    {
        public string Id { get; set; } = "";        // MongoDB _id
        public string UserId { get; set; } = "";    // User reference
        public int? SqlId { get; set; }             // SQL Cart Id
        public List<CartItemMongo> Items { get; set; } = new();
        public decimal TotalAmount { get; set; }
        public int TotalItems { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    }


}
