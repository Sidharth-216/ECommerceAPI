using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using MongoDB.Bson;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Domain.Entities.Mongo;

namespace ECommerceAPI.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class MongoAddressController : ControllerBase
    {
        private readonly IMongoAddressService _addressService;

        public MongoAddressController(IMongoAddressService addressService)
        {
            _addressService = addressService;
        }

        // ================= GET MY ADDRESSES =================
        [HttpGet]
        public async Task<ActionResult<IEnumerable<AddressMongo>>> GetMyAddresses()
        {
            var userId = GetMongoUserId();

            var addresses = await _addressService.GetByUserIdAsync(userId);
            return Ok(addresses);
        }

        // ================= GET BY ID =================
        [HttpGet("{id}")]
        public async Task<ActionResult<AddressMongo>> GetById(string id)
        {
            if (!ObjectId.TryParse(id, out _))
                return BadRequest(new { message = "Invalid address ID format." });

            var address = await _addressService.GetByIdAsync(id);
            if (address == null)
                return NotFound(new { message = "Address not found." });

            var userId = GetMongoUserId();
            if (address.UserId != userId)
                return Forbid();

            return Ok(address);
        }

        // ================= GET BY USER (ADMIN ONLY) =================
        [HttpGet("user/{userId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<AddressMongo>>> GetByUserId(string userId)
        {
            if (!ObjectId.TryParse(userId, out _))
                return BadRequest(new { message = "Invalid user ID format." });

            var addresses = await _addressService.GetByUserIdAsync(userId);
            return Ok(addresses);
        }

        // ================= GET DEFAULT =================
        [HttpGet("default/{userId}")]
        public async Task<ActionResult<AddressMongo>> GetDefaultAddress(string userId)
        {
            var currentUserId = GetMongoUserId();

            if (userId != currentUserId && !User.IsInRole("Admin"))
                return Forbid();

            if (!ObjectId.TryParse(userId, out _))
                return BadRequest(new { message = "Invalid user ID format." });

            var address = await _addressService.GetDefaultAddressAsync(userId);
            if (address == null)
                return NotFound(new { message = "No default address found." });

            return Ok(address);
        }

        // ================= ADD =================
        [HttpPost]
        [Authorize]
        public async Task<IActionResult> Add([FromBody] AddressMongo address)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(userId))
                return Unauthorized("User ID not found in token.");

            address.UserId = userId;

            var result = await _addressService.AddAsync(address);

            return Ok(result);
        }

        // ================= UPDATE =================
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] AddressMongo address)
        {
            if (address == null)
                return BadRequest(new { message = "Address data is required." });

            if (!ObjectId.TryParse(id, out _))
                return BadRequest(new { message = "Invalid address ID format." });

            var existingAddress = await _addressService.GetByIdAsync(id);
            if (existingAddress == null)
                return NotFound(new { message = "Address not found." });

            var userId = GetMongoUserId();
            if (existingAddress.UserId != userId)
                return Forbid();

            address.Id = id;
            address.UserId = userId;

            await _addressService.UpdateAsync(address);
            return NoContent();
        }

        // ================= DELETE =================
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            if (!ObjectId.TryParse(id, out _))
                return BadRequest(new { message = "Invalid address ID format." });

            var address = await _addressService.GetByIdAsync(id);
            if (address == null)
                return NotFound(new { message = "Address not found." });

            var userId = GetMongoUserId();
            if (address.UserId != userId)
                return Forbid();

            await _addressService.DeleteAsync(id);
            return NoContent();
        }

        // ================= UNSET DEFAULT =================
        [HttpPut("{userId}/unset-default")]
        public async Task<IActionResult> UnsetDefaultAddresses(string userId, [FromQuery] string exceptId = null)
        {
            var currentUserId = GetMongoUserId();

            if (userId != currentUserId && !User.IsInRole("Admin"))
                return Forbid();

            if (!ObjectId.TryParse(userId, out _))
                return BadRequest(new { message = "Invalid user ID format." });

            await _addressService.UnsetDefaultAddressesAsync(userId, exceptId);
            return NoContent();
        }

        // ================= JWT USER EXTRACTION =================
        private string GetMongoUserId()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrWhiteSpace(userId))
                throw new UnauthorizedAccessException("User ID not found in token.");

            if (!ObjectId.TryParse(userId, out _))
                throw new UnauthorizedAccessException("Invalid MongoDB user ID.");

            return userId;
        }
    }
}
