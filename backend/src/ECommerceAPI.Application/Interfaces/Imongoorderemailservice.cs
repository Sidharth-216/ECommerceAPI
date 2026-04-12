using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Orders;

namespace ECommerceAPI.Application.Interfaces
{
    /// <summary>
    /// Service for sending order-related transactional emails
    /// </summary>
    public interface IMongoOrderEmailService
    {
        /// <summary>
        /// Send a beautiful order confirmation email after successful order placement
        /// </summary>
        /// <param name="toEmail">Customer's email address</param>
        /// <param name="customerName">Customer's full name</param>
        /// <param name="order">The placed order DTO</param>
        /// <returns>True if email was sent successfully</returns>
        Task<bool> SendOrderConfirmationAsync(string toEmail, string customerName, OrderDto order);

        /// <summary>
        /// Send an order cancellation email
        /// </summary>
        Task<bool> SendOrderCancellationAsync(string toEmail, string customerName, OrderDto order);

        /// <summary>
        /// Send an order status update email (e.g. Shipped, Out for Delivery)
        /// </summary>
        Task<bool> SendOrderStatusUpdateAsync(string toEmail, string customerName, OrderDto order, string previousStatus);

        /// <summary>
        /// Send a detailed invoice email when order is delivered
        /// </summary>
        Task<bool> SendInvoiceAsync(string toEmail, string customerName, OrderDto order, string invoiceHtml, byte[] invoicePdfBytes);
    }
}