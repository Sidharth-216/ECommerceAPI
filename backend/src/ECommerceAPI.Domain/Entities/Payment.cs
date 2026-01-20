using System;
using ECommerceAPI.Domain.Enums;

namespace ECommerceAPI.Domain.Entities
{
    /// <summary>
    /// Payment entity for order payments
    /// </summary>
    public class Payment
    {
        public int Id { get; set; }
        public int OrderId { get; set; }
        public Order Order { get; set; }
        public string TransactionId { get; set; }
        public decimal Amount { get; set; }
        public PaymentStatus Status { get; set; }
        public string PaymentMethod { get; set; } // UPI, Card, etc.
        public DateTime CreatedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
    }
}