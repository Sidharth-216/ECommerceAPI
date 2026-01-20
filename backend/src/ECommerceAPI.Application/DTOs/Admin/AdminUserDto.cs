namespace ECommerceAPI.Application.DTOs.Admin
{
    public class AdminUserDto
    {
        public int Id { get; set; }
        public string FullName { get; set; }
        public string Email { get; set; }
        public string Mobile { get; set; }
        public string Role { get; set; }
        public bool IsActive { get; set; }
    }
}
