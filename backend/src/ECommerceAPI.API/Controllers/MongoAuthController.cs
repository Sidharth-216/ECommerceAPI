using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Auth;
using ECommerceAPI.Application.Services;

namespace ECommerceAPI.API.Controllers
{
    /// <summary>
    /// MongoDB Authentication Controller
    /// Handles user registration and login using MongoDB storage
    /// Parallel to the existing SQL-based AuthController
    /// </summary>
    [ApiController]
    [Route("api/mongo/auth")]
    public class MongoAuthController : ControllerBase
    {
        private readonly MongoAuthService _mongoAuthService;

        public MongoAuthController(MongoAuthService mongoAuthService)
        {
            _mongoAuthService = mongoAuthService;
        }

        /// <summary>
        /// Register new user in MongoDB
        /// POST /api/mongo/auth/register
        /// </summary>
        [HttpPost("register")]
        public async Task<ActionResult<AuthResponseDto>> Register([FromBody] RegisterDto registerDto)
        {
            // ✅ Validate incoming data before calling the service
            if (!ModelState.IsValid)
            {
                // Returns 400 Bad Request with validation errors
                return BadRequest(ModelState);
            }

            try
            {
                var response = await _mongoAuthService.RegisterAsync(registerDto);
                return Ok(response);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// User login with email and password (MongoDB)
        /// POST /api/mongo/auth/login
        /// </summary>
        [HttpPost("login")]
        public async Task<ActionResult<AuthResponseDto>> Login(
            [FromBody] LoginDto loginDto)
        {
            try
            {
                var response = await _mongoAuthService.LoginAsync(loginDto);
                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Request OTP for mobile login (MongoDB)
        /// POST /api/mongo/auth/request-otp
        /// </summary>
        [HttpPost("request-otp")]
        public async Task<ActionResult<OtpResponseDto>> RequestOtp(
            [FromBody] RequestOtpDto requestDto)
        {
            try
            {
                var response = await _mongoAuthService.RequestOtpAsync(requestDto);
                return Ok(response);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Verify mobile OTP and login (MongoDB)
        /// POST /api/mongo/auth/verify-otp
        /// </summary>
        [HttpPost("verify-otp")]
        public async Task<ActionResult<AuthResponseDto>> VerifyOtp(
            [FromBody] VerifyOtpDto verifyDto)
        {
            try
            {
                var response = await _mongoAuthService.VerifyOtpAndLoginAsync(verifyDto);
                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Request OTP for email login (MongoDB)
        /// POST /api/mongo/auth/request-email-otp
        /// </summary>
        [HttpPost("request-email-otp")]
        public async Task<ActionResult<OtpResponseDto>> RequestEmailOtp(
            [FromBody] RequestEmailOtpDto requestDto)
        {
            try
            {
                var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
                var response = await _mongoAuthService.RequestEmailOtpAsync(requestDto, ipAddress);
                return Ok(response);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Verify email OTP and login (MongoDB)
        /// POST /api/mongo/auth/verify-email-otp
        /// </summary>
        [HttpPost("verify-email-otp")]
        public async Task<ActionResult<AuthResponseDto>> VerifyEmailOtp(
            [FromBody] VerifyEmailOtpDto verifyDto)
        {
            try
            {
                var response = await _mongoAuthService.VerifyEmailOtpAndLoginAsync(verifyDto);
                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }
    }
}