namespace ECommerceAPI.Application.DTOs.Products
{
    public class ProductDto
    {
        public string MongoId { get; set; }

        public int Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public decimal Price { get; set; }
        public int CategoryId { get; set; }
        public string CategoryName { get; set; }
        public string ImageUrl { get; set; }
        public int StockQuantity { get; set; }
        public string Brand { get; set; }
        public decimal Rating { get; set; }
        public int ReviewCount { get; set; }
        public string Specifications { get; set; }
        public bool IsAvailable { get; set; }
    }

    public class ProductSearchDto
    {
        public string Query { get; set; }
        public int? CategoryId { get; set; }
        public decimal? MinPrice { get; set; }
        public decimal? MaxPrice { get; set; }
        public string Brand { get; set; }
    }

    public class ProductCreateDto
    {
        public string Name { get; set; }
        public string Description { get; set; }
        public decimal Price { get; set; }
        public int CategoryId { get; set; }
        public string ImageUrl { get; set; }
        public int StockQuantity { get; set; }
        public string Brand { get; set; }
        public string Specifications { get; set; }
    }
}