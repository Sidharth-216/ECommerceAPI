using System.ComponentModel.DataAnnotations;
namespace ECommerceAPI.Application.DTOs.Auth
{
    public class RegisterDto
    {
        [Required, EmailAddress]
        public string Email { get; set; }

        [Required, MinLength(6)]
        public string Password { get; set; }

        [Required]
        public string FullName { get; set; }

        [Required]
        public string Mobile { get; set; }
    }

}
