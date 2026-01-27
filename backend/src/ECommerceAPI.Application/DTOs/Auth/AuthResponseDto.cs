namespace ECommerceAPI.Application.DTOs.Auth
{
    public class AuthResponseDto
    {
       public int UserId { get; set; } = 0;
        public string MongoUserId { get; set; }
        public string Email { get; set; }
        public string FullName { get; set; }
        public string Mobile { get; set; } 
        public string Role { get; set; }
        public string Token { get; set; }
    }
}

