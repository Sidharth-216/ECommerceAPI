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
using Microsoft.Extensions.Logging;

namespace ECommerceAPI.Application.Services
{
    /// <summary>
    /// MongoDB Admin Service Implementation - FIXED VERSION
    /// Properly retrieves data from MongoDB Atlas
    /// </summary>
    public class MongoAdminService : IMongoAdminService
    {
        private readonly IMongoUserRepository _userRepository;
        private readonly IMongoOrderRepository _orderRepository;
        private readonly IProductMongoRepository _productRepository;
        private readonly ILogger<MongoAdminService> _logger;

        public MongoAdminService(
            IMongoUserRepository userRepository,
            IMongoOrderRepository orderRepository,
            IProductMongoRepository productRepository,
            ILogger<MongoAdminService> logger)
        {
            _userRepository = userRepository;
            _orderRepository = orderRepository;
            _productRepository = productRepository;
            _logger = logger;
        }

        #region User Management

        public async Task<IEnumerable<UserDto>> GetAllUsersAsync()
        {
            try
            {
                _logger.LogInformation("📋 [MongoAdminService] Fetching all users from MongoDB");
                
                var users = await _userRepository.GetAllAsync();
                
                if (users == null || !users.Any())
                {
                    _logger.LogWarning("⚠️ No users found in MongoDB");
                    return new List<UserDto>();
                }

                var userDtos = users.Select(u => new UserDto
                {
                    Id = u.Id,
                    FullName = u.FullName ?? "N/A",
                    Email = u.Email ?? "N/A",
                    Mobile = u.Mobile ?? "N/A",
                    Gender = u.Gender ?? "Not Specified",
                    Role = u.Role ?? "Customer",
                    CreatedAt = u.CreatedAt,
                    UpdatedAt = u.LastLoginAt ?? u.CreatedAt
                }).ToList();

                _logger.LogInformation($"✅ Retrieved {userDtos.Count} users from MongoDB");
                return userDtos;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error fetching users from MongoDB");
                throw;
            }
        }

