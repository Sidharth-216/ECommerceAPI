using System;
using System.ComponentModel.DataAnnotations;

namespace ECommerceAPI.Application.DTOs.User
{
    public class AddressDto
    {
        [Required]
        [MaxLength(200)]
        public string AddressLine1 { get; set; }

        [MaxLength(200)]
        public string AddressLine2 { get; set; }

        [Required]
        [MaxLength(100)]
        public string City { get; set; }

        [MaxLength(100)]
        public string State { get; set; }

        [MaxLength(20)]
        public string PostalCode { get; set; }

        [Required]
        [MaxLength(100)]
        public string Country { get; set; }

        public bool IsDefault { get; set; } = false;
    }
}
