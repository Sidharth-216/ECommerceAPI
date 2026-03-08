using System;

namespace ECommerceAPI.Application.DTOs.QRPayment
{
    // ──────────────────────────────────────────────────────────────────────────
    // REQUEST DTOs
    // ──────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Posted by the client to initiate a QR payment session for an order.
    /// </summary>
    public class InitiateQRPaymentDto
    {
        /// <summary>MongoDB ObjectId of the order to pay for</summary>
        public string OrderId { get; set; }
    }

    /// <summary>
    /// Posted by the customer after they have completed the UPI transfer,
    /// optionally supplying their UTR / transaction reference.
    /// </summary>
    public class MarkPaymentReceivedDto
    {
        /// <summary>Optional UTR / transaction ID from the UPI app</summary>
        public string Utr { get; set; }
    }

    /// <summary>
    /// Posted by the admin to confirm (or reject) a pending QR payment.
    /// </summary>
    public class AdminConfirmPaymentDto
    {
        /// <summary>true = confirm payment; false = reject / cancel</summary>
        public bool Confirm { get; set; }

        /// <summary>Optional note (reason for rejection, or receipt note)</summary>
        public string Note { get; set; }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // RESPONSE DTOs
    // ──────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// Returned to the client when a QR payment session is created.
    /// The frontend renders this as a QR code.
    /// </summary>
    public class QRPaymentResponseDto
    {
        public string PaymentId        { get; set; }
        public string OrderId          { get; set; }
        public string OrderNumber      { get; set; }
        public decimal Amount          { get; set; }

        /// <summary>
        /// The UPI deeplink / PhonePe static QR URL that the QR code encodes.
        /// For now this is the static PhonePe QR; later swap for dynamic UPI string.
        /// </summary>
        public string QRPayload        { get; set; }

        /// <summary>Short reference the user should add in UPI payment note</summary>
        public string PaymentReference { get; set; }

        public string Status           { get; set; }
        public DateTime ExpiresAt      { get; set; }

        /// <summary>Seconds remaining until the QR session expires</summary>
        public int ExpiresInSeconds    { get; set; }
    }

    /// <summary>
    /// Lightweight status check response for polling.
    /// </summary>
    public class QRPaymentStatusDto
    {
        public string PaymentId        { get; set; }
        public string OrderId          { get; set; }
        public string Status           { get; set; }
        public DateTime ExpiresAt      { get; set; }
        public int ExpiresInSeconds    { get; set; }
        public bool IsExpired          { get; set; }
    }

    /// <summary>
    /// Admin-facing view of a pending QR payment, with extra context.
    /// </summary>
    public class AdminQRPaymentDto
    {
        public string PaymentId        { get; set; }
        public string OrderId          { get; set; }
        public string OrderNumber      { get; set; }
        public string UserId           { get; set; }
        public string CustomerName     { get; set; }
        public string CustomerEmail    { get; set; }
        public decimal Amount          { get; set; }
        public string Status           { get; set; }
        public string PaymentReference { get; set; }
        public string UserProvidedUtr  { get; set; }
        public DateTime CreatedAt      { get; set; }
        public DateTime ExpiresAt      { get; set; }
        public bool IsExpired          { get; set; }
        public string AdminNote        { get; set; }
        public DateTime? ConfirmedAt   { get; set; }
    }
}