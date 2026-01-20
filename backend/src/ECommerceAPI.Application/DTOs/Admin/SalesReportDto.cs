using System;
using System.Collections.Generic;

namespace ECommerceAPI.Application.DTOs.Admin
{
    public class SalesReportDto
    {
        public decimal TotalSales { get; set; }
        public int TotalOrders { get; set; }
        public decimal AverageOrderValue { get; set; }
        public List<DailySales> DailySalesList { get; set; }
    }

    public class DailySales
    {
        public DateTime Date { get; set; }
        public decimal Sales { get; set; }
        public int Orders { get; set; }
    }
}
