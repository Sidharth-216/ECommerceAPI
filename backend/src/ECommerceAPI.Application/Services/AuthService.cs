using System;
using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Auth;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Application.Helpers;
using ECommerceAPI.Domain.Entities;
using ECommerceAPI.Domain.Enums;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Application.Services
{
    /// <summary>
    /// Authentication service implementation
    /// Handles user registration, login (email/password, mobile/OTP, and email/OTP)
    /// </summary>
    public class AuthService : IAuthService
    {
        private readonly IUserRepository _userRepository;
        private readonly IOtpService _otpService;
        private readonly IEmailOtpService _emailOtpService;
        private readonly JwtHelper _jwtHelper;

        public AuthService(
            IUserRepository userRepository, 
            IOtpService otpService,
            IEmailOtpService emailOtpService,
            JwtHelper jwtHelper)
        {
            _userRepository = userRepository;
            _otpService = otpService;
            _emailOtpService = emailOtpService;
            _jwtHelper = jwtHelper;
        }

        public async Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto)
        {
            // Check if email already exists
            if (await _userRepository.EmailExistsAsync(registerDto.Email))
            {
                throw new InvalidOperationException("Email already registered");
            }

            // Check if mobile already exists
            if (!string.IsNullOrEmpty(registerDto.Mobile) && 
                await _userRepository.MobileExistsAsync(registerDto.Mobile))
            {
                throw new InvalidOperationException("Mobile number already registered");
            }

            // Create new user
            var user = new User
            {
                Email = registerDto.Email,
                PasswordHash = PasswordHelper.HashPassword(registerDto.Password),
                FullName = registerDto.FullName,
                Mobile = registerDto.Mobile,
                Role = UserRole.Customer,
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _userRepository.AddAsync(user);

            // Generate JWT token
            var token = _jwtHelper.GenerateToken(user);

            return new AuthResponseDto
            {
                UserId = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                Role = user.Role.ToString(),
                Token = token,
                Mobile = user.Mobile
            };
        }

        public async Task<AuthResponseDto> LoginAsync(LoginDto loginDto)
        {
            // Find user by email
            var user = await _userRepository.GetByEmailAsync(loginDto.Email);
            
            if (user == null || !PasswordHelper.VerifyPassword(loginDto.Password, user.PasswordHash))
            {
                throw new UnauthorizedAccessException("Invalid email or password");
            }

            if (!user.IsActive)
            {
                throw new UnauthorizedAccessException("Account is inactive");
            }

            // Update last login
            user.LastLoginAt = DateTime.UtcNow;
            await _userRepository.UpdateAsync(user);

            // Generate JWT token
            var token = _jwtHelper.GenerateToken(user);

            return new AuthResponseDto
            {
                UserId = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                Role = user.Role.ToString(),
                Token = token,
                Mobile = user.Mobile
            };
        }

        // Mobile OTP: Request OTP
        public async Task<OtpResponseDto> RequestOtpAsync(RequestOtpDto requestDto)
        {
            // Validate mobile number
            if (string.IsNullOrWhiteSpace(requestDto.Mobile))
            {
                throw new ArgumentException("Mobile number is required");
            }

            // Check if user exists with this mobile
            var user = await _userRepository.GetByMobileAsync(requestDto.Mobile);
            if (user == null)
            {
                throw new InvalidOperationException("No account found with this mobile number");
            }

            if (!user.IsActive)
            {
                throw new UnauthorizedAccessException("Account is inactive");
            }

            // Generate and send OTP
            var success = await _otpService.GenerateAndSendOtpAsync(requestDto.Mobile);

            if (!success)
            {
                throw new InvalidOperationException("Failed to send OTP. Please try again.");
            }

            return new OtpResponseDto
            {
                Success = true,
                Message = "OTP sent successfully to your mobile number",
                ExpiresInSeconds = 300 // 5 minutes
            };
        }

        // Mobile OTP: Verify and login
        public async Task<AuthResponseDto> VerifyOtpAndLoginAsync(VerifyOtpDto verifyDto)
        {
            // Validate input
            if (string.IsNullOrWhiteSpace(verifyDto.Mobile))
            {
                throw new ArgumentException("Mobile number is required");
            }

            if (string.IsNullOrWhiteSpace(verifyDto.Otp))
            {
                throw new ArgumentException("OTP is required");
            }

            // Verify OTP
            var isValid = await _otpService.VerifyOtpAsync(verifyDto.Mobile, verifyDto.Otp);
            if (!isValid)
            {
                throw new UnauthorizedAccessException("Invalid or expired OTP");
            }

            // Get user by mobile
            var user = await _userRepository.GetByMobileAsync(verifyDto.Mobile);
            if (user == null)
            {
                throw new InvalidOperationException("User not found");
            }

            if (!user.IsActive)
            {
                throw new UnauthorizedAccessException("Account is inactive");
            }

            // Update last login
            user.LastLoginAt = DateTime.UtcNow;
            await _userRepository.UpdateAsync(user);

            // Generate JWT token
            var token = _jwtHelper.GenerateToken(user);

            return new AuthResponseDto
            {
                UserId = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                Role = user.Role.ToString(),
                Token = token,
                Mobile = user.Mobile
            };
        }

        // NEW: Email OTP - Request OTP
        public async Task<OtpResponseDto> RequestEmailOtpAsync(RequestEmailOtpDto requestDto)
        {
            if (string.IsNullOrWhiteSpace(requestDto.Email))
                throw new ArgumentException("Email address is required");

            var user = await _userRepository.GetByEmailAsync(requestDto.Email);
            if (user == null)
                throw new InvalidOperationException("No account found with this email address");

            if (!user.IsActive)
                throw new UnauthorizedAccessException("Account is inactive");

            var success = await _emailOtpService.GenerateAndSendOtpAsync(
                requestDto.Email
            );

            if (!success)
                throw new InvalidOperationException("Failed to send OTP. Please try again.");

            return new OtpResponseDto
            {
                Success = true,
                Message = "OTP sent successfully to your email address",
                ExpiresInSeconds = 300
            };
        }

        // Overload to satisfy IAuthService.RequestEmailOtpAsync(RequestEmailOtpDto, string)
        public async Task<OtpResponseDto> RequestEmailOtpAsync(RequestEmailOtpDto requestDto, string source)
        {
            // Ignore the extra string parameter for now and delegate to the existing implementation
            return await RequestEmailOtpAsync(requestDto);
        }


        // NEW: Email OTP - Verify and login
        public async Task<AuthResponseDto> VerifyEmailOtpAndLoginAsync(VerifyEmailOtpDto verifyDto)
        {
            // Validate input
            if (string.IsNullOrWhiteSpace(verifyDto.Email))
            {
                throw new ArgumentException("Email address is required");
            }

            if (string.IsNullOrWhiteSpace(verifyDto.Otp))
            {
                throw new ArgumentException("OTP is required");
            }

            // Verify OTP
            var isValid = await _emailOtpService.VerifyOtpAsync(verifyDto.Email, verifyDto.Otp);
            if (!isValid)
            {
                throw new UnauthorizedAccessException("Invalid or expired OTP");
            }

            // Get user by email
            var user = await _userRepository.GetByEmailAsync(verifyDto.Email);
            if (user == null)
            {
                throw new InvalidOperationException("User not found");
            }

            if (!user.IsActive)
            {
                throw new UnauthorizedAccessException("Account is inactive");
            }

            // Update last login
            user.LastLoginAt = DateTime.UtcNow;
            await _userRepository.UpdateAsync(user);

            // Generate JWT token
            var token = _jwtHelper.GenerateToken(user);

            return new AuthResponseDto
            {
                UserId = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                Role = user.Role.ToString(),
                Token = token,
                Mobile = user.Mobile
            };
        }

        public async Task<UserProfileDto> GetUserProfileAsync(int userId)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            
            if (user == null)
                throw new KeyNotFoundException("User not found");

            return new UserProfileDto
            {
                Id = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                Mobile = user.Mobile,
                Role = user.Role.ToString()
            };
        }

        public async Task<bool> UpdateUserProfileAsync(int userId, UpdateProfileDto updateDto)
        {
            var user = await _userRepository.GetByIdAsync(userId);
            
            if (user == null)
                throw new KeyNotFoundException("User not found");

            user.FullName = updateDto.FullName;
            user.Mobile = updateDto.Mobile;

            await _userRepository.UpdateAsync(user);
            return true;
        }
    }
}