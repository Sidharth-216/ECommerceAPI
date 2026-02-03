using System;

namespace ECommerceAPI.Application.DTOs.User
{
	/// <summary>
	/// Data Transfer Object for User
	/// </summary>
	public class UserDto
	{
		public string Id { get; set; }
		public string FullName { get; set; }
		public string Email { get; set; }
		public string Mobile { get; set; }
		public string Gender { get; set; }
		public string Role { get; set; }
		public DateTime CreatedAt { get; set; }
		public DateTime UpdatedAt { get; set; }
	}
}
