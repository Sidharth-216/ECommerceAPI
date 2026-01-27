using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Application.Services;

namespace ECommerceAPI.API.Controllers
{

    [ApiController]
    [Route("api/[controller]")]
    public class MigrationController : ControllerBase
    {
        private readonly UserMigrationService _migrationService;

        public MigrationController(UserMigrationService migrationService)
        {
            _migrationService = migrationService;
        }

        [HttpPost("migrate-users")]
        public async Task<ActionResult> MigrateUsers()
        {
            var result = await _migrationService.MigrateAllUsersAsync();
            return Ok(result);
        }

        [HttpGet("verify-migration")]
        public async Task<ActionResult> VerifyMigration()
        {
            var result = await _migrationService.VerifyMigrationAsync();
            return Ok(result);
        }
    }
}