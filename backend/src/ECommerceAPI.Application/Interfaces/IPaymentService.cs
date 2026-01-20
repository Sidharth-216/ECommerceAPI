/*using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Payment;

namespace ECommerceAPI.Application.Interfaces
{
    public interface IPaymentService
    {
        Task<PaymentInitiationDto> InitiatePaymentAsync(int userId, int orderId);
        Task<bool> VerifyPaymentAsync(PaymentVerificationDto verification);
    }
}
*/

using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Payment;

namespace ECommerceAPI.Application.Interfaces
{
    public interface IPaymentService
    {
        Task<PaymentInitiationDto> InitiatePaymentAsync(int userId, int orderId);
        Task<bool> VerifyPaymentAsync(PaymentVerificationDto verification);
        Task<bool> HandleCODPaymentAsync(int orderId, int userId);
    }
}