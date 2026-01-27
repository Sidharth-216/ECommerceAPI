using System;
using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Auth;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Application.Helpers;
using ECommerceAPI.Domain.Entities.MongoDB;
using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Application.Services
{
    /// <summary>
    /// MongoDB Authentication Service
    /// Handles user registration and login using MongoDB storage
    /// </summary>
    public class MongoAuthService : IAuthService
    {
        private readonly IMongoUserRepository _mongoUserRepository;
        private readonly IMongoOtpService _mongoOtpService;
        private readonly IMongoEmailOtpService _mongoEmailOtpService;
        private readonly JwtHelper _jwtHelper;

        public MongoAuthService(
            IMongoUserRepository mongoUserRepository,
            IMongoOtpService mongoOtpService,
            IMongoEmailOtpService mongoEmailOtpService,
            JwtHelper jwtHelper)
        {
            _mongoUserRepository = mongoUserRepository;
            _mongoOtpService = mongoOtpService;
            _mongoEmailOtpService = mongoEmailOtpService;
            _jwtHelper = jwtHelper;
        }

        #region Registration & Login

        public async Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto)
        {
            // Check duplicates
            if (await _mongoUserRepository.EmailExistsAsync(registerDto.Email))
                throw new InvalidOperationException("Email already registered");

            if (!string.IsNullOrEmpty(registerDto.Mobile) &&
                await _mongoUserRepository.MobileExistsAsync(registerDto.Mobile))
                throw new InvalidOperationException("Mobile number already registered");

            // Create MongoDB user
            var user = new MongoUser
            {
                Email = registerDto.Email,
                PasswordHash = PasswordHelper.HashPassword(registerDto.Password),
                FullName = registerDto.FullName,
                Mobile = registerDto.Mobile,
                Role = "Customer",
                IsActive = true,
                CreatedAt = DateTime.UtcNow
            };

            await _mongoUserRepository.AddAsync(user);

            // Generate JWT token
            var token = GenerateMongoToken(user);

            return BuildAuthResponse(user, token);
        }

        public async Task<AuthResponseDto> LoginAsync(LoginDto loginDto)
        {
            var user = await _mongoUserRepository.GetByEmailAsync(loginDto.Email);

            if (user == null || !PasswordHelper.VerifyPassword(loginDto.Password, user.PasswordHash))
                throw new UnauthorizedAccessException("Invalid email or password");

            if (!user.IsActive)
                throw new UnauthorizedAccessException("Account is inactive");

            user.LastLoginAt = DateTime.UtcNow;
            await _mongoUserRepository.UpdateAsync(user);

            var token = GenerateMongoToken(user);
            return BuildAuthResponse(user, token);
        }

        #endregion

        #region Mobile OTP

        public async Task<OtpResponseDto> RequestOtpAsync(RequestOtpDto requestDto)
        {
            if (string.IsNullOrWhiteSpace(requestDto.Mobile))
                throw new ArgumentException("Mobile number is required");

            var user = await _mongoUserRepository.GetByMobileAsync(requestDto.Mobile);
            if (user == null)
                throw new InvalidOperationException("No account found with this mobile number");

            if (!user.IsActive)
                throw new UnauthorizedAccessException("Account is inactive");

            var success = await _mongoOtpService.GenerateAndSendOtpAsync(requestDto.Mobile);
            if (!success)
                throw new InvalidOperationException("Failed to send OTP. Please try again.");

            return new OtpResponseDto
            {
                Success = true,
                Message = "OTP sent successfully to your mobile number",
                ExpiresInSeconds = 300
            };
        }

        public async Task<AuthResponseDto> VerifyOtpAndLoginAsync(VerifyOtpDto verifyDto)
        {
            if (string.IsNullOrWhiteSpace(verifyDto.Mobile))
                throw new ArgumentException("Mobile number is required");
            if (string.IsNullOrWhiteSpace(verifyDto.Otp))
                throw new ArgumentException("OTP is required");

            var isValid = await _mongoOtpService.VerifyOtpAsync(verifyDto.Mobile, verifyDto.Otp);
            if (!isValid)
                throw new UnauthorizedAccessException("Invalid or expired OTP");

            var user = await _mongoUserRepository.GetByMobileAsync(verifyDto.Mobile);
            if (user == null)
                throw new InvalidOperationException("User not found");
            if (!user.IsActive)
                throw new UnauthorizedAccessException("Account is inactive");

            user.LastLoginAt = DateTime.UtcNow;
            await _mongoUserRepository.UpdateAsync(user);

            var token = GenerateMongoToken(user);
            return BuildAuthResponse(user, token);
        }

        #endregion

        #region Email OTP

        public async Task<OtpResponseDto> RequestEmailOtpAsync(RequestEmailOtpDto requestDto)
        {
            return await RequestEmailOtpAsync(requestDto, null);
        }

        public async Task<OtpResponseDto> RequestEmailOtpAsync(RequestEmailOtpDto requestDto, string source)
        {
            if (string.IsNullOrWhiteSpace(requestDto.Email))
                throw new ArgumentException("Email address is required");

            var user = await _mongoUserRepository.GetByEmailAsync(requestDto.Email);
            if (user == null)
                throw new InvalidOperationException("No account found with this email address");

            if (!user.IsActive)
                throw new UnauthorizedAccessException("Account is inactive");

            var success = await _mongoEmailOtpService.GenerateAndSendOtpAsync(requestDto.Email);
            if (!success)
                throw new InvalidOperationException("Failed to send OTP. Please try again.");

            return new OtpResponseDto
            {
                Success = true,
                Message = "OTP sent successfully to your email address",
                ExpiresInSeconds = 300
            };
        }

        public async Task<AuthResponseDto> VerifyEmailOtpAndLoginAsync(VerifyEmailOtpDto verifyDto)
        {
            if (string.IsNullOrWhiteSpace(verifyDto.Email))
                throw new ArgumentException("Email address is required");
            if (string.IsNullOrWhiteSpace(verifyDto.Otp))
                throw new ArgumentException("OTP is required");

            var isValid = await _mongoEmailOtpService.VerifyOtpAsync(verifyDto.Email, verifyDto.Otp);
            if (!isValid)
                throw new UnauthorizedAccessException("Invalid or expired OTP");

            var user = await _mongoUserRepository.GetByEmailAsync(verifyDto.Email);
            if (user == null)
                throw new InvalidOperationException("User not found");
            if (!user.IsActive)
                throw new UnauthorizedAccessException("Account is inactive");

            user.LastLoginAt = DateTime.UtcNow;
            await _mongoUserRepository.UpdateAsync(user);

            var token = GenerateMongoToken(user);
            return BuildAuthResponse(user, token);
        }

        #endregion

        #region User Profile (MongoDB)

        public async Task<UserProfileDto> GetUserProfileAsync(int userId)
            => throw new NotImplementedException("Use GetUserProfileAsync(string userId) for MongoDB");

        public async Task<bool> UpdateUserProfileAsync(int userId, UpdateProfileDto updateDto)
            => throw new NotImplementedException("Use UpdateUserProfileAsync(string userId, UpdateProfileDto) for MongoDB");

        public async Task<UserProfileDto> GetUserProfileAsync(string userId)
        {
            var user = await _mongoUserRepository.GetByIdAsync(userId);
            if (user == null) throw new KeyNotFoundException("User not found");

            return new UserProfileDto
            {
                Id = 0,
                Email = user.Email,
                FullName = user.FullName,
                Mobile = user.Mobile,
                Role = user.Role
            };
        }

        public async Task<bool> UpdateUserProfileAsync(string userId, UpdateProfileDto updateDto)
        {
            var user = await _mongoUserRepository.GetByIdAsync(userId);
            if (user == null) throw new KeyNotFoundException("User not found");

            user.FullName = updateDto.FullName;
            user.Mobile = updateDto.Mobile;

            await _mongoUserRepository.UpdateAsync(user);
            return true;
        }

        #endregion

        #region Helpers

        /// <summary>
        /// Generate JWT token for MongoDB user
        /// </summary>
        private string GenerateMongoToken(MongoUser user)
        {
            if (string.IsNullOrEmpty(user.Id)) throw new InvalidOperationException("User ID cannot be null");
            if (string.IsNullOrEmpty(user.Email)) throw new InvalidOperationException("User email cannot be null");
            if (string.IsNullOrEmpty(user.FullName)) throw new InvalidOperationException("User full name cannot be null");
            if (string.IsNullOrEmpty(user.Role)) throw new InvalidOperationException("User role cannot be null");

            return _jwtHelper.GenerateTokenForMongo(
                user.Id,
                user.Email,
                user.FullName,
                user.Role
            );
        }

        /// <summary>
        /// Build AuthResponseDto from MongoUser and token
        /// </summary>
        private AuthResponseDto BuildAuthResponse(MongoUser user, string token)
        {
            return new AuthResponseDto
            {
                MongoUserId = user.Id,
                Email = user.Email,
                FullName = user.FullName,
                Role = user.Role,
                Token = token,
                Mobile = user.Mobile
            };
        }

        #endregion
    }
}
