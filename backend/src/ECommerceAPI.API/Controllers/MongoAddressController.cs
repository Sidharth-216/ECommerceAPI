/*
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
    [Authorize] // Require authentication for all address operations
    public class MongoAddressController : ControllerBase
    {
        private readonly IMongoAddressService _addressService;

        public MongoAddressController(IMongoAddressService addressService)
        {
            _addressService = addressService ?? throw new ArgumentNullException(nameof(addressService));
        }

        /// <summary>
        /// Get all addresses for current authenticated user
        /// GET /api/MongoAddress
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<IEnumerable<AddressMongo>>> GetMyAddresses()
        {
            try
            {
                var userId = GetMongoUserId();
                Console.WriteLine($"📍 [MongoAddressController] GET /api/MongoAddress - User: {userId}");

                if (!ObjectId.TryParse(userId, out _))
                {
                    return BadRequest(new { message = $"Invalid user ID format: {userId}" });
                }

                var addresses = await _addressService.GetByUserIdAsync(userId);
                return Ok(addresses);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error getting addresses: {ex.Message}");
                return StatusCode(500, new { message = "An error occurred while fetching addresses", error = ex.Message });
            }
        }

        /// <summary>
        /// Get address by ID
        /// GET /api/MongoAddress/{id}
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<AddressMongo>> GetById(string id)
        {
            try
            {
                if (!ObjectId.TryParse(id, out _))
                {
                    return BadRequest(new { message = $"Invalid address ID format: {id}" });
                }

                var address = await _addressService.GetByIdAsync(id);
                if (address == null)
                    return NotFound(new { message = $"Address not found: {id}" });

                // Verify ownership
                var userId = GetMongoUserId();
                if (address.UserId != userId)
                    return Forbid();

                return Ok(address);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error getting address: {ex.Message}");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get addresses by user ID (Admin only)
        /// GET /api/MongoAddress/user/{userId}
        /// </summary>
        [HttpGet("user/{userId}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult<IEnumerable<AddressMongo>>> GetByUserId(string userId)
        {
            try
            {
                if (!ObjectId.TryParse(userId, out _))
                {
                    return BadRequest(new { message = $"Invalid user ID format: {userId}" });
                }

                var addresses = await _addressService.GetByUserIdAsync(userId);
                return Ok(addresses);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error: {ex.Message}");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get default address for user
        /// GET /api/MongoAddress/default/{userId}
        /// </summary>
        [HttpGet("default/{userId}")]
        public async Task<ActionResult<AddressMongo>> GetDefaultAddress(string userId)
        {
            try
            {
                // Verify user can only get their own default address
                var currentUserId = GetMongoUserId();
                if (userId != currentUserId && !User.IsInRole("Admin"))
                {
                    return Forbid();
                }

                if (!ObjectId.TryParse(userId, out _))
                {
                    return BadRequest(new { message = $"Invalid user ID format: {userId}" });
                }

                var address = await _addressService.GetDefaultAddressAsync(userId);
                if (address == null)
                    return NotFound(new { message = "No default address found" });

                return Ok(address);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error: {ex.Message}");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Add new address
        /// POST /api/MongoAddress
        /// </summary>
        [HttpPost]
        public async Task<ActionResult<AddressMongo>> Add([FromBody] AddressMongo address)
        {
            try
            {
                if (address == null)
                {
                    return BadRequest(new { message = "Address data is required" });
                }

                // Get authenticated user ID
                var userId = GetMongoUserId();
                Console.WriteLine($"➕ [MongoAddressController] Adding address for user: {userId}");

                if (!ObjectId.TryParse(userId, out _))
                {
                    return BadRequest(new { message = $"Invalid user ID: {userId}" });
                }

                // Ensure the address belongs to the authenticated user
                address.UserId = userId;
                address.Id = null; // Let MongoDB generate the ID

                Console.WriteLine($"   Address Data: {address.AddressLine1}, {address.City}");

                var createdAddress = await _addressService.AddAsync(address);
                
                Console.WriteLine($"✅ Address created with ID: {createdAddress.Id}");
                
                return CreatedAtAction(nameof(GetById), new { id = createdAddress.Id }, createdAddress);
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error adding address: {ex.Message}");
                Console.WriteLine($"   Stack: {ex.StackTrace}");
                return StatusCode(500, new { message = "Failed to add address", error = ex.Message });
            }
        }

        /// <summary>
        /// Update address
        /// PUT /api/MongoAddress/{id}
        /// </summary>
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(string id, [FromBody] AddressMongo address)
        {
            try
            {
                if (address == null)
                {
                    return BadRequest(new { message = "Address data is required" });
                }

                if (!ObjectId.TryParse(id, out _))
                {
                    return BadRequest(new { message = $"Invalid address ID format: {id}" });
                }

                // Verify ownership
                var existingAddress = await _addressService.GetByIdAsync(id);
                if (existingAddress == null)
                {
                    return NotFound(new { message = $"Address not found: {id}" });
                }

                var userId = GetMongoUserId();
                if (existingAddress.UserId != userId)
                {
                    return Forbid();
                }

                // Ensure ID matches
                address.Id = id;
                address.UserId = userId;

                await _addressService.UpdateAsync(address);
                return NoContent();
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error updating address: {ex.Message}");
                return StatusCode(500, new { message = "Failed to update address", error = ex.Message });
            }
        }

        /// <summary>
        /// Delete address
        /// DELETE /api/MongoAddress/{id}
        /// </summary>
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(string id)
        {
            try
            {
                if (!ObjectId.TryParse(id, out _))
                {
                    return BadRequest(new { message = $"Invalid address ID format: {id}" });
                }

                // Verify ownership
                var address = await _addressService.GetByIdAsync(id);
                if (address == null)
                {
                    return NotFound(new { message = $"Address not found: {id}" });
                }

                var userId = GetMongoUserId();
                if (address.UserId != userId)
                {
                    return Forbid();
                }

                await _addressService.DeleteAsync(id);
                return NoContent();
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error deleting address: {ex.Message}");
                return StatusCode(500, new { message = "Failed to delete address", error = ex.Message });
            }
        }

        /// <summary>
        /// Unset default addresses for user
        /// PUT /api/MongoAddress/{userId}/unset-default
        /// </summary>
        [HttpPut("{userId}/unset-default")]
        public async Task<IActionResult> UnsetDefaultAddresses(string userId, [FromQuery] string exceptId = null)
        {
            try
            {
                // Verify user can only modify their own addresses
                var currentUserId = GetMongoUserId();
                if (userId != currentUserId && !User.IsInRole("Admin"))
                {
                    return Forbid();
                }

                if (!ObjectId.TryParse(userId, out _))
                {
                    return BadRequest(new { message = $"Invalid user ID format: {userId}" });
                }

                await _addressService.UnsetDefaultAddressesAsync(userId, exceptId);
                return NoContent();
            }
            catch (UnauthorizedAccessException ex)
            {
                return Unauthorized(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                Console.WriteLine($"❌ Error unsetting defaults: {ex.Message}");
                return StatusCode(500, new { message = "An error occurred", error = ex.Message });
            }
        }

        /// <summary>
        /// Get MongoDB User ID from JWT claims
        /// </summary>
        private string GetMongoUserId()
        {
            // Try NameIdentifier claim (most common)
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim != null && !string.IsNullOrWhiteSpace(userIdClaim.Value))
            {
                return userIdClaim.Value;
            }

            // Try "sub" claim (JWT standard)
            userIdClaim = User.FindFirst("sub");
            if (userIdClaim != null && !string.IsNullOrWhiteSpace(userIdClaim.Value))
            {
                return userIdClaim.Value;
            }

            // Try "userId" claim (custom)
            userIdClaim = User.FindFirst("userId");
            if (userIdClaim != null && !string.IsNullOrWhiteSpace(userIdClaim.Value))
            {
                return userIdClaim.Value;
            }

            // Try "nameid" claim (alternative)
            userIdClaim = User.FindFirst("nameid");
            if (userIdClaim != null && !string.IsNullOrWhiteSpace(userIdClaim.Value))
            {
                return userIdClaim.Value;
            }

            Console.WriteLine($"❌ User ID not found in any JWT claim!");
            throw new UnauthorizedAccessException("User ID not found in token");
        }
    }
}*/

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