        public async Task<UserDto> GetUserByIdAsync(string mongoId)
        {
            try
            {
                _logger.LogInformation($"👤 [MongoAdminService] Fetching user by ID: {mongoId}");
                
                var user = await _userRepository.GetByIdAsync(mongoId);
                
                if (user == null)
                {
                    throw new KeyNotFoundException($"User not found with ID: {mongoId}");
                }

                return new UserDto
                {
                    Id = user.Id,
                    FullName = user.FullName ?? "N/A",
                    Email = user.Email ?? "N/A",
                    Mobile = user.Mobile ?? "N/A",
                    Gender = user.Gender ?? "Not Specified",
                    Role = user.Role ?? "Customer",
                    CreatedAt = user.CreatedAt,
                    UpdatedAt = user.LastLoginAt ?? user.CreatedAt
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error fetching user {mongoId}");
                throw;
            }
        }

        #endregion

        #region Order Management

        public async Task<IEnumerable<OrderDto>> GetAllOrdersAsync()
        {
            try
            {
                _logger.LogInformation("📦 [MongoAdminService] Fetching all orders from MongoDB");
                
                var orders = await _orderRepository.GetAllAsync();
                
                if (orders == null || !orders.Any())
                {
                    _logger.LogWarning("⚠️ No orders found in MongoDB");
                    return new List<OrderDto>();
                }

                var orderDtos = orders.Select(MapOrderToDto).ToList();

                _logger.LogInformation($"✅ Retrieved {orderDtos.Count} orders from MongoDB");
                return orderDtos;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error fetching orders from MongoDB");
                throw;
            }
        }

        public async Task<OrderStatsDto> GetOrderStatsAsync()
        {
            try
            {
                _logger.LogInformation("📊 [MongoAdminService] Calculating order statistics");
                
                var orders = await _orderRepository.GetAllAsync();
                var orderList = orders?.ToList() ?? new List<MongoOrder>();

                var completedOrders = orderList.Where(o => o.Status != "Cancelled").ToList();
                var totalRevenue = completedOrders.Sum(o => o.TotalAmount);

                return new OrderStatsDto
                {
                    TotalOrders = orderList.Count,
                    PendingOrders = orderList.Count(o => o.Status == "Pending"),
                    ProcessingOrders = orderList.Count(o => o.Status == "Processing"),
                    ShippedOrders = orderList.Count(o => o.Status == "Shipped"),
                    DeliveredOrders = orderList.Count(o => o.Status == "Delivered"),
                    CancelledOrders = orderList.Count(o => o.Status == "Cancelled"),
                    TotalRevenue = totalRevenue,
                    AverageOrderValue = orderList.Count > 0 ? totalRevenue / orderList.Count : 0
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error calculating order stats");
                throw;
            }
        }

        #endregion

        #region Sales & Revenue Reports

        public async Task<SalesReportDto> GetSalesReportAsync(DateTime? startDate, DateTime? endDate)
        {
            try
            {
                var start = startDate ?? DateTime.UtcNow.AddDays(-30);
                var end = endDate ?? DateTime.UtcNow;

                _logger.LogInformation($"📊 [MongoAdminService] Generating sales report: {start:yyyy-MM-dd} to {end:yyyy-MM-dd}");

                var orders = await _orderRepository.GetOrdersByDateRangeAsync(start, end);
                var completedOrders = orders.Where(o => o.Status != "Cancelled").ToList();

                var totalRevenue = completedOrders.Sum(o => o.TotalAmount);
                var totalOrders = completedOrders.Count;

                // Calculate daily sales
                var dailySales = completedOrders
                    .GroupBy(o => o.CreatedAt.Date)
                    .Select(g => new DailySales
                    {
                        Date = g.Key,
                        Sales = g.Sum(o => o.TotalAmount),
                        Orders = g.Count()
                    })
                    .OrderBy(d => d.Date)
                    .ToList();

                return new SalesReportDto
                {
                    TotalSales = totalRevenue,
                    TotalOrders = totalOrders,
                    AverageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0,
                    DailySalesList = dailySales
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error generating sales report");
                throw;
            }
        }

        public async Task<RevenueDto> GetRevenueAsync(DateTime? startDate, DateTime? endDate)
        {
            try
            {
                var start = startDate ?? DateTime.UtcNow.AddDays(-30);
                var end = endDate ?? DateTime.UtcNow;

                _logger.LogInformation($"💰 [MongoAdminService] Calculating revenue: {start:yyyy-MM-dd} to {end:yyyy-MM-dd}");

                var orders = await _orderRepository.GetOrdersByDateRangeAsync(start, end);
                var completedOrders = orders.Where(o => o.Status != "Cancelled").ToList();

                var totalRevenue = completedOrders.Sum(o => o.TotalAmount);
                var orderCount = completedOrders.Count;

                // Estimate tax (18% GST) and shipping (₹50 per order)
                var totalTax = totalRevenue * 0.18m;
                var totalShipping = orderCount * 50m;

                return new RevenueDto
                {
                    StartDate = start,
                    EndDate = end,
                    TotalRevenue = totalRevenue,
                    TotalTax = totalTax,
                    TotalShipping = totalShipping,
                    NetRevenue = totalRevenue - totalTax - totalShipping,
                    OrderCount = orderCount,
                    AverageOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error calculating revenue");
                throw;
            }
        }

        public async Task<IEnumerable<TopProductDto>> GetTopProductsAsync(int limit = 10)
        {
            try
            {
                _logger.LogInformation($"🏆 [MongoAdminService] Fetching top {limit} products");

                var orders = await _orderRepository.GetAllAsync();
                var completedOrders = orders.Where(o => o.Status != "Cancelled").ToList();

                var products = await _productRepository.GetAllAsync();
                var productDict = products.ToDictionary(p => p.Id, p => p);

                var topProducts = completedOrders
                    .SelectMany(o => o.Items)
                    .GroupBy(i => new
                    {
                        i.ProductId,
                        i.ProductName,
                        Category = productDict.ContainsKey(i.ProductId)
                            ? productDict[i.ProductId].Category?.Name ?? "Uncategorized"
                            : "Uncategorized"
                    })
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

                return topProducts;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error fetching top products");
                throw;
            }
        }

        public async Task<IEnumerable<CategorySalesDto>> GetSalesByCategoryAsync(DateTime? startDate, DateTime? endDate)
        {
            try
            {
                var start = startDate ?? DateTime.UtcNow.AddDays(-30);
                var end = endDate ?? DateTime.UtcNow;

                _logger.LogInformation($"📊 [MongoAdminService] Calculating sales by category");

                var orders = await _orderRepository.GetOrdersByDateRangeAsync(start, end);
                var completedOrders = orders.Where(o => o.Status != "Cancelled").ToList();

                var products = await _productRepository.GetAllAsync();
                var productDict = products.ToDictionary(p => p.Id, p => p);

                var totalRevenue = completedOrders.Sum(o => o.TotalAmount);

                var categorySales = completedOrders
                    .SelectMany(o => o.Items)
                    .Select(i => new
                    {
                        Item = i,
                        Category = productDict.ContainsKey(i.ProductId)
                            ? productDict[i.ProductId].Category?.Name ?? "Uncategorized"
                            : "Uncategorized"
                    })
                    .GroupBy(x => x.Category)
                    .Select(g => new CategorySalesDto
                    {
                        Category = g.Key,
                        OrderCount = g.Select(x => x.Item).Distinct().Count(),
                        QuantitySold = g.Sum(x => x.Item.Quantity),
                        Revenue = g.Sum(x => x.Item.Price * x.Item.Quantity),
                        Percentage = totalRevenue > 0 
                            ? (g.Sum(x => x.Item.Price * x.Item.Quantity) / totalRevenue) * 100 
                            : 0
                    })
                    .OrderByDescending(c => c.Revenue)
                    .ToList();

                return categorySales;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error calculating sales by category");
                throw;
            }
        }

        public async Task<IEnumerable<ProductSalesDto>> GetSalesByProductAsync(DateTime? startDate, DateTime? endDate)
        {
            try
            {
                var start = startDate ?? DateTime.UtcNow.AddDays(-30);
                var end = endDate ?? DateTime.UtcNow;

                _logger.LogInformation($"📦 [MongoAdminService] Calculating sales by product");

                var orders = await _orderRepository.GetOrdersByDateRangeAsync(start, end);
                var completedOrders = orders.Where(o => o.Status != "Cancelled").ToList();

                var products = await _productRepository.GetAllAsync();
                var productDict = products.ToDictionary(p => p.Id, p => p);

                var productSales = completedOrders
                    .SelectMany(o => o.Items)
                    .GroupBy(i => new
                    {
                        i.ProductId,
                        i.ProductName,
                        Category = productDict.ContainsKey(i.ProductId)
                            ? productDict[i.ProductId].Category?.Name ?? "Uncategorized"
                            : "Uncategorized"
                    })
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

                return productSales;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error calculating sales by product");
                throw;
            }
        }

        #endregion

        #region Stock & Inventory

        public async Task<StockAnalysisDto> GetStockAnalysisAsync()
        {
            try
            {
                _logger.LogInformation("📈 [MongoAdminService] Analyzing stock");

                var products = await _productRepository.GetAllAsync();
                var productList = products?.ToList() ?? new List<ProductMongo>();

                var lowStockItems = productList
                    .Where(p => p.StockQuantity > 0 && p.StockQuantity <= 10)
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

                return new StockAnalysisDto
                {
                    TotalProducts = productList.Count,
                    TotalStockQuantity = productList.Sum(p => p.StockQuantity),
                    TotalStockValue = productList.Sum(p => p.StockQuantity * p.Price),
                    LowStockProducts = productList.Count(p => p.StockQuantity > 0 && p.StockQuantity <= 10),
                    OutOfStockProducts = productList.Count(p => p.StockQuantity == 0),
                    LowStockItems = lowStockItems,
                    StockByCategory = stockByCategory
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error analyzing stock");
                throw;
            }
        }

        #endregion

        #region Customer Analytics

        public async Task<CustomerInsightsDto> GetCustomerInsightsAsync()
        {
            try
            {
                _logger.LogInformation("👥 [MongoAdminService] Analyzing customer insights");

                var users = await _userRepository.GetAllAsync();
                var customers = users.Where(u => u.Role == "Customer").ToList();

                var orders = await _orderRepository.GetAllAsync();
                var completedOrders = orders.Where(o => o.Status != "Cancelled").ToList();

                var now = DateTime.UtcNow;
                var monthStart = new DateTime(now.Year, now.Month, 1);

                var activeCustomerIds = completedOrders
                    .Where(o => o.CreatedAt >= now.AddDays(-90))
                    .Select(o => o.UserId)
                    .Distinct()
                    .Count();

                var topCustomersData = completedOrders
                    .GroupBy(o => o.UserId)
                    .Select(g => new
                    {
                        UserId = g.Key,
                        TotalSpent = g.Sum(o => o.TotalAmount),
                        OrderCount = g.Count()
                    })
                    .OrderByDescending(c => c.TotalSpent)
                    .Take(10)
                    .ToList();

                var topCustomers = new List<TopCustomer>();
                foreach (var customerData in topCustomersData)
                {
                    var user = await _userRepository.GetByIdAsync(customerData.UserId);
                    if (user != null)
                    {
                        topCustomers.Add(new TopCustomer
                        {
                            UserId = user.SqlUserId ?? 0,
                            Name = user.FullName,
                            TotalSpent = customerData.TotalSpent,
                            OrderCount = customerData.OrderCount
                        });
                    }
                }

                return new CustomerInsightsDto
                {
                    TotalCustomers = customers.Count,
                    ActiveCustomers = activeCustomerIds,
                    NewCustomersThisMonth = customers.Count(u => u.CreatedAt >= monthStart),
                    TopCustomers = topCustomers
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error analyzing customer insights");
                throw;
            }
        }

        #endregion

        #region Metrics & Analytics

        public async Task<IEnumerable<DailyMetricDto>> GetDailyMetricsAsync(DateTime? startDate, DateTime? endDate)
        {
            try
            {
                var start = startDate ?? DateTime.UtcNow.AddDays(-30);
                var end = endDate ?? DateTime.UtcNow;

                _logger.LogInformation($"📅 [MongoAdminService] Calculating daily metrics");

                var orders = await _orderRepository.GetOrdersByDateRangeAsync(start, end);
                var users = await _userRepository.GetAllAsync();

                var dailyMetrics = new List<DailyMetricDto>();

                for (var date = start.Date; date <= end.Date; date = date.AddDays(1))
                {
                    var dayOrders = orders
                        .Where(o => o.CreatedAt.Date == date && o.Status != "Cancelled")
                        .ToList();

                    var newCustomers = users.Count(u => 
                        u.CreatedAt.Date == date && u.Role == "Customer");

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
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error calculating daily metrics");
                throw;
            }
        }

        #endregion

        #region Dashboard

        public async Task<AdminDashboardDto> GetDashboardAsync()
        {
            try
            {
                _logger.LogInformation("🎯 [MongoAdminService] Building admin dashboard");

                var now = DateTime.UtcNow;
                var today = now.Date;
                var weekStart = today.AddDays(-(int)today.DayOfWeek);
                var monthStart = new DateTime(now.Year, now.Month, 1);

                // Fetch all data in parallel
                var orderStatsTask = GetOrderStatsAsync();
                var revenueStatsTask = GetRevenueAsync(now.AddDays(-30), now);
                var usersTask = _userRepository.GetAllAsync();
                var productsTask = _productRepository.GetAllAsync();
                var recentMetricsTask = GetDailyMetricsAsync(now.AddDays(-7), now);
                var topProductsTask = GetTopProductsAsync(5);

                await Task.WhenAll(
                    orderStatsTask, 
                    revenueStatsTask, 
                    usersTask, 
                    productsTask,
                    recentMetricsTask,
                    topProductsTask
                );

                var orderStats = await orderStatsTask;
                var revenueStats = await revenueStatsTask;
                var users = await usersTask;
                var products = await productsTask;
                var recentMetrics = await recentMetricsTask;
                var topProducts = await topProductsTask;

                var customers = users.Where(u => u.Role == "Customer").ToList();
                var productList = products.ToList();

                var customerSummary = new CustomerSummaryDto
                {
                    TotalCustomers = customers.Count,
                    NewCustomersToday = customers.Count(u => u.CreatedAt.Date == today),
                    NewCustomersThisWeek = customers.Count(u => u.CreatedAt >= weekStart),
                    NewCustomersThisMonth = customers.Count(u => u.CreatedAt >= monthStart),
                    ActiveCustomers = 0 // Will be calculated from orders
                };

                var stockSummary = new StockSummaryDto
                {
                    TotalProducts = productList.Count,
                    LowStockProducts = productList.Count(p => p.StockQuantity > 0 && p.StockQuantity <= 10),
                    OutOfStockProducts = productList.Count(p => p.StockQuantity == 0),
                    TotalStockValue = productList.Sum(p => p.StockQuantity * p.Price)
                };

                var dashboard = new AdminDashboardDto
                {
                    OrderStats = orderStats,
                    RevenueStats = revenueStats,
                    CustomerSummary = customerSummary,
                    StockSummary = stockSummary,
                    RecentMetrics = recentMetrics.ToList(),
                    TopProducts = topProducts.ToList()
                };

                _logger.LogInformation("✅ Dashboard built successfully");
                return dashboard;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "❌ Error building dashboard");
                throw;
            }
        }

        #endregion

        #region Helper Methods

        private OrderDto MapOrderToDto(MongoOrder order)
        {
            return new OrderDto
            {
                Id = order.Id, // MongoDB ObjectId as string
                OrderNumber = order.OrderNumber ?? "N/A",
                Status = order.Status ?? "Unknown",
                TotalAmount = order.TotalAmount,
                CreatedAt = order.CreatedAt,
                Items = order.Items?.Select(i => new OrderItemDto
                {
                    ProductId = i.ProductId,
                    ProductName = i.ProductName ?? "Unknown Product",
                    Price = i.Price,
                    Quantity = i.Quantity
                }).ToList() ?? new List<OrderItemDto>()
            };
        }

        #endregion
    }
}