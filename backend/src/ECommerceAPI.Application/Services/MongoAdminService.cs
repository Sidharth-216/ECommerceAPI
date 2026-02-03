using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Application.DTOs.Admin;
using ECommerceAPI.Application.DTOs.Orders;
using ECommerceAPI.Application.DTOs.User;
using ECommerceAPI.Domain.Entities.MongoDB;
using ECommerceAPI.Domain.Entities.Mongo;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Application.Services
{
    /// <summary>
    /// MongoDB Admin Service Implementation
    /// Works with existing repository interfaces
    /// </summary>
    public class MongoAdminService : IMongoAdminService
    {
        private readonly IMongoUserRepository _userRepository;
        private readonly IMongoOrderRepository _orderRepository;
        private readonly IProductMongoRepository _productRepository;

        public MongoAdminService(
            IMongoUserRepository userRepository,
            IMongoOrderRepository orderRepository,
            IProductMongoRepository productRepository)
        {
            _userRepository = userRepository;
            _orderRepository = orderRepository;
            _productRepository = productRepository;
        }

        public async Task<IEnumerable<UserDto>> GetAllUsersAsync()
        {
            Console.WriteLine("📋 [MongoAdminService] GetAllUsersAsync - Fetching all users");
            var users = await _userRepository.GetAllAsync();
            Console.WriteLine($"✅ Retrieved {users.Count()} users from MongoDB");
            return users.Select(u => new UserDto
            {
                Id = u.Id,
                FullName = u.FullName,
                Email = u.Email,
                Mobile = u.Mobile,
                Gender = u.Gender,
                Role = u.Role,
                CreatedAt = u.CreatedAt,
                UpdatedAt = u.LastLoginAt ?? u.CreatedAt
            });
        }

        public async Task<UserDto> GetUserByIdAsync(string mongoId)
        {
            Console.WriteLine($"👤 [MongoAdminService] GetUserByIdAsync - ID: {mongoId}");
            var user = await _userRepository.GetByIdAsync(mongoId);
            if (user == null)
                throw new KeyNotFoundException($"User not found with ID: {mongoId}");
            Console.WriteLine($"✅ Found user: {user.FullName}");
            return new UserDto
            {
                Id = user.Id,
                FullName = user.FullName,
                Email = user.Email,
                Mobile = user.Mobile,
                Gender = user.Gender,
                Role = user.Role,
                CreatedAt = user.CreatedAt,
                UpdatedAt = user.LastLoginAt ?? user.CreatedAt
            };
        }

        public async Task<IEnumerable<OrderDto>> GetAllOrdersAsync()
        {
            Console.WriteLine("📦 [MongoAdminService] GetAllOrdersAsync - Fetching all orders");
            var orders = await _orderRepository.GetAllAsync();
            Console.WriteLine($"✅ Retrieved {orders.Count()} orders from MongoDB");
            return orders.Select(MapOrderToDto);
        }

        public async Task<SalesReportDto> GetSalesReportAsync(DateTime? startDate, DateTime? endDate)
        {
            Console.WriteLine($"📊 [MongoAdminService] GetSalesReportAsync");
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            var orders = await _orderRepository.GetOrdersByDateRangeAsync(start, end);
            var completedOrders = orders.Where(o => o.Status != "Cancelled").ToList();
            var totalRevenue = completedOrders.Sum(o => o.TotalAmount);
            var totalItemsSold = completedOrders.Sum(o => o.Items.Sum(i => i.Quantity));

            var allProducts = await _productRepository.GetAllAsync();
            var productDict = allProducts.ToDictionary(p => p.Id, p => p);

            var itemsWithCategory = completedOrders
                .SelectMany(o => o.Items)
                .Select(i => new
                {
                    Item = i,
                    Category = productDict.ContainsKey(i.ProductId) 
                        ? productDict[i.ProductId].Category?.Name ?? "Uncategorized" 
                        : "Uncategorized"
                })
                .ToList();

            var salesByCategory = itemsWithCategory
                .GroupBy(x => x.Category)
                .Select(g => new CategorySalesDto
                {
                    Category = g.Key,
                    QuantitySold = g.Sum(x => x.Item.Quantity),
                    Revenue = g.Sum(x => x.Item.Price * x.Item.Quantity),
                    OrderCount = g.Select(x => x.Item).Distinct().Count(),
                    Percentage = totalRevenue > 0 ? (g.Sum(x => x.Item.Price * x.Item.Quantity) / totalRevenue) * 100 : 0
                })
                .OrderByDescending(c => c.Revenue)
                .ToList();

            var topProducts = itemsWithCategory
                .GroupBy(x => new { x.Item.ProductId, x.Item.ProductName, x.Category })
                .Select(g => new ProductSalesDto
                {
                    ProductId = g.Key.ProductId,
                    ProductName = g.Key.ProductName,
                    Category = g.Key.Category,
                    QuantitySold = g.Sum(x => x.Item.Quantity),
                    Revenue = g.Sum(x => x.Item.Price * x.Item.Quantity),
                    OrderCount = g.Count()
                })
                .OrderByDescending(p => p.Revenue)
                .Take(10)
                .ToList();

            Console.WriteLine($"✅ Sales Report Generated: ₹{totalRevenue}");
            return new SalesReportDto
            {
                TotalSales = totalRevenue,
                TotalOrders = completedOrders.Count,
                AverageOrderValue = completedOrders.Count > 0 ? totalRevenue / completedOrders.Count : 0,
                DailySalesList = new List<DailySales>()
            };
        }

        public async Task<StockAnalysisDto> GetStockAnalysisAsync()
        {
            Console.WriteLine("📈 [MongoAdminService] GetStockAnalysisAsync");
            var products = await _productRepository.GetAllAsync();
            var productList = products.ToList();

            var lowStockItems = productList
                .Where(p => p.StockQuantity <= 10)
                .OrderBy(p => p.StockQuantity)
                .Select(p => new LowStockProductDto
                {
                    ProductId = p.Id,
                    ProductName = p.Name,
                    Category = p.Category?.Name ?? "Uncategorized",
                    CurrentStock = p.StockQuantity,
                    ReorderLevel = 10,
                    Price = p.Price
                })
                .ToList();

            var stockByCategory = productList
                .GroupBy(p => p.Category?.Name ?? "Uncategorized")
                .Select(g => new CategoryStockDto
                {
                    Category = g.Key,
                    ProductCount = g.Count(),
                    TotalStock = g.Sum(p => p.StockQuantity),
                    TotalValue = g.Sum(p => p.StockQuantity * p.Price)
                })
                .OrderByDescending(c => c.TotalValue)
                .ToList();

            Console.WriteLine($"✅ Stock Analysis: {productList.Count} products");
            return new StockAnalysisDto
            {
                TotalProducts = productList.Count,
                TotalStockQuantity = productList.Sum(p => p.StockQuantity),
                TotalStockValue = productList.Sum(p => p.StockQuantity * p.Price),
                LowStockProducts = productList.Count(p => p.StockQuantity <= 10 && p.StockQuantity > 0),
                OutOfStockProducts = productList.Count(p => p.StockQuantity == 0),
                LowStockItems = lowStockItems,
                StockByCategory = stockByCategory
            };
        }

        public async Task<CustomerInsightsDto> GetCustomerInsightsAsync()
        {
            Console.WriteLine("👥 [MongoAdminService] GetCustomerInsightsAsync");
            var users = await _userRepository.GetAllAsync();
            var userList = users.Where(u => u.Role == "Customer").ToList();
            var orders = await _orderRepository.GetAllAsync();
            var orderList = orders.Where(o => o.Status != "Cancelled").ToList();

            var now = DateTime.UtcNow;
            var monthStart = new DateTime(now.Year, now.Month, 1);

            var activeCustomers = orderList
                .Where(o => o.CreatedAt >= now.AddDays(-90))
                .Select(o => o.UserId)
                .Distinct()
                .Count();

            var topCustomers = orderList
                .GroupBy(o => o.UserId)
                .Select(g => new { UserId = g.Key, TotalSpent = g.Sum(o => o.TotalAmount), OrderCount = g.Count() })
                .OrderByDescending(c => c.TotalSpent)
                .Take(10)
                .ToList();

            var topCustomerList = new List<TopCustomer>();
            foreach (var customer in topCustomers)
            {
                var user = await _userRepository.GetByIdAsync(customer.UserId);
                if (user != null)
                {
                    topCustomerList.Add(new TopCustomer
                    {
                        UserId = int.Parse(customer.UserId.Substring(0, Math.Min(10, customer.UserId.Length))),
                        Name = user.FullName,
                        TotalSpent = customer.TotalSpent,
                        OrderCount = customer.OrderCount
                    });
                }
            }

            Console.WriteLine($"✅ Customer Insights: {userList.Count} customers");
            return new CustomerInsightsDto
            {
                TotalCustomers = userList.Count,
                ActiveCustomers = activeCustomers,
                NewCustomersThisMonth = userList.Count(u => u.CreatedAt >= monthStart),
                TopCustomers = topCustomerList
            };
        }

        public async Task<OrderStatsDto> GetOrderStatsAsync()
        {
            Console.WriteLine("📊 [MongoAdminService] GetOrderStatsAsync");
            var orders = await _orderRepository.GetAllAsync();
            var orderList = orders.ToList();

            return new OrderStatsDto
            {
                TotalOrders = orderList.Count,
                PendingOrders = orderList.Count(o => o.Status == "Pending"),
                ProcessingOrders = orderList.Count(o => o.Status == "Processing"),
                ShippedOrders = orderList.Count(o => o.Status == "Shipped"),
                DeliveredOrders = orderList.Count(o => o.Status == "Delivered"),
                CancelledOrders = orderList.Count(o => o.Status == "Cancelled"),
                TotalRevenue = orderList.Where(o => o.Status != "Cancelled").Sum(o => o.TotalAmount),
                AverageOrderValue = orderList.Count > 0 
                    ? orderList.Where(o => o.Status != "Cancelled").Average(o => o.TotalAmount) 
                    : 0
            };
        }

        public async Task<RevenueDto> GetRevenueAsync(DateTime? startDate, DateTime? endDate)
        {
            Console.WriteLine($"💰 [MongoAdminService] GetRevenueAsync");
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            var orders = await _orderRepository.GetOrdersByDateRangeAsync(start, end);
            var completedOrders = orders.Where(o => o.Status != "Cancelled").ToList();
            var totalRevenue = completedOrders.Sum(o => o.TotalAmount);

            return new RevenueDto
            {
                StartDate = start,
                EndDate = end,
                TotalRevenue = totalRevenue,
                TotalTax = totalRevenue * 0.18m,
                TotalShipping = completedOrders.Count * 50m,
                NetRevenue = totalRevenue - (totalRevenue * 0.18m) - (completedOrders.Count * 50m),
                OrderCount = completedOrders.Count,
                AverageOrderValue = completedOrders.Count > 0 ? totalRevenue / completedOrders.Count : 0
            };
        }

        public async Task<IEnumerable<TopProductDto>> GetTopProductsAsync(int limit = 10)
        {
            Console.WriteLine($"🏆 [MongoAdminService] GetTopProductsAsync - Limit: {limit}");
            var orders = await _orderRepository.GetAllAsync();
            var completedOrders = orders.Where(o => o.Status != "Cancelled").ToList();
            var allProducts = await _productRepository.GetAllAsync();
            var productDict = allProducts.ToDictionary(p => p.Id, p => p);

            return completedOrders
                .SelectMany(o => o.Items)
                .GroupBy(i => new { i.ProductId, i.ProductName, Category = productDict.ContainsKey(i.ProductId) ? productDict[i.ProductId].Category?.Name ?? "Uncategorized" : "Uncategorized" })
                .Select(g => new TopProductDto
                {
                    ProductId = g.Key.ProductId,
                    ProductName = g.Key.ProductName,
                    Category = g.Key.Category,
                    QuantitySold = g.Sum(i => i.Quantity),
                    Revenue = g.Sum(i => i.Price * i.Quantity),
                    OrderCount = g.Count()
                })
                .OrderByDescending(p => p.Revenue)
                .Take(limit)
                .ToList();
        }

        public async Task<IEnumerable<DailyMetricDto>> GetDailyMetricsAsync(DateTime? startDate, DateTime? endDate)
        {
            Console.WriteLine($"📅 [MongoAdminService] GetDailyMetricsAsync");
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            var orders = await _orderRepository.GetOrdersByDateRangeAsync(start, end);
            var users = await _userRepository.GetAllAsync();
            var dailyMetrics = new List<DailyMetricDto>();

            for (var date = start.Date; date <= end.Date; date = date.AddDays(1))
            {
                var dayOrders = orders.Where(o => o.CreatedAt.Date == date && o.Status != "Cancelled").ToList();
                var newCustomers = users.Count(u => u.CreatedAt.Date == date && u.Role == "Customer");

                dailyMetrics.Add(new DailyMetricDto
                {
                    Date = date,
                    Orders = dayOrders.Count,
                    Revenue = dayOrders.Sum(o => o.TotalAmount),
                    ItemsSold = dayOrders.Sum(o => o.Items.Sum(i => i.Quantity)),
                    NewCustomers = newCustomers
                });
            }

            return dailyMetrics;
        }

        public async Task<IEnumerable<CategorySalesDto>> GetSalesByCategoryAsync(DateTime? startDate, DateTime? endDate)
        {
            Console.WriteLine($"📊 [MongoAdminService] GetSalesByCategoryAsync");
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            var orders = await _orderRepository.GetOrdersByDateRangeAsync(start, end);
            var completedOrders = orders.Where(o => o.Status != "Cancelled").ToList();
            var allProducts = await _productRepository.GetAllAsync();
            var productDict = allProducts.ToDictionary(p => p.Id, p => p);
            var totalRevenue = completedOrders.Sum(o => o.TotalAmount);

            return completedOrders
                .SelectMany(o => o.Items)
                .Select(i => new
                {
                    Item = i,
                    Category = productDict.ContainsKey(i.ProductId) ? productDict[i.ProductId].Category?.Name ?? "Uncategorized" : "Uncategorized"
                })
                .GroupBy(x => x.Category)
                .Select(g => new CategorySalesDto
                {
                    Category = g.Key,
                    OrderCount = g.Select(x => x.Item).Distinct().Count(),
                    QuantitySold = g.Sum(x => x.Item.Quantity),
                    Revenue = g.Sum(x => x.Item.Price * x.Item.Quantity),
                    Percentage = totalRevenue > 0 ? (g.Sum(x => x.Item.Price * x.Item.Quantity) / totalRevenue) * 100 : 0
                })
                .OrderByDescending(c => c.Revenue)
                .ToList();
        }

        public async Task<IEnumerable<ProductSalesDto>> GetSalesByProductAsync(DateTime? startDate, DateTime? endDate)
        {
            Console.WriteLine($"📦 [MongoAdminService] GetSalesByProductAsync");
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            var orders = await _orderRepository.GetOrdersByDateRangeAsync(start, end);
            var completedOrders = orders.Where(o => o.Status != "Cancelled").ToList();
            var allProducts = await _productRepository.GetAllAsync();
            var productDict = allProducts.ToDictionary(p => p.Id, p => p);

            return completedOrders
                .SelectMany(o => o.Items)
                .GroupBy(i => new { i.ProductId, i.ProductName, Category = productDict.ContainsKey(i.ProductId) ? productDict[i.ProductId].Category?.Name ?? "Uncategorized" : "Uncategorized" })
                .Select(g => new ProductSalesDto
                {
                    ProductId = g.Key.ProductId,
                    ProductName = g.Key.ProductName,
                    Category = g.Key.Category,
                    QuantitySold = g.Sum(i => i.Quantity),
                    Revenue = g.Sum(i => i.Price * i.Quantity),
                    OrderCount = g.Count()
                })
                .OrderByDescending(p => p.Revenue)
                .ToList();
        }

        public async Task<AdminDashboardDto> GetDashboardAsync()
        {
            Console.WriteLine("🎯 [MongoAdminService] GetDashboardAsync - Building dashboard");
            var now = DateTime.UtcNow;
            var today = now.Date;
            var weekStart = today.AddDays(-(int)today.DayOfWeek);
            var monthStart = new DateTime(now.Year, now.Month, 1);

            var orderStats = await GetOrderStatsAsync();
            var revenueStats = await GetRevenueAsync(now.AddDays(-30), now);
            var users = await _userRepository.GetAllAsync();
            var customers = users.Where(u => u.Role == "Customer").ToList();

            var customerSummary = new CustomerSummaryDto
            {
                TotalCustomers = customers.Count,
                NewCustomersToday = customers.Count(u => u.CreatedAt.Date == today),
                NewCustomersThisWeek = customers.Count(u => u.CreatedAt >= weekStart),
                NewCustomersThisMonth = customers.Count(u => u.CreatedAt >= monthStart),
                ActiveCustomers = 0
            };

            var products = await _productRepository.GetAllAsync();
            var productList = products.ToList();

            var stockSummary = new StockSummaryDto
            {
                TotalProducts = productList.Count,
                LowStockProducts = productList.Count(p => p.StockQuantity <= 10 && p.StockQuantity > 0),
                OutOfStockProducts = productList.Count(p => p.StockQuantity == 0),
                TotalStockValue = productList.Sum(p => p.StockQuantity * p.Price)
            };

            var recentMetrics = await GetDailyMetricsAsync(now.AddDays(-7), now);
            var topProducts = await GetTopProductsAsync(5);

            return new AdminDashboardDto
            {
                OrderStats = orderStats,
                RevenueStats = revenueStats,
                CustomerSummary = customerSummary,
                StockSummary = stockSummary,
                RecentMetrics = recentMetrics.ToList(),
                TopProducts = topProducts.ToList()
            };
        }

        private OrderDto MapOrderToDto(MongoOrder order)
        {
            return new OrderDto
            {
                Id = order.Id,
                OrderNumber = order.OrderNumber,
                Status = order.Status,
                Items = order.Items.Select(i => new OrderItemDto
                {
                    ProductId = i.ProductId,
                    ProductName = i.ProductName,
                    Price = i.Price,
                    Quantity = i.Quantity
                }).ToList(),
                TotalAmount = order.TotalAmount,
                CreatedAt = order.CreatedAt
            };
        }
    }
}
