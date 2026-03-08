using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;

namespace ECommerceAPI.Domain.Entities.Mongo
{
    /// <summary>
    /// Represents a QR payment session linked to an order.
    /// Created when the user initiates checkout with QR method.
    /// Admin manually confirms payment → order moves to Pending.
    /// </summary>
    public class MongoQRPayment
    {
        [BsonId]
        [BsonRepresentation(BsonType.ObjectId)]
        public string Id { get; set; }

        /// <summary>MongoDB ObjectId of the related order</summary>
        [BsonElement("orderId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string OrderId { get; set; }

        /// <summary>MongoDB ObjectId of the user who initiated the payment</summary>
        [BsonElement("userId")]
        [BsonRepresentation(BsonType.ObjectId)]
        public string UserId { get; set; }

        /// <summary>Exact amount that should be paid</summary>
        [BsonElement("amount")]
        public decimal Amount { get; set; }

        /// <summary>
        /// Payment status:
        ///   AwaitingPayment  – QR shown, user has not paid yet
        ///   PaymentReceived  – User marked as paid (self-reported) or admin confirmed
        ///   Confirmed        – Admin has manually confirmed receipt
        ///   Expired          – QR session timed out (> 30 min without confirmation)
        ///   Cancelled        – Order was cancelled before payment
        /// </summary>
        [BsonElement("status")]
        public string Status { get; set; } = QRPaymentStatus.AwaitingPayment;

        /// <summary>The UPI/QR string payload (or static PhonePe QR URL for now)</summary>
        [BsonElement("qrPayload")]
        public string QRPayload { get; set; }

        /// <summary>Human-readable reference that user should include in the UPI note</summary>
        [BsonElement("paymentReference")]
        public string PaymentReference { get; set; }

        /// <summary>Optional UTR / transaction ID the user can provide after payment</summary>
        [BsonElement("userProvidedUtr")]
        [BsonIgnoreIfNull]
        public string UserProvidedUtr { get; set; }

        /// <summary>Admin note when confirming or rejecting</summary>
        [BsonElement("adminNote")]
        [BsonIgnoreIfNull]
        public string AdminNote { get; set; }

        /// <summary>Admin MongoDB ObjectId who performed the confirmation</summary>
        [BsonElement("confirmedByAdminId")]
        [BsonIgnoreIfNull]
        [BsonRepresentation(BsonType.ObjectId)]
        public string ConfirmedByAdminId { get; set; }

        [BsonElement("createdAt")]
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        /// <summary>When payment was confirmed by admin</summary>
        [BsonElement("confirmedAt")]
        [BsonIgnoreIfNull]
        public DateTime? ConfirmedAt { get; set; }

        /// <summary>QR session expires after this time if not confirmed</summary>
        [BsonElement("expiresAt")]
        public DateTime ExpiresAt { get; set; }

        [BsonElement("updatedAt")]
        [BsonIgnoreIfNull]
        public DateTime? UpdatedAt { get; set; }
    }

    /// <summary>Status constants for MongoQRPayment</summary>
    public static class QRPaymentStatus
    {
        public const string AwaitingPayment = "AwaitingPayment";
        public const string PaymentReceived = "PaymentReceived";
        public const string Confirmed       = "Confirmed";
        public const string Expired         = "Expired";
        public const string Cancelled       = "Cancelled";
    }
}