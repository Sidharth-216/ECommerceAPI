// FILE: ECommerceAPI.Application/Services/SemanticSearchService.cs

using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using ECommerceAPI.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace ECommerceAPI.Application.Services
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
            _logger     = logger;

            _aiServiceBaseUrl = (configuration["AIService:BaseUrl"]
                ?? "https://sidharth-216-ai-agent.hf.space")
                .TrimEnd('/');

            _logger.LogInformation("╔══════════════════════════════════════════╗");
            _logger.LogInformation("║  SemanticSearchService INITIALIZED       ║");
            _logger.LogInformation("║  URL: {Url}", _aiServiceBaseUrl);
            _logger.LogInformation("╚══════════════════════════════════════════╝");
        }

        public async Task<SemanticSearchResponseDto> SearchAsync(
            string  query,
            int     topK     = 5,
            double? minPrice = null,
            double? maxPrice = null)
        {
            var fullUrl = $"{_aiServiceBaseUrl}/search";

            _logger.LogInformation("┌─────────────────────────────────────────");
            _logger.LogInformation("│ SEARCH CALLED");
            _logger.LogInformation("│ URL      : {Url}",      fullUrl);
            _logger.LogInformation("│ Query    : '{Query}'",  query);
            _logger.LogInformation("│ TopK     : {TopK}",     topK);
            _logger.LogInformation("│ MinPrice : {Min}",      minPrice?.ToString() ?? "none");
            _logger.LogInformation("│ MaxPrice : {Max}",      maxPrice?.ToString() ?? "none");
            _logger.LogInformation("└─────────────────────────────────────────");

            try
            {
                // Build request body — include price fields only when provided
                // Python Pydantic treats null as "no filter" for Optional[float] fields
                var bodyObj = new
                {
                    query     = query,
                    top_k     = topK,
                    min_price = minPrice,
                    max_price = maxPrice
                };

                var json    = JsonSerializer.Serialize(bodyObj);
                _logger.LogInformation("Sending body: {Json}", json);

                var content  = new StringContent(json, Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync(fullUrl, content);
                var rawBody  = await response.Content.ReadAsStringAsync();

                _logger.LogInformation("┌─────────────────────────────────────────");
                _logger.LogInformation("│ AI SERVICE RESPONSE");
                _logger.LogInformation("│ Status: {Code} {Reason}", (int)response.StatusCode, response.ReasonPhrase);
                _logger.LogInformation("│ Body  : {Body}",
                    rawBody.Length > 800 ? rawBody.Substring(0, 800) + "..." : rawBody);
                _logger.LogInformation("└─────────────────────────────────────────");

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("✖ AI service returned {Status}", (int)response.StatusCode);
                    return EmptyResponse(query);
                }

                var result = JsonSerializer.Deserialize<SemanticSearchResponseDto>(
                    rawBody,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                _logger.LogInformation("✔ Parsed {Count} results", result?.Results?.Count ?? 0);
                return result ?? EmptyResponse(query);
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError("✖ HTTP ERROR: {Msg}", ex.Message);
                return EmptyResponse(query);
            }
            catch (JsonException ex)
            {
                _logger.LogError("✖ JSON PARSE ERROR: {Msg}", ex.Message);
                return EmptyResponse(query);
            }
            catch (TaskCanceledException ex)
            {
                _logger.LogError("✖ TIMEOUT: {Msg}", ex.Message);
                return EmptyResponse(query);
            }
            catch (Exception ex)
            {
                _logger.LogError("✖ UNEXPECTED [{Type}]: {Msg}", ex.GetType().Name, ex.Message);
                return EmptyResponse(query);
            }
        }

        private SemanticSearchResponseDto EmptyResponse(string query) =>
            new SemanticSearchResponseDto
            {
                Results = new List<SemanticSearchResultDto>(),
                Query   = query,
                Total   = 0
            };
    }
}