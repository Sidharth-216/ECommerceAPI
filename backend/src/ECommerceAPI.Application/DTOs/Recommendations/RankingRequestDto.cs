using System.Collections.Generic;

namespace ECommerceAPI.Application.DTOs.Recommendations
{
    public class RankingRequestDto
    {
        public List<int> ProductIds { get; set; }
        public RankingCriteria Criteria { get; set; }
    }

    public class RankingCriteria
    {
        public bool PrioritizeRating { get; set; } = true;
        public bool PrioritizeAvailability { get; set; } = true;
        public string FeaturePreference { get; set; }
        public decimal BudgetWeight { get; set; } = 0.3m;
    }

    public class RankingResponseDto
    {
        public List<RankedProduct> RankedProducts { get; set; }
    }

    public class RankedProduct
    {
        public int ProductId { get; set; }
        public string ProductName { get; set; }
        public decimal Price { get; set; }
        public decimal Rating { get; set; }
        public double Score { get; set; }
        public string Reason { get; set; }
    }
}
