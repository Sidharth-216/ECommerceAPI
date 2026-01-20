using System.Collections.Generic;

namespace ECommerceAPI.Application.DTOs.Admin
{
    public class CustomerInsightsDto
    {
        public int TotalCustomers { get; set; }
        public int ActiveCustomers { get; set; }
        public int NewCustomersThisMonth { get; set; }
        public List<TopCustomer> TopCustomers { get; set; }
    }

    public class TopCustomer
    {
        public int UserId { get; set; }
        public string Name { get; set; }
        public decimal TotalSpent { get; set; }
        public int OrderCount { get; set; }
    }
}
