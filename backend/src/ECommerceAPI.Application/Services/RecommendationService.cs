using ECommerceAPI.Infrastructure.Repositories.Interfaces;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using ECommerceAPI.Application.DTOs.Recommendations;
using ECommerceAPI.Application.Interfaces;
//using ECommerceAPI.Infrastructure.Repositories.Interfaces;

namespace ECommerceAPI.Application.Services
{
    /// <summary>
    /// Recommendation Service - Ranks products based on multiple criteria
    /// This is what the AI agent uses to provide smart recommendations
    /// Follows Strategy Pattern for different ranking algorithms
    /// </summary>
    public class RecommendationService : IRecommendationService
    {
        private readonly IProductRepository _productRepository;

        public RecommendationService(IProductRepository productRepository)
        {
            _productRepository = productRepository;
        }

        public async Task<RankingResponseDto> RankProductsAsync(RankingRequestDto request)
        {
            // Get all requested products
            var products = await _productRepository.GetByIdsAsync(request.ProductIds);
            
            // Calculate score for each product
            var rankedProducts = products.Select(product => new RankedProduct
            {
                ProductId = product.Id,
                ProductName = product.Name,
                Price = product.Price,
                Rating = product.Rating,
                Score = CalculateScore(product, request.Criteria),
                Reason = GenerateReason(product, request.Criteria)
            })
            .OrderByDescending(p => p.Score)
            .ToList();

            return new RankingResponseDto
            {
                RankedProducts = rankedProducts
            };
        }

        private double CalculateScore(Domain.Entities.Product product, RankingCriteria criteria)
        {
            double score = 0;

            // Rating score (0-1)
            if (criteria.PrioritizeRating)
            {
                var ratingScore = (double)(product.Rating / 5.0m) * 0.4;
                var popularityScore = Math.Min(product.ReviewCount / 1000.0, 1.0) * 0.2;
                score += ratingScore + popularityScore;
            }

            // Availability score (0-1)
            if (criteria.PrioritizeAvailability)
            {
                var availabilityScore = product.StockQuantity > 0 ? 0.3 : 0;
                score += availabilityScore;
            }

            // Feature preference score (0-1)
            if (!string.IsNullOrEmpty(criteria.FeaturePreference))
            {
                var hasFeature = product.Specifications?.ToLower()
                    .Contains(criteria.FeaturePreference.ToLower()) ?? false;
                
                if (hasFeature)
                {
                    score += 0.1;
                }
            }

            return score;
        }

        private string GenerateReason(Domain.Entities.Product product, RankingCriteria criteria)
        {
            var reasons = new List<string>();

            if (product.Rating >= 4.5m)
                reasons.Add("Excellent ratings");
            else if (product.Rating >= 4.0m)
                reasons.Add("Good ratings");

            if (product.ReviewCount > 500)
                reasons.Add("highly popular");

            if (product.StockQuantity > 0)
                reasons.Add("in stock");
            else
                reasons.Add("currently unavailable");

            if (!string.IsNullOrEmpty(criteria.FeaturePreference))
            {
                var hasFeature = product.Specifications?.ToLower()
                    .Contains(criteria.FeaturePreference.ToLower()) ?? false;
                
                if (hasFeature)
                {
                    reasons.Add($"great {criteria.FeaturePreference}");
                }
            }

            return string.Join(", ", reasons);
        }
    }
}

