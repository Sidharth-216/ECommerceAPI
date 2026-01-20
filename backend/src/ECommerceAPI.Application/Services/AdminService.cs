using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Admin;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Domain.Enums;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Application.Services
{
    public class AdminService : IAdminService
    {
        private readonly IOrderRepository _orderRepository;
        private readonly IProductRepository _productRepository;
        private readonly IUserRepository _userRepository;

        public AdminService(
            IOrderRepository orderRepository,
            IProductRepository productRepository,
            IUserRepository userRepository)
        {
            _orderRepository = orderRepository;
            _productRepository = productRepository;
            _userRepository = userRepository;
        }

        public async Task<SalesReportDto> GetSalesReportAsync(DateTime? startDate, DateTime? endDate)
        {
            var start = startDate ?? DateTime.UtcNow.AddMonths(-1);
            var end = endDate ?? DateTime.UtcNow;

            var orders = await _orderRepository.GetAllAsync();
            
            var filteredOrders = orders
                .Where(o => o.CreatedAt >= start && o.CreatedAt <= end)
                .Where(o => o.Status == OrderStatus.Delivered)
                .ToList();

            var totalSales = filteredOrders.Sum(o => o.TotalAmount);
            var totalOrders = filteredOrders.Count;
            var averageOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

            var dailySales = filteredOrders
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
                TotalSales = totalSales,
                TotalOrders = totalOrders,
                AverageOrderValue = averageOrderValue,
                DailySalesList = dailySales
            };
        }

        public async Task<StockAnalysisDto> GetStockAnalysisAsync()
        {
            var products = await _productRepository.GetAllAsync();
            var productList = products.ToList();

            var outOfStockCount = productList.Count(p => p.StockQuantity == 0);
            var lowStockCount = productList.Count(p => p.StockQuantity > 0 && p.StockQuantity < 10);

            var lowStockItems = productList
                .Where(p => p.StockQuantity < 10)
                .Select(p => new ProductStockInfo
                {
                    ProductId = p.Id,
                    ProductName = p.Name,
                    CurrentStock = p.StockQuantity
                })
                .OrderBy(p => p.CurrentStock)
                .ToList();

            return new StockAnalysisDto
            {
                TotalProducts = productList.Count,
                OutOfStockProducts = outOfStockCount,
                LowStockProducts = lowStockCount,
                LowStockItems = lowStockItems
            };
        }

        public async Task<CustomerInsightsDto> GetCustomerInsightsAsync()
        {
            var orders = await _orderRepository.GetAllAsync();
            
            var customerOrders = orders
                .Where(o => o.Status == OrderStatus.Delivered)
                .GroupBy(o => o.UserId)
                .Select(g => new
                {
                    UserId = g.Key,
                    TotalSpent = g.Sum(o => o.TotalAmount),
                    OrderCount = g.Count(),
                    User = g.First().User
                })
                .ToList();

            var topCustomers = customerOrders
                .OrderByDescending(c => c.TotalSpent)
                .Take(10)
                .Select(c => new TopCustomer
                {
                    UserId = c.UserId,
                    Name = c.User?.FullName ?? "Unknown",
                    TotalSpent = c.TotalSpent,
                    OrderCount = c.OrderCount
                })
                .ToList();

            return new CustomerInsightsDto
            {
                TotalCustomers = customerOrders.Count,
                ActiveCustomers = customerOrders.Count,
                NewCustomersThisMonth = 0,
                TopCustomers = topCustomers
            };
        }

        public async Task<IEnumerable<AdminUserDto>> GetAllUsersAsync()
        {
            var users = await _userRepository.GetAllAsync();

            return users.Select(u => new AdminUserDto
            {
                Id = u.Id,
                FullName = u.FullName,
                Email = u.Email,
                Mobile = u.Mobile,
                Role = u.Role.ToString(),
                IsActive = u.IsActive
            }).ToList();
        }

        public async Task<IEnumerable<AdminOrderDto>> GetAllOrdersAsync()
        {
            var orders = await _orderRepository.GetAllAsync();

            return orders
                .OrderByDescending(o => o.CreatedAt)
                .Select(o => new AdminOrderDto
                {
                    Id = o.Id,
                    UserId = o.UserId,
                    CustomerName = o.User?.FullName ?? "Unknown",
                    CustomerEmail = o.User?.Email ?? "N/A",
                    TotalAmount = o.TotalAmount,
                    Status = o.Status.ToString(),
                    CreatedAt = o.CreatedAt,
                    UpdatedAt = null,
                    ShippingAddressId = o.ShippingAddressId,
                    OrderItems = o.OrderItems?.Select(oi => new AdminOrderItemDto
                    {
                        Id = oi.Id,
                        ProductId = oi.ProductId,
                        ProductName = oi.Product?.Name ?? "Unknown Product",
                        Quantity = oi.Quantity,
                        UnitPrice = oi.Price,
                        TotalPrice = oi.Quantity * oi.Price
                    }).ToList() ?? new List<AdminOrderItemDto>()
                })
                .ToList();
        }
    }
}