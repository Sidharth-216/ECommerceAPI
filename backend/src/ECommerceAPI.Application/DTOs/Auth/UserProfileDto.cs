namespace ECommerceAPI.Application.DTOs.Auth
{
    public class UserProfileDto
    {
        public int Id { get; set; }
        public string Email { get; set; }
        public string FullName { get; set; }
        public string Mobile { get; set; }  // Make sure this exists
        public string Role { get; set; }
    }
}
