using System;

namespace ECommerceAPI.Application.DTOs.Admin
{
    /// <summary>
    /// DTO for creating a new product (Admin)
    /// </summary>
    public class CreateProductDto
    {
        public string Name { get; set; }
        public string Brand { get; set; }
        public string Category { get; set; }
        public decimal Price { get; set; }
        public int StockQuantity { get; set; }
        public string Description { get; set; }
        public string ImageUrl { get; set; }
    }

    /// <summary>
    /// DTO for updating an existing product (Admin)
    /// </summary>
    public class UpdateProductDto
    {
        public string Name { get; set; }
        public string Brand { get; set; }
        public string Category { get; set; }
        public decimal? Price { get; set; }
        public int? StockQuantity { get; set; }
        public string Description { get; set; }
        public string ImageUrl { get; set; }
    }

    /// <summary>
    /// DTO for updating order status (Admin)
    /// </summary>
    public class UpdateOrderStatusDto
    {
        public string Status { get; set; }
    }
}