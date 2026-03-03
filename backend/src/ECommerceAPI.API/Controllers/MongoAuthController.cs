using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Auth;
using ECommerceAPI.Application.Services;

namespace ECommerceAPI.API.Controllers
{
    [ApiController]
    [Route("api/mongo/auth")]
    public class MongoAuthController : ControllerBase
    {
        private readonly MongoAuthService _mongoAuthService;

        public MongoAuthController(MongoAuthService mongoAuthService)
        {
            _mongoAuthService = mongoAuthService;
        }

        [HttpGet("validate")]
        [Authorize]
        public IActionResult ValidateToken()
        {
            // Return the boot ID so the frontend can detect server restarts.
            // Program.ServerBootId is a static Guid set once at process startup —
            // it changes every time the server restarts.
            Response.Headers["X-Server-Boot-Id"] = Program.ServerBootId;
            return Ok(new { valid = true, bootId = Program.ServerBootId });
        }

        [HttpPost("register")]
        public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterDto registerDto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            var response = await _mongoAuthService.RegisterAsync(registerDto);
            return Ok(response);
        }

        [HttpPost("login")]
        public async Task<ActionResult<AuthResponseDto>> Login([FromBody] LoginDto loginDto)
        {
            var response = await _mongoAuthService.LoginAsync(loginDto);
            return Ok(response);
        }

        [HttpPost("request-otp")]
        public async Task<ActionResult<OtpResponseDto>> RequestOtp([FromBody] RequestOtpDto requestDto)
        {
            var response = await _mongoAuthService.RequestOtpAsync(requestDto);
            return Ok(response);
        }

        [HttpPost("verify-otp")]
        public async Task<ActionResult<AuthResponseDto>> VerifyOtp([FromBody] VerifyOtpDto verifyDto)
        {
            var response = await _mongoAuthService.VerifyOtpAndLoginAsync(verifyDto);
            return Ok(response);
        }

        [HttpPost("request-email-otp")]
        public async Task<ActionResult<OtpResponseDto>> RequestEmailOtp([FromBody] RequestEmailOtpDto requestDto)
        {
            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var response  = await _mongoAuthService.RequestEmailOtpAsync(requestDto, ipAddress);
            return Ok(response);
        }

        [HttpPost("verify-email-otp")]
        public async Task<ActionResult<AuthResponseDto>> VerifyEmailOtp([FromBody] VerifyEmailOtpDto verifyDto)
        {
            var response = await _mongoAuthService.VerifyEmailOtpAndLoginAsync(verifyDto);
            return Ok(response);
        }
    }
}