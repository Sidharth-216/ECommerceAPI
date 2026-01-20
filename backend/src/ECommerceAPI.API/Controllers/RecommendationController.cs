using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;
using ECommerceAPI.Application.Interfaces;
using ECommerceAPI.Application.DTOs.Recommendations;

namespace ECommerceAPI.API.Controllers
{
    /// <summary>
    /// Recommendation Controller - Provides product ranking
    /// AI AGENT has full access
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class RecommendationController : ControllerBase
    {
        private readonly IRecommendationService _recommendationService;

        public RecommendationController(IRecommendationService recommendationService)
        {
            _recommendationService = recommendationService;
        }

        /// <summary>
        /// Rank products based on criteria - AI AGENT ACCESSIBLE
        /// This is the core API the AI agent uses for smart recommendations
        /// </summary>
        [HttpPost("rank")]
        public async Task<ActionResult<RankingResponseDto>> RankProducts(
            [FromBody] RankingRequestDto request)
        {
            var result = await _recommendationService.RankProductsAsync(request);
            return Ok(result);
        }
    }
}

