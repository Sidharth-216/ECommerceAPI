using System;
using System.Collections.Generic;

namespace ECommerceAPI.Domain.Entities
{
    /// <summary>
    /// Shopping cart entity
    /// </summary>
    public class Cart
    {
        public int Id { get; set; }
        public int UserId { get; set; }
        public User User { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? UpdatedAt { get; set; }
        
        // Navigation properties
        public ICollection<CartItem> CartItems { get; set; }
    }
}
