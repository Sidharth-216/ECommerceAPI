namespace ECommerceAPI.Application.DTOs.Auth
{
    public class AuthResponseDto
    {
        public int UserId { get; set; }
        public string Email { get; set; }
        public string FullName { get; set; }
        public string Mobile { get; set; }  // ADD THIS
        public string Role { get; set; }
        public string Token { get; set; }
    }
}

