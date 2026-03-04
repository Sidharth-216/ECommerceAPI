using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Application.DTOs.Auth;  

namespace ECommerceAPI.API.Controllers
{
    [ApiController]
    [Route("api/auth/email")]
    public class EmailOtpController : ControllerBase
    {
        private readonly IMongoEmailOtpService _otpService;

        public EmailOtpController(IMongoEmailOtpService otpService)
        {
            _otpService = otpService;
        }

        /// <summary>
        /// Request an OTP to be sent to the given email
        /// </summary>
        [HttpPost("request-otp")]
        public async Task<IActionResult> RequestOtp([FromBody] RequestEmailOtpDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto?.Email))
                return BadRequest(new { success = false, message = "Email is required." });

            var sent = await _otpService.GenerateAndSendOtpAsync(dto.Email);

            if (!sent)
                return StatusCode(500, new { success = false, message = "Failed to send OTP. Please try again." });

            return Ok(new { success = true, message = "OTP sent to your email.", expiresInSeconds = 300 });
        }

        /// <summary>
        /// Verify the OTP entered by the user
        /// </summary>
        [HttpPost("verify-otp")]
        public async Task<IActionResult> VerifyOtp([FromBody] VerifyEmailOtpDto dto)
        {
            if (string.IsNullOrWhiteSpace(dto?.Email) || string.IsNullOrWhiteSpace(dto?.Otp))
                return BadRequest(new { success = false, message = "Email and OTP are required." });

            var verified = await _otpService.VerifyOtpAsync(dto.Email, dto.Otp);

            if (!verified)
                return BadRequest(new { success = false, message = "Invalid or expired OTP." });

            return Ok(new { success = true, message = "OTP verified successfully." });
        }
        
    }
}