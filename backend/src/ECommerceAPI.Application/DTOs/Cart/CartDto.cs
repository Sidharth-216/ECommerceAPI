using System.Collections.Generic;

namespace ECommerceAPI.Application.DTOs.Cart
{
    /// <summary>
    /// Cart Data Transfer Object
    /// </summary>
    public class CartDto
    {
        public string CartId { get; set; }
        public string MongoCartId { get; set; }
        public List<CartItemDto> Items { get; set; } = new List<CartItemDto>();
        public decimal TotalAmount { get; set; }
        public int TotalItems { get; set; }
    }

    /// <summary>
    /// Cart Item Data Transfer Object
    /// </summary>
    public class CartItemDto
    {
        public int ProductId { get; set; }           // SQL integer ID (for backward compatibility)
        public string ProductIdString { get; set; }  // MongoDB ObjectId (string)
        public string ProductName { get; set; }
        public decimal Price { get; set; }
        public int Quantity { get; set; }
        public string ImageUrl { get; set; }
        public string Brand { get; set; }
        public decimal Subtotal { get; set; }
    }

    /// <summary>
    /// Add to Cart Request DTO
    /// </summary>
    public class AddToCartDto
    {
        public string ProductId { get; set; }  // Supports both SQL int and MongoDB ObjectId
        public int Quantity { get; set; } = 1;
    }

    /// <summary>
    /// Update Cart Item Request DTO
    /// </summary>
    public class UpdateCartItemDto
    {
        public int Quantity { get; set; }
    }
}