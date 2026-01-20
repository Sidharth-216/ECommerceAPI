using System.Collections.Generic;

namespace ECommerceAPI.Application.DTOs.Admin
{
    public class StockAnalysisDto
    {
        public int TotalProducts { get; set; }
        public int OutOfStockProducts { get; set; }
        public int LowStockProducts { get; set; }
        public List<ProductStockInfo> LowStockItems { get; set; }
    }

    public class ProductStockInfo
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; }
        public int CurrentStock { get; set; }
    }
}
