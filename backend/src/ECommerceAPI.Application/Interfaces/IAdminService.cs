using System;
using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Admin;

namespace ECommerceAPI.Application.Interfaces
{
    public interface IAdminService
    {
        Task<SalesReportDto> GetSalesReportAsync(DateTime? startDate, DateTime? endDate);
        Task<StockAnalysisDto> GetStockAnalysisAsync();
        Task<CustomerInsightsDto> GetCustomerInsightsAsync();
        Task<IEnumerable<AdminUserDto>> GetAllUsersAsync();
        Task<IEnumerable<AdminOrderDto>> GetAllOrdersAsync();

    }
}
