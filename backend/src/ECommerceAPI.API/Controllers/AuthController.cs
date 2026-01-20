using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Application.DTOs.Auth;

namespace ECommerceAPI.API.Controllers
{
    /// <summary>
    /// Authentication Controller
    /// Handles user registration, login (email/password, mobile/OTP, and email/OTP)
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        /// <summary>
        /// Register new user
        /// POST /api/auth/register
        /// </summary>
        [HttpPost("register")]
        public async Task<ActionResult<AuthResponseDto>> Register(
            [FromBody] RegisterDto registerDto)
        {
            try
            {
                var response = await _authService.RegisterAsync(registerDto);
                return Ok(response);
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// User login with email and password
        /// POST /api/auth/login
        /// </summary>
        [HttpPost("login")]
        public async Task<ActionResult<AuthResponseDto>> Login(
            [FromBody] LoginDto loginDto)
        {
            try
            {
                var response = await _authService.LoginAsync(loginDto);
                return Ok(response);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Request OTP for mobile login
        /// POST /api/auth/request-otp
        /// </summary>
        [HttpPost("request-otp")]
        public async Task<ActionResult<OtpResponseDto>> RequestOtp(
            [FromBody] RequestOtpDto requestDto)
        {
            try
            {
                var response = await _authService.RequestOtpAsync(requestDto);
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
        /// Verify mobile OTP and login
        /// POST /api/auth/verify-otp
        /// </summary>
        [HttpPost("verify-otp")]
        public async Task<ActionResult<AuthResponseDto>> VerifyOtp(
            [FromBody] VerifyOtpDto verifyDto)
        {
            try
            {
                var response = await _authService.VerifyOtpAndLoginAsync(verifyDto);
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
        /// Request OTP for email login (NEW)
        /// POST /api/auth/request-email-otp
        /// </summary>
        [HttpPost("request-email-otp")]
        public async Task<ActionResult<OtpResponseDto>> RequestEmailOtp(
            [FromBody] RequestEmailOtpDto requestDto)
        {
            try
            {
                var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();

                var response = await _authService.RequestEmailOtpAsync(
                    requestDto,
                    ipAddress
                );

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
        /// Verify email OTP and login (NEW)
        /// POST /api/auth/verify-email-otp
        /// </summary>
        [HttpPost("verify-email-otp")]
        public async Task<ActionResult<AuthResponseDto>> VerifyEmailOtp(
            [FromBody] VerifyEmailOtpDto verifyDto)
        {
            try
            {
                var response = await _authService.VerifyEmailOtpAndLoginAsync(verifyDto);
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