using System.Collections.Generic;
using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.QRPayment;

namespace ECommerceAPI.Application.Interfaces
{
    /// <summary>
    /// Service interface for the QR-based manual payment flow.
    ///
    /// Flow:
    ///   1. Customer: InitiateAsync        → order moves to PaymentPending, QR session created
    ///   2. Customer: MarkReceivedAsync     → session moves to PaymentReceived (user says they paid)
    ///   3. Admin:    GetPendingAsync       → lists all sessions needing confirmation
    ///   4. Admin:    ConfirmPaymentAsync   → confirms payment → order moves to Pending (normal flow)
    ///              or RejectPaymentAsync   → rejects → session Cancelled, order stays PaymentPending
    ///   5. Background (optional): MarkExpiredSessionsAsync → expire stale sessions
    /// </summary>
    public interface IQRPaymentService
    {
        // ── Customer-facing ─────────────────────────────────────────────────

        /// <summary>
        /// Create (or reuse) a QR payment session for the given order.
        /// Sets the order status to "PaymentPending".
        /// </summary>
        Task<QRPaymentResponseDto> InitiateAsync(string mongoUserId, string orderId);

        /// <summary>
        /// Get the current QR payment session for an order (for polling / display).
        /// </summary>
        Task<QRPaymentStatusDto> GetStatusAsync(string mongoUserId, string orderId);

        /// <summary>
        /// Customer marks that they have completed the transfer.
        /// Optionally provides a UTR reference.
        /// Moves session status to PaymentReceived.
        /// </summary>
        Task<QRPaymentStatusDto> MarkReceivedAsync(string mongoUserId, string paymentId, string utr);

        // ── Admin-facing ─────────────────────────────────────────────────────

        /// <summary>
        /// Get all QR payment sessions awaiting admin confirmation.
        /// </summary>
        Task<IEnumerable<AdminQRPaymentDto>> GetPendingAsync();

        /// <summary>
        /// Get all QR payment sessions (full history).
        /// </summary>
        Task<IEnumerable<AdminQRPaymentDto>> GetAllAsync();

        /// <summary>
        /// Admin confirms a payment:
        ///   - session → Confirmed
        ///   - order   → Pending  (enters normal fulfilment pipeline)
        /// </summary>
        Task<bool> ConfirmPaymentAsync(string adminUserId, string paymentId, string note);

        /// <summary>
        /// Admin rejects / cancels a payment session.
        ///   - session → Cancelled
        ///   - order status stays PaymentPending (customer needs to retry)
        /// </summary>
        Task<bool> RejectPaymentAsync(string adminUserId, string paymentId, string note);

        /// <summary>
        /// Expire sessions whose ExpiresAt has passed and are still AwaitingPayment.
        /// Intended to be called by a background job / hosted service.
        /// Returns the number of sessions expired.
        /// </summary>
        Task<int> MarkExpiredSessionsAsync();
    }
}