/*using System.Collections.Generic;

namespace ECommerceAPI.Application.DTOs.Cart
{
    public class CartDto
    {
        public int CartId { get; set; }
        public List<CartItemDto> Items { get; set; }
        public decimal TotalAmount { get; set; }
    }

    public class CartItemDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; }
        public decimal Price { get; set; }
        public int Quantity { get; set; }
        public string ImageUrl { get; set; }
    }

    public class AddToCartDto
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; } = 1;
    }

    public class UpdateCartItemDto
    {
        public int ProductId { get; set; }
        public int Quantity { get; set; }
    }
}
*/


using System.Collections.Generic;

namespace ECommerceAPI.Application.DTOs.Cart
{
    /// <summary>
    /// Cart Data Transfer Object - Updated for hybrid support
    /// </summary>
    public class CartDto
    {
        public string CartId { get; set; }
        public string MongoCartId { get; set; }=""; // MongoDB ObjectId (optional, for tracking)
        public List<CartItemDto> Items { get; set; } = new List<CartItemDto>();
        public decimal TotalAmount { get; set; }
        public int TotalItems { get; set; } // Added for convenience
    }

    /// <summary>
    /// Cart Item Data Transfer Object - Updated for hybrid support
    /// </summary>
    public class CartItemDto
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; }
        public decimal Price { get; set; }
        public int Quantity { get; set; }
        public string ImageUrl { get; set; }
        public string Brand { get; set; } // Added for better product info
        public decimal Subtotal { get; set; } // Added for convenience
    }

    /// <summary>
    /// Add to Cart Data Transfer Object
    /// </summary>
    public class AddToCartDto
    {
        public int ProductId { get; set; }

        public int Quantity { get; set; } = 1;
    }

    /// <summary>
    /// Update Cart Item Data Transfer Object
    /// </summary>
    public class UpdateCartItemDto
    {
        public int ProductId { get; set; }

        public int Quantity { get; set; }
    }
}