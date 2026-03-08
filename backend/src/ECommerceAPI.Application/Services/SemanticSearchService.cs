/*using System;
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
            _logger = logger;

            _aiServiceBaseUrl = (configuration["AIService:BaseUrl"]
                ?? "https://cutest-nonpolemically-floy.ngrok-free.dev")
                .TrimEnd('/');

            // REQUIRED: without this ngrok returns an HTML warning page
            // instead of JSON, breaking deserialization
            _httpClient.DefaultRequestHeaders.Add("ngrok-skip-browser-warning", "true");

            _logger.LogInformation("╔══════════════════════════════════════════╗");
            _logger.LogInformation("║  SemanticSearchService INITIALIZED       ║");
            _logger.LogInformation("║  URL: {Url}", _aiServiceBaseUrl);
            _logger.LogInformation("╚══════════════════════════════════════════╝");
        }

        public async Task<SemanticSearchResponseDto> SearchAsync(string query, int topK = 5)
        {
            var fullUrl = $"{_aiServiceBaseUrl}/search";

            _logger.LogInformation("┌─────────────────────────────────────────");
            _logger.LogInformation("│ SEARCH CALLED");
            _logger.LogInformation("│ URL   : {Url}", fullUrl);
            _logger.LogInformation("│ Query : '{Query}'", query);
            _logger.LogInformation("│ TopK  : {TopK}", topK);
            _logger.LogInformation("└─────────────────────────────────────────");

            try
            {
                var json = JsonSerializer.Serialize(new { query, top_k = topK });
                _logger.LogInformation("Sending body: {Json}", json);

                var content = new StringContent(json, Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync(fullUrl, content);

                var rawBody = await response.Content.ReadAsStringAsync();

                _logger.LogInformation("┌─────────────────────────────────────────");
                _logger.LogInformation("│ AI SERVICE RESPONSE");
                _logger.LogInformation("│ Status: {Code} {Reason}", (int)response.StatusCode, response.ReasonPhrase);
                _logger.LogInformation("│ Body  : {Body}",
                    rawBody.Length > 800 ? rawBody.Substring(0, 800) + "..." : rawBody);
                _logger.LogInformation("└─────────────────────────────────────────");

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("✖ AI service returned {Status} — returning empty results", (int)response.StatusCode);
                    return EmptyResponse(query);
                }

                var result = JsonSerializer.Deserialize<SemanticSearchResponseDto>(
                    rawBody,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                _logger.LogInformation("✔ Parsed {Count} results successfully", result?.Results?.Count ?? 0);
                return result ?? EmptyResponse(query);
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError("✖ HTTP ERROR: {Msg}", ex.Message);
                _logger.LogError("  Status : {Status}", ex.StatusCode);
                _logger.LogError("  Inner  : {Inner}", ex.InnerException?.Message);
                return EmptyResponse(query);
            }
            catch (JsonException ex)
            {
                _logger.LogError("✖ JSON PARSE ERROR: {Msg}", ex.Message);
                _logger.LogError("  Path: {Path}", ex.Path);
                return EmptyResponse(query);
            }
            catch (TaskCanceledException ex)
            {
                _logger.LogError("✖ TIMEOUT — AI service took too long: {Msg}", ex.Message);
                _logger.LogError("  Tip: Increase timeout in Startup.cs AddHttpClient");
                return EmptyResponse(query);
            }
            catch (Exception ex)
            {
                _logger.LogError("✖ UNEXPECTED [{Type}]: {Msg}", ex.GetType().Name, ex.Message);
                _logger.LogError("  Stack: {Stack}", ex.StackTrace);
                return EmptyResponse(query);
            }
        }

        private SemanticSearchResponseDto EmptyResponse(string query) =>
            new SemanticSearchResponseDto
            {
                Results = new List<SemanticSearchResultDto>(),
                Query = query,
                Total = 0
            };
    }
}
*/


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
            _logger = logger;

            _aiServiceBaseUrl = (configuration["AIService:BaseUrl"]
                ?? "https://sidharth-216-ai-agent.hf.space")
                .TrimEnd('/');

            // NOTE: ngrok header removed — not needed for HF Space
            // Only add it back if switching back to a ngrok tunnel

            _logger.LogInformation("╔══════════════════════════════════════════╗");
            _logger.LogInformation("║  SemanticSearchService INITIALIZED       ║");
            _logger.LogInformation("║  URL: {Url}", _aiServiceBaseUrl);
            _logger.LogInformation("╚══════════════════════════════════════════╝");
        }

        public async Task<SemanticSearchResponseDto> SearchAsync(string query, int topK = 5)
        {
            var fullUrl = $"{_aiServiceBaseUrl}/search";

            _logger.LogInformation("┌─────────────────────────────────────────");
            _logger.LogInformation("│ SEARCH CALLED");
            _logger.LogInformation("│ URL   : {Url}", fullUrl);
            _logger.LogInformation("│ Query : '{Query}'", query);
            _logger.LogInformation("│ TopK  : {TopK}", topK);
            _logger.LogInformation("└─────────────────────────────────────────");

            try
            {
                var json = JsonSerializer.Serialize(new { query, top_k = topK });
                _logger.LogInformation("Sending body: {Json}", json);

                var content = new StringContent(json, Encoding.UTF8, "application/json");
                var response = await _httpClient.PostAsync(fullUrl, content);

                var rawBody = await response.Content.ReadAsStringAsync();

                _logger.LogInformation("┌─────────────────────────────────────────");
                _logger.LogInformation("│ AI SERVICE RESPONSE");
                _logger.LogInformation("│ Status: {Code} {Reason}", (int)response.StatusCode, response.ReasonPhrase);
                _logger.LogInformation("│ Body  : {Body}",
                    rawBody.Length > 800 ? rawBody.Substring(0, 800) + "..." : rawBody);
                _logger.LogInformation("└─────────────────────────────────────────");

                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("✖ AI service returned {Status} — returning empty results", (int)response.StatusCode);
                    return EmptyResponse(query);
                }

                var result = JsonSerializer.Deserialize<SemanticSearchResponseDto>(
                    rawBody,
                    new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

                _logger.LogInformation("✔ Parsed {Count} results successfully", result?.Results?.Count ?? 0);
                return result ?? EmptyResponse(query);
            }
            catch (HttpRequestException ex)
            {
                _logger.LogError("✖ HTTP ERROR: {Msg}", ex.Message);
                _logger.LogError("  Status : {Status}", ex.StatusCode);
                _logger.LogError("  Inner  : {Inner}", ex.InnerException?.Message);
                return EmptyResponse(query);
            }
            catch (JsonException ex)
            {
                _logger.LogError("✖ JSON PARSE ERROR: {Msg}", ex.Message);
                _logger.LogError("  Path: {Path}", ex.Path);
                return EmptyResponse(query);
            }
            catch (TaskCanceledException ex)
            {
                _logger.LogError("✖ TIMEOUT — AI service took too long: {Msg}", ex.Message);
                _logger.LogError("  Tip: Increase timeout in Startup.cs AddHttpClient");
                return EmptyResponse(query);
            }
            catch (Exception ex)
            {
                _logger.LogError("✖ UNEXPECTED [{Type}]: {Msg}", ex.GetType().Name, ex.Message);
                _logger.LogError("  Stack: {Stack}", ex.StackTrace);
                return EmptyResponse(query);
            }
        }

        private SemanticSearchResponseDto EmptyResponse(string query) =>
            new SemanticSearchResponseDto
            {
                Results = new List<SemanticSearchResultDto>(),
                Query = query,
                Total = 0
            };
    }
}
