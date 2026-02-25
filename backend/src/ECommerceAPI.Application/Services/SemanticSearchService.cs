using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace Infrastructure.Services
{
    public class SemanticSearchService : ISemanticSearchService
    {
        private readonly HttpClient _httpClient;
        private readonly ILogger<SemanticSearchService> _logger;
        private readonly string _aiServiceBaseUrl;

        public SemanticSearchService(
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<SemanticSearchService> logger)
        {
            _httpClient = httpClient;
            _logger = logger;
             _aiServiceBaseUrl = configuration["AIService:BaseUrl"] 
                ?? "http://localhost:8000";
        }

        public async Task<SemanticSearchResponseDto> SearchAsync(string query, int topK = 5)
        {
            try
            {
                var requestBody = new
                {
                    query = query,
                    top_k = topK
                };

                var content = new StringContent(
                    JsonSerializer.Serialize(requestBody),
                    Encoding.UTF8,
                    "application/json"
                );

                _logger.LogInformation("Sending semantic search query: {Query}", query);

                var response = await _httpClient.PostAsync(
                    $"{_aiServiceBaseUrl}/search",
                    content
                );

                response.EnsureSuccessStatusCode();

                var result = await response.Content
                    .ReadFromJsonAsync<SemanticSearchResponseDto>();

                _logger.LogInformation(
                    "Semantic search returned {Count} results for query: {Query}",
                    result?.Results?.Count ?? 0,
                    query
                );

                return result ?? new SemanticSearchResponseDto 
                { 
                    Results = new List<SemanticSearchResultDto>(), 
                    Query = query 
                };
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError(ex, "AI service unavailable for query: {Query}", query);
                // Return empty results gracefully — don't crash the app
                return new SemanticSearchResponseDto
                {
                    Results = new List<SemanticSearchResultDto>(),
                    Query = query
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during semantic search");
                throw;
            }
        }
    }
}