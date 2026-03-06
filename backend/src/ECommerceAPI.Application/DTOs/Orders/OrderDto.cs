/*using System;
using System.Collections.Generic;

namespace ECommerceAPI.Application.DTOs.Orders
{
    public class OrderDto
    {
        public string Id { get; set; }   // ✅ string, not int
        public string OrderNumber { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<OrderItemDto> Items { get; set; }
    }


    public class OrderItemDto
    {
        public string ProductId { get; set; }   // ✅ string
        public string ProductName { get; set; }
        public int Quantity { get; set; }
        public decimal Price { get; set; }
    }

    public class CreateOrderDto
    {
       public string ShippingAddressId { get; set; } = null!;
    }
}*/
using System;
using System.Collections.Generic;

namespace ECommerceAPI.Application.DTOs.Orders
{
    public class OrderDto
    {
        public string Id { get; set; }
        public string UserId { get; set; }   // ← ADDED: needed by email controller to look up order owner
        public string OrderNumber { get; set; }
        public decimal TotalAmount { get; set; }
        public string Status { get; set; }
        public DateTime CreatedAt { get; set; }
        public List<OrderItemDto> Items { get; set; }
    }

    public class OrderItemDto
    {
        public string ProductId { get; set; }
        public string ProductName { get; set; }
        public int Quantity { get; set; }
        public decimal Price { get; set; }
    }

    public class CreateOrderDto
    {
        public string ShippingAddressId { get; set; } = null!;
    }
}