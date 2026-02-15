using System;
using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Auth;

namespace ECommerceAPI.Application.Interfaces
{
    /// <summary>
    /// Authentication Service Interface
    /// Defines contract for user authentication operations
    /// </summary>
    public interface IAuthService
    {
        #region Registration & Login
        
        Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto);
        Task<AuthResponseDto> LoginAsync(LoginDto loginDto);

        #endregion

        #region Mobile OTP

        Task<OtpResponseDto> RequestOtpAsync(RequestOtpDto requestDto);
        Task<AuthResponseDto> VerifyOtpAndLoginAsync(VerifyOtpDto verifyDto);

        #endregion

        #region Email OTP

        Task<OtpResponseDto> RequestEmailOtpAsync(RequestEmailOtpDto requestDto);
        Task<OtpResponseDto> RequestEmailOtpAsync(RequestEmailOtpDto requestDto, string source);
        Task<AuthResponseDto> VerifyEmailOtpAndLoginAsync(VerifyEmailOtpDto verifyDto);

        #endregion

        #region User Profile

        Task<UserProfileDto> GetUserProfileAsync(int userId);
        Task<bool> UpdateUserProfileAsync(int userId, UpdateProfileDto updateDto);
        Task<UserProfileDto> GetUserProfileAsync(string userId);
        Task<bool> UpdateUserProfileAsync(string userId, UpdateProfileDto updateDto);

        #endregion
    }
}