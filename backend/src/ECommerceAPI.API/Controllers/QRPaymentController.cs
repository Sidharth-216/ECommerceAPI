using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.QRPayment;
using ECommerceAPI.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ECommerceAPI.API.Controllers
{
    /// <summary>
    /// QR Payment Controller
    ///
    /// Customer routes  (authenticated):
    ///   POST   /api/mongo/qr-payment/initiate            – start QR session
    ///   GET    /api/mongo/qr-payment/status/{orderId}    – poll session status
    ///   POST   /api/mongo/qr-payment/{paymentId}/mark-received – customer marks paid
    ///
    /// Admin routes     ([Authorize(Roles = "Admin")]):
    ///   GET    /api/mongo/qr-payment/admin/pending       – list awaiting confirmation
    ///   GET    /api/mongo/qr-payment/admin/all           – full history
    ///   POST   /api/mongo/qr-payment/admin/{paymentId}/confirm – confirm payment
    ///   POST   /api/mongo/qr-payment/admin/{paymentId}/reject  – reject payment
    /// </summary>
    [ApiController]
    [Route("api/mongo/qr-payment")]
    [Authorize]
    public class QRPaymentController : ControllerBase
    {
        private readonly IQRPaymentService _qrPaymentService;

        public QRPaymentController(IQRPaymentService qrPaymentService)
        {
            _qrPaymentService = qrPaymentService;
        }

        // ── Customer ─────────────────────────────────────────────────────────

        /// <summary>
        /// Initiate a QR payment session for an order.
        /// Creates (or reuses) a session and returns QR payload + amount.
        /// POST /api/mongo/qr-payment/initiate
        /// </summary>
        [HttpPost("initiate")]
        public async Task<ActionResult<QRPaymentResponseDto>> Initiate(
            [FromBody] InitiateQRPaymentDto dto)
        {
            try
            {
                Console.WriteLine($"💳 [QRPaymentController] POST /initiate | order={dto?.OrderId}");

                if (string.IsNullOrWhiteSpace(dto?.OrderId))
                    return BadRequest(new { message = "OrderId is required." });

                var userId = GetMongoUserId();
                var result = await _qrPaymentService.InitiateAsync(userId, dto.OrderId);

                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Forbid();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ QR Initiate error: {ex.Message}");
                return StatusCode(500, new { message = "Failed to initiate QR payment.", error = ex.Message });
            }
        }

        /// <summary>
        /// Poll the current status of a QR payment session for an order.
        /// GET /api/mongo/qr-payment/status/{orderId}
        /// </summary>
        [HttpGet("status/{orderId}")]
        public async Task<ActionResult<QRPaymentStatusDto>> GetStatus(string orderId)
        {
            try
            {
                var userId = GetMongoUserId();
                var result = await _qrPaymentService.GetStatusAsync(userId, orderId);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Customer marks that they have completed the UPI transfer.
        /// Optionally provides their UTR reference number.
        /// POST /api/mongo/qr-payment/{paymentId}/mark-received
        /// </summary>
        [HttpPost("{paymentId}/mark-received")]
        public async Task<ActionResult<QRPaymentStatusDto>> MarkReceived(
            string paymentId,
            [FromBody] MarkPaymentReceivedDto dto)
        {
            try
            {
                var userId = GetMongoUserId();
                var result = await _qrPaymentService.MarkReceivedAsync(userId, paymentId, dto?.Utr);
                return Ok(result);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException)
            {
                return Forbid();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ── Admin ─────────────────────────────────────────────────────────────

        /// <summary>
        /// Get all QR payment sessions awaiting admin confirmation.
        /// GET /api/mongo/qr-payment/admin/pending
        /// </summary>
        [HttpGet("admin/pending")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<AdminQRPaymentDto>>> GetPending()
        {
            try
            {
                Console.WriteLine("🔔 [QRPaymentController] GET /admin/pending");
                var result = await _qrPaymentService.GetPendingAsync();
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Get full QR payment history (admin).
        /// GET /api/mongo/qr-payment/admin/all
        /// </summary>
        [HttpGet("admin/all")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<AdminQRPaymentDto>>> GetAll()
        {
            try
            {
                var result = await _qrPaymentService.GetAllAsync();
                return Ok(result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Admin confirms a QR payment → order moves to Pending.
        /// POST /api/mongo/qr-payment/admin/{paymentId}/confirm
        /// </summary>
        [HttpPost("admin/{paymentId}/confirm")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Confirm(
            string paymentId,
            [FromBody] AdminConfirmPaymentDto dto)
        {
            try
            {
                Console.WriteLine($"✅ [QRPaymentController] Admin CONFIRM payment={paymentId}");

                if (!dto.Confirm)
                    return BadRequest(new { message = "Use the /reject endpoint to reject a payment." });

                var adminId = GetMongoUserId();
                var success = await _qrPaymentService.ConfirmPaymentAsync(adminId, paymentId, dto.Note);

                if (!success)
                    return NotFound(new { message = $"Payment session {paymentId} not found." });

                return Ok(new { message = "Payment confirmed. Order moved to Pending.", paymentId });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Confirm error: {ex.Message}");
                return StatusCode(500, new { message = ex.Message });
            }
        }

        /// <summary>
        /// Admin rejects a QR payment session — order stays PaymentPending.
        /// POST /api/mongo/qr-payment/admin/{paymentId}/reject
        /// </summary>
        [HttpPost("admin/{paymentId}/reject")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> Reject(
            string paymentId,
            [FromBody] AdminConfirmPaymentDto dto)
        {
            try
            {
                Console.WriteLine($"❌ [QRPaymentController] Admin REJECT payment={paymentId}");

                var adminId = GetMongoUserId();
                var success = await _qrPaymentService.RejectPaymentAsync(adminId, paymentId, dto.Note);

                if (!success)
                    return NotFound(new { message = $"Payment session {paymentId} not found." });

                return Ok(new { message = "Payment rejected. Order remains in PaymentPending.", paymentId });
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = ex.Message });
            }
        }

        // ── Helper ────────────────────────────────────────────────────────────

        private string GetMongoUserId()
        {
            foreach (var type in new[]
            {
                ClaimTypes.NameIdentifier, "sub", "userId", "nameid"
            })
            {
                var claim = User.FindFirst(type);
                if (claim != null && !string.IsNullOrWhiteSpace(claim.Value))
                    return claim.Value;
            }

            throw new UnauthorizedAccessException("User ID not found in token.");
        }
    }
}