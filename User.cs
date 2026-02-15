using System;
using System.Collections.Generic;
using ECommerceAPI.Domain.Enums;

namespace ECommerceAPI.Domain.Entities
{
    public class User
    {
        public int Id { get; set; }
        public string Email { get; set; }
        public string PasswordHash { get; set; }
        public string FullName { get; set; }
        public string Mobile { get; set; }
        public UserRole Role { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LastLoginAt { get; set; }
        
        // Existing navigation properties
        public ICollection<Address> Addresses { get; set; } = new List<Address>();
        public Cart Cart { get; set; }
        public ICollection<Order> Orders { get; set; } = new List<Order>();

        // NEW navigation property for OTPs
        public ICollection<Otp> Otps { get; set; } = new List<Otp>();
    }
}
