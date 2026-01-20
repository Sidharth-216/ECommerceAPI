using System;
using System.Collections.Generic;

namespace ECommerceAPI.Domain.Entities
{
    /// <summary>
    /// Category entity for product classification
    /// </summary>
    public class Category
    {
        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public DateTime CreatedAt { get; set; }
        
        // Navigation properties
        public ICollection<Product> Products { get; set; }
    }
}