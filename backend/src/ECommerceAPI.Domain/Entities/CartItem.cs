using System;

namespace ECommerceAPI.Domain.Entities
{
    /// <summary>
    /// Cart item entity - represents individual items in shopping cart
    /// </summary>
    public class CartItem
    {
        public int Id { get; set; }
        public int CartId { get; set; }
        public Cart Cart { get; set; }
        public int ProductId { get; set; }
        public Product Product { get; set; }
        public int Quantity { get; set; }
        public DateTime AddedAt { get; set; }
    }
}