using System;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ECommerceAPI.Domain.Entities.Mongo;
using ECommerceAPI.Application.DTOs.User;
using ECommerceAPI.Application.Services;

namespace ECommerceAPI.API.Controllers
{
    [Authorize]
    [ApiController]
    [Route("api/user/addresses")]
    public class AddressController : ControllerBase
    {
        private readonly IAddressServiceHybrid _addressService;

        public AddressController(IAddressServiceHybrid addressService)
        {
            _addressService = addressService;
        }

        /// <summary>
        /// Get user ID from JWT token (supports both SQL int and MongoDB ObjectId)
        /// </summary>
        private string GetUserIdFromToken()
        {
            var claim = User.FindFirstValue(ClaimTypes.NameIdentifier) 
                ?? User.FindFirstValue("nameid")
                ?? User.FindFirstValue("id") 
                ?? User.FindFirstValue("sub");

            return claim;
        }

        /// <summary>
        /// Check if user is MongoDB user (ObjectId format)
        /// </summary>
        private bool IsMongoDbUser()
        {
            var userId = GetUserIdFromToken();
            if (string.IsNullOrEmpty(userId))
                return false;

            // MongoDB ObjectId is 24 hex characters
            return userId.Length == 24 && 
                   System.Text.RegularExpressions.Regex.IsMatch(userId, "^[0-9a-fA-F]{24}$");
        }

        // ================= ADD ADDRESS =================
        [HttpPost]
        public async Task<IActionResult> Add([FromBody] AddressDto dto)
        {
            var userId = GetUserIdFromToken();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "User ID not found" });

            if (IsMongoDbUser())
            {
                // MongoDB flow
                var address = new AddressMongo
                {
                    AddressLine1 = dto.AddressLine1,
                    AddressLine2 = dto.AddressLine2,
                    City = dto.City,
                    State = dto.State,
                    PostalCode = dto.PostalCode,
                    Country = dto.Country,
                    IsDefault = dto.IsDefault,
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow
                };

                var created = await _addressService.AddByUserIdStringAsync(userId, address);
                return Ok(created);
            }
            else
            {
                // SQL flow
                if (!int.TryParse(userId, out int sqlUserId))
                    return BadRequest(new { message = "Invalid user ID format" });

                var address = new Domain.Entities.Address
                {
                    AddressLine1 = dto.AddressLine1,
                    AddressLine2 = dto.AddressLine2,
                    City = dto.City,
                    State = dto.State,
                    PostalCode = dto.PostalCode,
                    Country = dto.Country,
                    IsDefault = dto.IsDefault,
                    UserId = sqlUserId,
                    CreatedAt = DateTime.UtcNow
                };

                var created = await _addressService.AddAsync(sqlUserId, address);
                return Ok(created);
            }
        }

        // ================= GET USER ADDRESSES =================
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var userId = GetUserIdFromToken();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "User ID not found" });

            if (IsMongoDbUser())
            {
                // MongoDB flow
                var addresses = await _addressService.GetAllByUserIdStringAsync(userId);
                return Ok(addresses);
            }
            else
            {
                // SQL flow
                if (!int.TryParse(userId, out int sqlUserId))
                    return BadRequest(new { message = "Invalid user ID format" });

                var addresses = await _addressService.GetAllAsync(sqlUserId);
                return Ok(addresses);
            }
        }

        // ================= UPDATE ADDRESS =================
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] AddressDto dto)
        {
            var userId = GetUserIdFromToken();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "User ID not found" });

            if (IsMongoDbUser())
            {
                // MongoDB flow
                var updated = new AddressMongo
                {
                    AddressLine1 = dto.AddressLine1,
                    AddressLine2 = dto.AddressLine2,
                    City = dto.City,
                    State = dto.State,
                    PostalCode = dto.PostalCode,
                    Country = dto.Country,
                    IsDefault = dto.IsDefault
                };

                var result = await _addressService.UpdateByUserIdStringAsync(userId, id, updated);
                
                if (result == null)
                    return NotFound(new { message = "Address not found" });

                return Ok(result);
            }
            else
            {
                // SQL flow
                if (!int.TryParse(userId, out int sqlUserId))
                    return BadRequest(new { message = "Invalid user ID format" });

                if (!int.TryParse(id, out int addressId))
                    return BadRequest(new { message = "Invalid address ID format" });

                var updated = new Domain.Entities.Address
                {
                    AddressLine1 = dto.AddressLine1,
                    AddressLine2 = dto.AddressLine2,
                    City = dto.City,
                    State = dto.State,
                    PostalCode = dto.PostalCode,
                    Country = dto.Country,
                    IsDefault = dto.IsDefault
                };

                var result = await _addressService.UpdateAsync(sqlUserId, addressId, updated);
                
                if (result == null)
                    return NotFound(new { message = "Address not found" });

                return Ok(result);
            }
        }

        // ================= DELETE ADDRESS =================
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            var userId = GetUserIdFromToken();
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "User ID not found" });

            if (IsMongoDbUser())
            {
                // MongoDB flow
                var success = await _addressService.DeleteByUserIdStringAsync(userId, id);
                
                if (!success)
                    return NotFound(new { message = "Address not found" });

                return Ok(new { message = "Address deleted successfully" });
            }
            else
            {
                // SQL flow
                if (!int.TryParse(userId, out int sqlUserId))
                    return BadRequest(new { message = "Invalid user ID format" });

                if (!int.TryParse(id, out int addressId))
                    return BadRequest(new { message = "Invalid address ID format" });

                var success = await _addressService.DeleteAsync(sqlUserId, addressId);
                
                if (!success)
                    return NotFound(new { message = "Address not found" });

                return Ok(new { message = "Address deleted successfully" });
            }
        }
    }
}