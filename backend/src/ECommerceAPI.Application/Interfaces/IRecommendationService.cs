using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Recommendations;

namespace ECommerceAPI.Application.Interfaces
{
    /// <summary>
    /// Interface for recommendation service that ranks products based on multiple criteria
    /// </summary>
    public interface IRecommendationService
    {
        /// <summary>
        /// Ranks products based on the provided criteria
        /// </summary>
        /// <param name="request">Ranking request containing product IDs and criteria</param>
        /// <returns>Ranked products with scores and reasons</returns>
        Task<RankingResponseDto> RankProductsAsync(RankingRequestDto request);
    }
}