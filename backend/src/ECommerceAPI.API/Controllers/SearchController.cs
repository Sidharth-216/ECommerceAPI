using Application.Interfaces;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class SearchController : ControllerBase
    {
        private readonly ISemanticSearchService _searchService;

        public SearchController(ISemanticSearchService searchService)
        {
            _searchService = searchService;
        }

        /// <summary>
        /// Semantic search endpoint — called by React frontend
        /// </summary>
        [HttpGet]
        public async Task<IActionResult> Search(
            [FromQuery] string query,
            [FromQuery] int topK = 5)
        {
            if (string.IsNullOrWhiteSpace(query))
                return BadRequest("Query is required");

            var results = await _searchService.SearchAsync(query, topK);
            return Ok(results);
        }
    }
}