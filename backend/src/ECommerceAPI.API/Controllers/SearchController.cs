// ─────────────────────────────────────────────────────────────────────────────
// FILE: ECommerceAPI.API/Controllers/SearchController.cs
// ─────────────────────────────────────────────────────────────────────────────
using ECommerceAPI.Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System.Threading.Tasks;

namespace ECommerceAPI.API.Controllers
{
    [ApiController]
    [Route("api/mongo")]
    public class SearchController : ControllerBase
    {
        private readonly ISemanticSearchService  _searchService;
        private readonly ILogger<SearchController> _logger;

        public SearchController(
            ISemanticSearchService   searchService,
            ILogger<SearchController> logger)
        {
            _searchService = searchService;
            _logger        = logger;
        }

        // GET api/mongo/search?query=phone&topK=5&minPrice=1000&maxPrice=20000
        [HttpGet("search")]
        public async Task<IActionResult> Search(
            [FromQuery] string  query,
            [FromQuery] int     topK     = 5,
            [FromQuery] double? minPrice = null,
            [FromQuery] double? maxPrice = null)
        {
            _logger.LogInformation(
                "=== SEARCH HIT === query='{Query}' topK={TopK} minPrice={Min} maxPrice={Max}",
                query, topK, minPrice, maxPrice);

            if (string.IsNullOrWhiteSpace(query))
            {
                _logger.LogWarning("=== SEARCH REJECTED === empty query");
                return BadRequest("Query is required");
            }

            var results = await _searchService.SearchAsync(query, topK, minPrice, maxPrice);

            _logger.LogInformation(
                "=== SEARCH DONE === {Count} results returned",
                results?.Results?.Count ?? 0);

            return Ok(results);
        }
    }
}