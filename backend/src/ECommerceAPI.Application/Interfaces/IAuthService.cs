using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Auth;

namespace ECommerceAPI.Application.Interfaces
{
    public interface IAuthService
    {
        Task<AuthResponseDto> RegisterAsync(RegisterDto registerDto);
        Task<AuthResponseDto> LoginAsync(LoginDto loginDto);
        Task<UserProfileDto> GetUserProfileAsync(int userId);
        Task<bool> UpdateUserProfileAsync(int userId, UpdateProfileDto updateDto);
         Task<OtpResponseDto> RequestOtpAsync(RequestOtpDto requestDto);
        Task<AuthResponseDto> VerifyOtpAndLoginAsync(VerifyOtpDto verifyDto);
        
        // Email OTP authentication (NEW)
        Task<OtpResponseDto> RequestEmailOtpAsync(RequestEmailOtpDto requestDto);
        Task<AuthResponseDto> VerifyEmailOtpAndLoginAsync(VerifyEmailOtpDto verifyDto);
        Task<OtpResponseDto> RequestEmailOtpAsync( RequestEmailOtpDto requestDto, string ipAddress );

    
    }
}


