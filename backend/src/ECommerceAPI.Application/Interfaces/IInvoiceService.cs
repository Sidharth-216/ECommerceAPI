using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Orders;

namespace ECommerceAPI.Application.Interfaces
{
    /// <summary>
    /// Service for generating detailed invoices
    /// </summary>
    public interface IInvoiceService
    {
        /// <summary>
        /// Generate detailed invoice HTML for an order
        /// </summary>
        Task<string> GenerateInvoiceHtmlAsync(OrderDto order, string customerName, string customerEmail, string customerPhone);

        /// <summary>
        /// Generate a PDF invoice for an order
        /// </summary>
        Task<byte[]> GenerateInvoicePdfAsync(OrderDto order, string customerName, string customerEmail, string customerPhone);

        /// <summary>
        /// Get invoice as HTML string (for download or email attachment)
        /// </summary>
        Task<string> GetInvoiceAsHtmlAsync(string orderId);

        /// <summary>
        /// Get invoice as PDF bytes for download or email attachment
        /// </summary>
        Task<byte[]> GetInvoiceAsPdfAsync(string orderId);
    }
}
