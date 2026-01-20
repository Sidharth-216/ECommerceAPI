using System;
using System.Collections.Generic;

namespace ECommerceAPI.Domain.Entities
{
    /// <summary>
    /// Product entity representing items available for purchase
    /// Follows Single Responsibility Principle
    /// </summary>
    public class Product
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public decimal Price { get; set; }
        public int CategoryId { get; set; }
        public Category Category { get; set; }
        public string ImageUrl { get; set; }
        public int StockQuantity { get; set; }
        public string Brand { get; set; }
        public decimal Rating { get; set; }
        public int ReviewCount { get; set; }
        public bool IsActive { get; set; }
        
        // Specifications stored as JSON
        public string Specifications { get; set; }
        
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation properties
        public ICollection<CartItem> CartItems { get; set; }
        public ICollection<OrderItem> OrderItems { get; set; }
    }
}