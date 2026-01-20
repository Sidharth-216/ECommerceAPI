/*using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Threading.Tasks;
using System.Security.Claims;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Application.DTOs.Payment;

namespace ECommerceAPI.API.Controllers
{
    /// <summary>
    /// Payment Controller - Handles payment processing
    /// AI Agent has LIMITED access (can initiate but not handle sensitive data)
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PaymentController : ControllerBase
    {
        private readonly IPaymentService _paymentService;

        public PaymentController(IPaymentService paymentService)
        {
            _paymentService = paymentService;
        }

        /// <summary>
        /// Initiate payment - Returns UPI gateway URL
        /// Agent can call this but cannot handle UPI PIN
        /// </summary>
        [HttpPost("initiate")]
        public async Task<ActionResult<PaymentInitiationDto>> InitiatePayment(
            [FromBody] PaymentRequestDto paymentRequest)
        {
            var userId = GetUserId();
            var result = await _paymentService.InitiatePaymentAsync(
                userId, paymentRequest.OrderId);
            
            return Ok(result);
        }

        /// <summary>
        /// Verify payment callback from UPI gateway
        /// NOT accessible by AI agent
        /// </summary>
        [HttpPost("verify")]
        [AllowAnonymous]
        public async Task<ActionResult> VerifyPayment(
            [FromBody] PaymentVerificationDto verification)
        {
            var result = await _paymentService.VerifyPaymentAsync(verification);
            
            if (result)
                return Ok(new { message = "Payment verified successfully" });
            
            return BadRequest(new { message = "Payment verification failed" });
        }

        private int GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            return int.Parse(userIdClaim.Value);
        }
    }
}
*/

using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Threading.Tasks;
using System.Security.Claims;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Application.DTOs.Payment;

namespace ECommerceAPI.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class PaymentController : ControllerBase
    {
        private readonly IPaymentService _paymentService;

        public PaymentController(IPaymentService paymentService)
        {
            _paymentService = paymentService;
        }

        /// <summary>
        /// Initiate payment - Creates Razorpay order or handles COD
        /// </summary>
        [HttpPost("initiate")]
        public async Task<ActionResult<PaymentInitiationDto>> InitiatePayment(
            [FromBody] PaymentRequestDto paymentRequest)
        {
            try
            {
                var userId = GetUserId();

                // Handle COD separately
                if (paymentRequest.PaymentMethod == "COD")
                {
                    var codSuccess = await _paymentService.HandleCODPaymentAsync(
                        paymentRequest.OrderId, userId);

                    if (codSuccess)
                    {
                        return Ok(new { 
                            success = true, 
                            message = "Order confirmed with Cash on Delivery",
                            paymentMethod = "COD",
                            orderId = paymentRequest.OrderId
                        });
                    }
                    return BadRequest(new { message = "Failed to process COD order" });
                }

                // Handle online payment (Razorpay)
                var result = await _paymentService.InitiatePaymentAsync(
                    userId, paymentRequest.OrderId);

                return Ok(result);
            }
            catch (UnauthorizedAccessException)
            {
                return Unauthorized(new { message = "Unauthorized access to order" });
            }
            catch (KeyNotFoundException)
            {
                return NotFound(new { message = "Order not found" });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Payment initiation failed", error = ex.Message });
            }
        }

        /// <summary>
        /// Verify payment from Razorpay
        /// </summary>
        [HttpPost("verify")]
        public async Task<ActionResult<PaymentCallbackDto>> VerifyPayment(
            [FromBody] PaymentVerificationDto verification)
        {
            try
            {
                var result = await _paymentService.VerifyPaymentAsync(verification);

                if (result)
                {
                    return Ok(new PaymentCallbackDto
                    {
                        Success = true,
                        Message = "Payment verified successfully",
                        OrderId = verification.OrderId
                    });
                }

                return BadRequest(new PaymentCallbackDto
                {
                    Success = false,
                    Message = "Payment verification failed",
                    OrderId = verification.OrderId
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new PaymentCallbackDto
                {
                    Success = false,
                    Message = $"Verification error: {ex.Message}",
                    OrderId = verification.OrderId
                });
            }
        }

        /// <summary>
        /// Get payment status for an order
        /// </summary>
        [HttpGet("status/{orderId}")]
        public async Task<ActionResult> GetPaymentStatus(int orderId)
        {
            // Implement this based on your requirements
            return Ok(new { message = "Payment status endpoint" });
        }

        private int GetUserId()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            return int.Parse(userIdClaim.Value);
        }
    }
}