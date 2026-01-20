using System.Threading.Tasks;
using ECommerceAPI.Domain.Entities;

namespace ECommerceAPI.Infrastructure.Repositories.Interfaces
{
    public interface IPaymentRepository
    {
        Task<Payment> GetByOrderIdAsync(int orderId);
        Task<Payment> GetByTransactionIdAsync(string transactionId);
        Task<Payment> AddAsync(Payment payment);
        Task UpdateAsync(Payment payment);
    }
}
