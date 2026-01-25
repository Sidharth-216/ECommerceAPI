using System;
using System.Threading.Tasks;
using ECommerceAPI.Domain.Entities.Mongo;
using ECommerceAPI.Application.DTOs.Auth;
using ECommerceAPI.Infrastructure.Repositories.Interfaces.Mongo;
using ECommerceAPI.Application.Helpers;

namespace ECommerceAPI.Application.Services.Mongo
{
    public class MongoAuthService
    {
        private readonly IMongoUserRepository _userRepository;
        private readonly JwtHelper _jwtHelper;

        public MongoAuthService(IMongoUserRepository userRepository, JwtHelper jwtHelper)
        {
            _userRepository = userRepository;
            _jwtHelper = jwtHelper;
        }

        public async Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto)
        {
            if (await _userRepository.EmailExistsAsync(registerDto.Email))
                throw new InvalidOperationException("Email already registered");

            if (!string.IsNullOrEmpty(registerDto.Mobile) && 
                await _userRepository.MobileExistsAsync(registerDto.Mobile))
                throw new InvalidOperationException("Mobile number already registered");

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

            await _userRepository.AddAsync(user);

            var token = _jwtHelper.GenerateToken(new ECommerceAPI.Domain.Entities.User
            {
                Id = 0, // placeholder
                Email = user.Email,
                FullName = user.FullName,
                Mobile = user.Mobile,
                Role = ECommerceAPI.Domain.Enums.UserRole.Customer
            });

            return new AuthResponseDto
            {
                UserId = 0, // placeholder
                Email = user.Email,
                FullName = user.FullName,
                Mobile = user.Mobile,
                Role = user.Role,
                Token = token
            };
        }

        public async Task<AuthResponseDto> LoginAsync(LoginDto loginDto)
        {
            var user = await _userRepository.GetByEmailAsync(loginDto.Email);

            if (user == null || !PasswordHelper.VerifyPassword(loginDto.Password, user.PasswordHash))
                throw new UnauthorizedAccessException("Invalid email or password");

            if (!user.IsActive)
                throw new UnauthorizedAccessException("Account is inactive");

            user.LastLoginAt = DateTime.UtcNow;
            await _userRepository.UpdateAsync(user);

            var token = _jwtHelper.GenerateToken(new ECommerceAPI.Domain.Entities.User
            {
                Id = 0, // placeholder
                Email = user.Email,
                FullName = user.FullName,
                Mobile = user.Mobile,
                Role = ECommerceAPI.Domain.Enums.UserRole.Customer
            });

            return new AuthResponseDto
            {
                UserId = 0,
                Email = user.Email,
                FullName = user.FullName,
                Mobile = user.Mobile,
                Role = user.Role,
                Token = token
            };
        }
    }
}
