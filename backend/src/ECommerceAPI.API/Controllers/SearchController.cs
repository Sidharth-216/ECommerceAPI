using ECommerceAPI.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;

namespace ECommerceAPI.API.Controllers
{
    [ApiController]
    [Route("api/mongo")]   // Base route only
    public class SearchController : ControllerBase
    {
        private readonly ISemanticSearchService _searchService;
        private readonly ILogger<SearchController> _logger;

        public SearchController(
            ISemanticSearchService searchService,
            ILogger<SearchController> logger)
        {
            _searchService = searchService;
            _logger = logger;
        }

        // GET api/mongo/search?query=phone&topK=5
        [HttpGet("search")]   // Action route defined here
        public async Task<IActionResult> Search(
            [FromQuery] string query,
            [FromQuery] int topK = 5)
        {
            _logger.LogInformation("=== SEARCH HIT === query='{Query}' topK={TopK}", query, topK);

            if (string.IsNullOrWhiteSpace(query))
            {
                _logger.LogWarning("=== SEARCH REJECTED === empty query");
                return BadRequest("Query is required");
            }

            _logger.LogInformation("=== CALLING AI SERVICE === query='{Query}'", query);

            var results = await _searchService.SearchAsync(query, topK);

            _logger.LogInformation(
                "=== SEARCH DONE === {Count} results returned",
                results?.Results?.Count ?? 0
            );

            return Ok(results);
        }
    }
}