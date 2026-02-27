using System.Collections.Generic;
using System.Threading.Tasks;

namespace ECommerceAPI.Application.Interfaces
{
    public class SemanticSearchResultDto
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Category { get; set; }
        public decimal Price { get; set; }
        public string Brand { get; set; }
        public double Rating { get; set; }
        public int ReviewCount { get; set; }
        public string ImageUrl { get; set; }
        public int StockQuantity { get; set; }
        public double Score { get; set; }
    }

    public class SemanticSearchResponseDto
    {
        public List<SemanticSearchResultDto> Results { get; set; }
        public string Query { get; set; }
        public int Total { get; set; }
    }

    public interface ISemanticSearchService
    {
        Task<SemanticSearchResponseDto> SearchAsync(string query, int topK = 5);
    }
}