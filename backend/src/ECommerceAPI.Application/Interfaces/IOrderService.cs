using System.Collections.Generic;
using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Orders;

namespace ECommerceAPI.Application.Interfaces
{
    public interface IOrderService
    {
        Task<OrderDto> CreateOrderAsync(int userId, CreateOrderDto createDto);
        Task<OrderDto> GetOrderByIdAsync(int orderId, int userId);
        Task<IEnumerable<OrderDto>> GetUserOrdersAsync(int userId);
        Task CancelOrderAsync(int orderId, int userId);
    }
}