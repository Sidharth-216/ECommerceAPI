using System;

namespace ECommerceAPI.Domain.Entities
{
    /// <summary>
    /// Order item entity - represents individual items in an order
    /// </summary>
    public class OrderItem
    {
        public int Id { get; set; }
        public int OrderId { get; set; }
        public Order Order { get; set; }
        public int ProductId { get; set; }
        public Product Product { get; set; }
        public int Quantity { get; set; }
        public decimal Price { get; set; } // Price at time of purchase
    }
}