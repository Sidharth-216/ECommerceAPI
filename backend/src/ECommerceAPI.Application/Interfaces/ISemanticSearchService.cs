using System.Collections.Generic;
using System.Threading.Tasks;

namespace Application.Interfaces
{
    public class SemanticSearchResultDto
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public string Category { get; set; }
        public decimal Price { get; set; }
        public double Score { get; set; }
    }

    public class SemanticSearchResponseDto
    {
        public List<SemanticSearchResultDto> Results { get; set; }
        public string Query { get; set; }
    }

    public interface ISemanticSearchService
    {
        Task<SemanticSearchResponseDto> SearchAsync(string query, int topK = 5);
    }
}