/*
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
*/


using System;
using System.Collections.Generic;

namespace ECommerceAPI.Application.DTOs.Orders
{
    public class OrderDto
    {
        public string Id            { get; set; }
        public string UserId        { get; set; }
        public string OrderNumber   { get; set; }
        public decimal TotalAmount  { get; set; }
        public string Status        { get; set; }
        public DateTime CreatedAt   { get; set; }
        public List<OrderItemDto> Items { get; set; }

        // Customer fields — populated from user lookup in MongoAdminService
        public string CustomerName  { get; set; }
        public string CustomerEmail { get; set; }
        public string CustomerPhone { get; set; }

        // PaymentMethod doesn't exist on MongoOrder, omit or keep nullable
        public string PaymentMethod { get; set; }

        public ShippingAddressDto ShippingAddress { get; set; }
    }

    public class ShippingAddressDto
    {
        public string AddressLine1 { get; set; }
        public string AddressLine2 { get; set; }
        public string City         { get; set; }
        public string State        { get; set; }
        public string PostalCode   { get; set; }
        public string Country      { get; set; }
    }

    public class OrderItemDto
    {
        public string ProductId   { get; set; }
        public string ProductName { get; set; }
        public int Quantity       { get; set; }
        public decimal Price      { get; set; }
    }

    public class CreateOrderDto
    {
        public string ShippingAddressId { get; set; } = null!;
    }
}