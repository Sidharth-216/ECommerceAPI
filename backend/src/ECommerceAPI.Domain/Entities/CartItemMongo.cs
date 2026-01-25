using System;

namespace ECommerceAPI.Domain.Entities.Mongo
{
    public class CartItemMongo
    {
        public string ProductId { get; set; } = ""; // Mongo ObjectId
        public string ProductName { get; set; } = "";
        public decimal Price { get; set; }           // per unit price
        public int Quantity { get; set; }
        public string ImageUrl { get; set; } = "";
        public string Brand { get; set; } = "";
        public int StockQuantity { get; set; }
        public DateTime AddedAt { get; set; }       // when item added
        public int? SqlItemId { get; set; }         // optional for SQL sync

        public decimal Subtotal => Price * Quantity; // read-only
    }
}
