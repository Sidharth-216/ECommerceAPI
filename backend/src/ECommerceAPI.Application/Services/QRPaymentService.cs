using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Orders;
using ECommerceAPI.Application.DTOs.QRPayment;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Domain.Entities.Mongo;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ECommerceAPI.Application.Services
{
    /// <summary>
    /// Implements the QR-based manual payment flow.
    ///
    /// Static PhonePe QR for now — swap QRPayload generation when you have
    /// a dynamic UPI deeplink or VPA.
    ///
    /// New order status introduced: "PaymentPending"
    ///   PaymentPending → (admin confirms) → Pending → Processing → Shipped → Delivered
    ///                  → (admin rejects)  → PaymentPending  (customer retries)
    ///                  → (customer/admin cancels order) → Cancelled
    /// </summary>
    public class QRPaymentService : IQRPaymentService
    {
        // How long a QR session stays valid (30 minutes)
        private static readonly TimeSpan QR_EXPIRY = TimeSpan.FromMinutes(30);

        private readonly IQRPaymentRepository  _qrRepo;
        private readonly IMongoOrderRepository _orderRepo;
        private readonly IMongoUserRepository  _userRepo;
        private readonly IMongoOrderEmailService _orderEmailService;
        private readonly ILogger<QRPaymentService> _logger;
        private readonly string _upiId;
        private readonly string _upiPayeeName;

        public QRPaymentService(
            IQRPaymentRepository  qrRepo,
            IMongoOrderRepository orderRepo,
            IMongoUserRepository  userRepo,
            IMongoOrderEmailService orderEmailService,
            ILogger<QRPaymentService> logger,
            IConfiguration configuration)
        {
            _qrRepo    = qrRepo;
            _orderRepo = orderRepo;
            _userRepo  = userRepo;
            _orderEmailService = orderEmailService;
            _logger    = logger;
            _upiId = configuration["Payment:UpiId"] ?? string.Empty;
            _upiPayeeName = configuration["Payment:UpiPayeeName"] ?? "ShopAI";
        }

        // ─────────────────────────────────────────────────────────────────────
        // Customer: Initiate
        // ─────────────────────────────────────────────────────────────────────

        public async Task<QRPaymentResponseDto> InitiateAsync(string mongoUserId, string orderId)
        {
            _logger.LogInformation("💳 [QRPaymentService] InitiateAsync | user={UserId} order={OrderId}",
                mongoUserId, orderId);

            // 1. Load and validate the order
            var order = await _orderRepo.GetByIdAsync(orderId)
                ?? throw new KeyNotFoundException($"Order not found: {orderId}");

            if (order.UserId != mongoUserId)
                throw new UnauthorizedAccessException("Order does not belong to this user.");

            if (order.Status == "Cancelled")
                throw new InvalidOperationException("Cannot initiate payment for a cancelled order.");

            if (order.Status == "Delivered")
                throw new InvalidOperationException("Order already delivered.");

            // 2. Re-use existing active session if one exists (idempotent)
            var existing = await _qrRepo.GetActiveByOrderIdAsync(orderId);
            if (existing != null && existing.ExpiresAt > DateTime.UtcNow)
            {
                _logger.LogInformation("♻️ Reusing existing QR session {Id}", existing.Id);
                return BuildResponse(existing, order.OrderNumber);
            }

            // 3. Build a short human-readable reference
            var reference = $"SHOPAI-{order.OrderNumber ?? orderId.Substring(orderId.Length - 8).ToUpper()}";

            // 4. Build the QR payload (UPI deeplink)
            // Swap STATIC_PHONEPAY_QR_URL for your VPA / dynamic link later
            var qrPayload = BuildQRPayload(order.TotalAmount, reference);

            // 5. Create the session document
            var session = new MongoQRPayment
            {
                OrderId          = orderId,
                UserId           = mongoUserId,
                Amount           = order.TotalAmount,
                Status           = QRPaymentStatus.AwaitingPayment,
                QRPayload        = qrPayload,
                PaymentReference = reference,
                ExpiresAt        = DateTime.UtcNow.Add(QR_EXPIRY),
                CreatedAt        = DateTime.UtcNow
            };

            await _qrRepo.AddAsync(session);

            // 6. Mark the order as PaymentPending
            if (order.Status != "PaymentPending")
            {
                order.Status    = "PaymentPending";
                order.UpdatedAt = DateTime.UtcNow;
                await _orderRepo.UpdateAsync(order);
            }

            _logger.LogInformation("✅ QR session created: {Id} for order {OrderId}", session.Id, orderId);
            return BuildResponse(session, order.OrderNumber);
        }

        // ─────────────────────────────────────────────────────────────────────
        // Customer: Status polling
        // ─────────────────────────────────────────────────────────────────────

        public async Task<QRPaymentStatusDto> GetStatusAsync(string mongoUserId, string orderId)
        {
            var session = await _qrRepo.GetActiveByOrderIdAsync(orderId)
                ?? throw new KeyNotFoundException($"No active QR session for order: {orderId}");

            if (session.UserId != mongoUserId)
                throw new UnauthorizedAccessException("Access denied.");

            return BuildStatusDto(session);
        }

        // ─────────────────────────────────────────────────────────────────────
        // Customer: Mark as paid
        // ─────────────────────────────────────────────────────────────────────

        public async Task<QRPaymentStatusDto> MarkReceivedAsync(string mongoUserId, string paymentId, string utr)
        {
            var session = await _qrRepo.GetByIdAsync(paymentId)
                ?? throw new KeyNotFoundException($"Payment session not found: {paymentId}");

            if (session.UserId != mongoUserId)
                throw new UnauthorizedAccessException("Access denied.");

            if (session.Status == QRPaymentStatus.Expired || session.ExpiresAt < DateTime.UtcNow)
                throw new InvalidOperationException("This QR session has expired. Please start a new payment.");

            if (session.Status == QRPaymentStatus.Confirmed)
                throw new InvalidOperationException("Payment already confirmed.");

            if (session.Status == QRPaymentStatus.Cancelled)
                throw new InvalidOperationException("Payment session has been cancelled.");

            session.Status           = QRPaymentStatus.PaymentReceived;
            session.UserProvidedUtr  = utr?.Trim();
            session.UpdatedAt        = DateTime.UtcNow;

            await _qrRepo.UpdateAsync(session);

            _logger.LogInformation("📲 Payment marked received | session={Id} utr={Utr}", paymentId, utr);
            return BuildStatusDto(session);
        }

        // ─────────────────────────────────────────────────────────────────────
        // Admin: List pending
        // ─────────────────────────────────────────────────────────────────────

        public async Task<IEnumerable<AdminQRPaymentDto>> GetPendingAsync()
        {
            var sessions = await _qrRepo.GetPendingConfirmationsAsync();
            return await EnrichForAdmin(sessions);
        }

        public async Task<IEnumerable<AdminQRPaymentDto>> GetAllAsync()
        {
            var sessions = await _qrRepo.GetAllAsync();
            return await EnrichForAdmin(sessions);
        }

        // ─────────────────────────────────────────────────────────────────────
        // Admin: Confirm
        // ─────────────────────────────────────────────────────────────────────

        public async Task<bool> ConfirmPaymentAsync(string adminUserId, string paymentId, string note)
        {
            _logger.LogInformation("✅ [QRPaymentService] ConfirmPaymentAsync | admin={Admin} payment={PaymentId}",
                adminUserId, paymentId);

            var session = await _qrRepo.GetByIdAsync(paymentId)
                ?? throw new KeyNotFoundException($"Payment session not found: {paymentId}");

            if (session.Status == QRPaymentStatus.Confirmed)
            {
                _logger.LogWarning("⚠️ Payment {Id} already confirmed", paymentId);
                return true; // idempotent
            }

            if (session.Status == QRPaymentStatus.Cancelled)
                throw new InvalidOperationException("Cannot confirm a cancelled payment session.");

            // Mark session confirmed
            session.Status             = QRPaymentStatus.Confirmed;
            session.ConfirmedByAdminId = adminUserId;
            session.ConfirmedAt        = DateTime.UtcNow;
            session.AdminNote          = note;
            session.UpdatedAt          = DateTime.UtcNow;

            await _qrRepo.UpdateAsync(session);

            // Move order from PaymentPending → Pending (enters normal fulfilment)
            var order = await _orderRepo.GetByIdAsync(session.OrderId);
            if (order != null && order.Status == "PaymentPending")
            {
                order.Status    = "Pending";
                order.UpdatedAt = DateTime.UtcNow;
                await _orderRepo.UpdateAsync(order);
                _logger.LogInformation("📦 Order {OrderId} moved to Pending after payment confirmation", order.Id);

                try
                {
                    var user = await _userRepo.GetByIdAsync(order.UserId);
                    if (user != null && !string.IsNullOrWhiteSpace(user.Email))
                    {
                        var orderDto = new OrderDto
                        {
                            Id = order.Id,
                            UserId = order.UserId,
                            OrderNumber = order.OrderNumber,
                            Status = order.Status,
                            TotalAmount = order.TotalAmount,
                            CreatedAt = order.CreatedAt,
                            Items = (order.Items ?? new List<Domain.Entities.MongoDB.MongoOrderItem>())
                                .Select(i => new OrderItemDto
                                {
                                    ProductId = i.ProductId,
                                    ProductName = i.ProductName,
                                    Quantity = i.Quantity,
                                    Price = i.Price
                                })
                                .ToList()
                        };

                        await _orderEmailService.SendOrderConfirmationAsync(
                            user.Email,
                            user.FullName ?? "Valued Customer",
                            orderDto);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "⚠️ Failed to send confirmation email for order {OrderId}", order.Id);
                }
            }

            return true;
        }

        // ─────────────────────────────────────────────────────────────────────
        // Admin: Reject
        // ─────────────────────────────────────────────────────────────────────

        public async Task<bool> RejectPaymentAsync(string adminUserId, string paymentId, string note)
        {
            _logger.LogInformation("❌ [QRPaymentService] RejectPaymentAsync | admin={Admin} payment={PaymentId}",
                adminUserId, paymentId);

            var session = await _qrRepo.GetByIdAsync(paymentId)
                ?? throw new KeyNotFoundException($"Payment session not found: {paymentId}");

            if (session.Status == QRPaymentStatus.Confirmed)
                throw new InvalidOperationException("Cannot reject an already-confirmed payment.");

            session.Status             = QRPaymentStatus.Cancelled;
            session.ConfirmedByAdminId = adminUserId;
            session.AdminNote          = note;
            session.UpdatedAt          = DateTime.UtcNow;

            await _qrRepo.UpdateAsync(session);

            // Order stays in PaymentPending so the customer can retry
            _logger.LogInformation("💬 Payment session {Id} rejected. Order stays PaymentPending.", paymentId);
            return true;
        }

        // ─────────────────────────────────────────────────────────────────────
        // Background: Expire stale sessions
        // ─────────────────────────────────────────────────────────────────────

        public async Task<int> MarkExpiredSessionsAsync()
        {
            var pending = await _qrRepo.GetPendingConfirmationsAsync();
            var now     = DateTime.UtcNow;
            int count   = 0;

            foreach (var session in pending)
            {
                if (session.ExpiresAt < now &&
                    session.Status == QRPaymentStatus.AwaitingPayment)
                {
                    session.Status    = QRPaymentStatus.Expired;
                    session.UpdatedAt = now;
                    await _qrRepo.UpdateAsync(session);
                    count++;
                }
            }

            if (count > 0)
                _logger.LogInformation("⏰ Expired {Count} stale QR payment sessions", count);

            return count;
        }

        // ─────────────────────────────────────────────────────────────────────
        // Private helpers
        // ─────────────────────────────────────────────────────────────────────

        /// <summary>
        /// Build the QR payload as a UPI deeplink.
        /// Example:
        ///   upi://pay?pa=shop@upi&pn=ShopAI&am=123.45&cu=INR&tn=SHOPAI-ORDER123
        /// </summary>
        private string BuildQRPayload(decimal amount, string reference)
        {
            if (string.IsNullOrWhiteSpace(_upiId))
            {
                throw new InvalidOperationException(
                    "UPI ID is not configured. Set Payment:UpiId in appsettings.");
            }

            var formattedAmount = amount.ToString("0.00", CultureInfo.InvariantCulture);
            var escapedUpiId = Uri.EscapeDataString(_upiId.Trim());
            var escapedPayeeName = Uri.EscapeDataString(_upiPayeeName.Trim());
            var escapedReference = Uri.EscapeDataString(reference);

            return $"upi://pay?pa={escapedUpiId}&pn={escapedPayeeName}&am={formattedAmount}&cu=INR&tn={escapedReference}";
        }

        private static QRPaymentResponseDto BuildResponse(MongoQRPayment s, string orderNumber)
        {
            var now       = DateTime.UtcNow;
            var remaining = (int)Math.Max(0, (s.ExpiresAt - now).TotalSeconds);

            return new QRPaymentResponseDto
            {
                PaymentId        = s.Id,
                OrderId          = s.OrderId,
                OrderNumber      = orderNumber,
                Amount           = s.Amount,
                QRPayload        = s.QRPayload,
                PaymentReference = s.PaymentReference,
                Status           = s.Status,
                ExpiresAt        = s.ExpiresAt,
                ExpiresInSeconds = remaining
            };
        }

        private static QRPaymentStatusDto BuildStatusDto(MongoQRPayment s)
        {
            var now       = DateTime.UtcNow;
            var remaining = (int)Math.Max(0, (s.ExpiresAt - now).TotalSeconds);

            return new QRPaymentStatusDto
            {
                PaymentId        = s.Id,
                OrderId          = s.OrderId,
                Status           = s.Status,
                ExpiresAt        = s.ExpiresAt,
                ExpiresInSeconds = remaining,
                IsExpired        = s.ExpiresAt < now
            };
        }

        private async Task<IEnumerable<AdminQRPaymentDto>> EnrichForAdmin(
            IEnumerable<MongoQRPayment> sessions)
        {
            var result = new List<AdminQRPaymentDto>();
            var now    = DateTime.UtcNow;

            foreach (var s in sessions)
            {
                var order = await _orderRepo.GetByIdAsync(s.OrderId);
                var user  = s.UserId != null ? await _userRepo.GetByIdAsync(s.UserId) : null;

                result.Add(new AdminQRPaymentDto
                {
                    PaymentId        = s.Id,
                    OrderId          = s.OrderId,
                    OrderNumber      = order?.OrderNumber ?? "N/A",
                    UserId           = s.UserId,
                    CustomerName     = user?.FullName   ?? "Unknown",
                    CustomerEmail    = user?.Email      ?? "N/A",
                    Amount           = s.Amount,
                    Status           = s.Status,
                    PaymentReference = s.PaymentReference,
                    UserProvidedUtr  = s.UserProvidedUtr,
                    CreatedAt        = s.CreatedAt,
                    ExpiresAt        = s.ExpiresAt,
                    IsExpired        = s.ExpiresAt < now,
                    AdminNote        = s.AdminNote,
                    ConfirmedAt      = s.ConfirmedAt
                });
            }

            return result;
        }
    }
}