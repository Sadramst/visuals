// AI Provider Implementations
// SWITCHING PROVIDERS IS JUST AN ENV VARIABLE

using Appilico.AIQueryApi.Models;
using Microsoft.Extensions.Caching.Memory;
using System.Text;
using System.Text.Json;

namespace Appilico.AIQueryApi.Services;

/// <summary>
/// Mock provider for development and testing
/// </summary>
public class MockAIProvider : IAIProvider
{
    public string Name => "Mock Provider";

    private static readonly Dictionary<string, string> MockResponses = new()
    {
        ["production"] = """
            Based on the production data:
            - **Today's output**: 45,230 tonnes (8% above target)
            - **Best performing shift**: Night shift at Pit 3 (12,500t)
            - **Equipment utilisation**: 94% average OEE
            - **Key insight**: Tuesday underperformance pattern detected - consider crew rotation adjustments
            """,
        ["safety"] = """
            Safety KPI Summary:
            - **TRIFR**: 2.1 (target: 2.5) ✓ Leading indicator GREEN
            - **Critical control verifications**: 98% completion rate
            - **Near miss reports**: 23 this month (up 15% - positive reporting culture)
            - **Recommendation**: Focus on vehicle-pedestrian interaction controls
            """,
        ["equipment"] = """
            Fleet Status Overview:
            - **Active units**: 42/45 (93%)
            - **In maintenance**: D11-001 (hydraulic fault), CAT793-002 (scheduled)
            - **Average OEE**: 87.3%
            - **Alert**: Haul truck fleet showing 5% efficiency drop - check tyre pressure program
            """,
        ["cost"] = """
            Cost Analysis - YTD:
            - **Total spend**: $124.5M (3.2% under budget)
            - **Anomaly detected**: April wet season costs 21% over budget
            - **Cost per tonne**: $4.23 (target: $4.50)
            - **Savings opportunity**: Fuel consumption trending 8% above benchmark
            """,
    };

    public bool IsAvailable() => true;

    public async Task<AIQueryResponse> QueryAsync(AIQueryRequest request, CancellationToken ct = default)
    {
        // Simulate API latency
        await Task.Delay(Random.Shared.Next(500, 1200), ct);

        var answer = FindMockResponse(request.Question);

        return new AIQueryResponse
        {
            Id = $"mock-{Guid.NewGuid():N}",
            Question = request.Question,
            Answer = answer,
            Confidence = 0.85 + Random.Shared.NextDouble() * 0.1,
            Sources = new List<string> { "production_data", "equipment_status", "safety_kpis" },
            Timestamp = DateTime.UtcNow,
            TokensUsed = Random.Shared.Next(100, 300)
        };
    }

    private static string FindMockResponse(string question)
    {
        var lower = question.ToLowerInvariant();

        if (lower.Contains("production") || lower.Contains("tonnes") || lower.Contains("shift"))
            return MockResponses["production"];
        if (lower.Contains("safety") || lower.Contains("incident") || lower.Contains("trifr"))
            return MockResponses["safety"];
        if (lower.Contains("equipment") || lower.Contains("fleet") || lower.Contains("oee"))
            return MockResponses["equipment"];
        if (lower.Contains("cost") || lower.Contains("budget") || lower.Contains("spend"))
            return MockResponses["cost"];

        return """
            I can help you analyse mining operations data. Try asking about:
            - Production performance and shift analysis
            - Safety KPIs and incident trends
            - Equipment fleet status and OEE
            - Cost tracking and budget variance
            """;
    }
}

/// <summary>
/// Google Gemini provider (FREE tier available)
/// </summary>
public class GeminiAIProvider : IAIProvider
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly string _model;

    public string Name => "Google Gemini";

    public GeminiAIProvider(HttpClient httpClient, IConfiguration config)
    {
        _httpClient = httpClient;
        _apiKey = config["AI:Gemini:ApiKey"] ?? "";
        _model = config["AI:Gemini:Model"] ?? "gemini-1.5-flash";
    }

    public bool IsAvailable() => !string.IsNullOrEmpty(_apiKey);

    public async Task<AIQueryResponse> QueryAsync(AIQueryRequest request, CancellationToken ct = default)
    {
        var prompt = BuildPrompt(request);
        var requestBody = new
        {
            contents = new[]
            {
                new { parts = new[] { new { text = prompt } } }
            },
            generationConfig = new
            {
                temperature = 0.3,
                maxOutputTokens = 500
            }
        };

        var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_model}:generateContent?key={_apiKey}";
        var response = await _httpClient.PostAsync(
            url,
            new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json"),
            ct
        );

        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadAsStringAsync(ct);
        var result = JsonDocument.Parse(json);

        var answer = result.RootElement
            .GetProperty("candidates")[0]
            .GetProperty("content")
            .GetProperty("parts")[0]
            .GetProperty("text")
            .GetString() ?? "No response generated";

        var tokens = result.RootElement.TryGetProperty("usageMetadata", out var usage)
            ? usage.TryGetProperty("totalTokenCount", out var count) ? count.GetInt32() : 0
            : 0;

        return new AIQueryResponse
        {
            Id = $"gemini-{Guid.NewGuid():N}",
            Question = request.Question,
            Answer = answer,
            Confidence = 0.8,
            Sources = request.Context != null ? new List<string> { "context_provided" } : new List<string>(),
            Timestamp = DateTime.UtcNow,
            TokensUsed = tokens
        };
    }

    private static string BuildPrompt(AIQueryRequest request)
    {
        var sb = new StringBuilder();
        sb.AppendLine("You are an AI assistant for mining operations analysis.");
        sb.AppendLine("Context: Western Australian iron ore mine operations data.");
        sb.AppendLine($"Question: {request.Question}");
        if (!string.IsNullOrEmpty(request.Context))
            sb.AppendLine($"Additional context: {request.Context}");
        sb.AppendLine();
        sb.AppendLine("Provide a concise, data-driven response with specific metrics where available.");
        return sb.ToString();
    }
}

/// <summary>
/// Azure OpenAI provider (paid, enterprise-grade)
/// </summary>
public class AzureOpenAIProvider : IAIProvider
{
    private readonly HttpClient _httpClient;
    private readonly string _apiKey;
    private readonly string _endpoint;
    private readonly string _deployment;

    public string Name => "Azure OpenAI";

    public AzureOpenAIProvider(HttpClient httpClient, IConfiguration config)
    {
        _httpClient = httpClient;
        _apiKey = config["AI:AzureOpenAI:ApiKey"] ?? "";
        _endpoint = config["AI:AzureOpenAI:Endpoint"] ?? "";
        _deployment = config["AI:AzureOpenAI:Deployment"] ?? "gpt-4o";
    }

    public bool IsAvailable() => !string.IsNullOrEmpty(_apiKey) && !string.IsNullOrEmpty(_endpoint);

    public async Task<AIQueryResponse> QueryAsync(AIQueryRequest request, CancellationToken ct = default)
    {
        var messages = new List<object>
        {
            new
            {
                role = "system",
                content = """
                    You are an AI assistant for mining operations analysis.
                    Context: Western Australian iron ore mine operations data.
                    Provide concise, data-driven responses with specific metrics where available.
                    """
            }
        };

        // Add conversation history
        if (request.ConversationHistory != null)
        {
            foreach (var msg in request.ConversationHistory.TakeLast(10))
            {
                messages.Add(new { role = msg.Role, content = msg.Content });
            }
        }

        messages.Add(new
        {
            role = "user",
            content = string.IsNullOrEmpty(request.Context)
                ? request.Question
                : $"{request.Question}\n\nContext: {request.Context}"
        });

        var requestBody = new
        {
            messages,
            temperature = 0.3,
            max_tokens = 500
        };

        var url = $"{_endpoint}/openai/deployments/{_deployment}/chat/completions?api-version=2024-02-01";
        _httpClient.DefaultRequestHeaders.Clear();
        _httpClient.DefaultRequestHeaders.Add("api-key", _apiKey);

        var response = await _httpClient.PostAsync(
            url,
            new StringContent(JsonSerializer.Serialize(requestBody), Encoding.UTF8, "application/json"),
            ct
        );

        response.EnsureSuccessStatusCode();
        var json = await response.Content.ReadAsStringAsync(ct);
        var result = JsonDocument.Parse(json);

        var answer = result.RootElement
            .GetProperty("choices")[0]
            .GetProperty("message")
            .GetProperty("content")
            .GetString() ?? "No response generated";

        var tokens = result.RootElement.TryGetProperty("usage", out var usage)
            ? usage.TryGetProperty("total_tokens", out var count) ? count.GetInt32() : 0
            : 0;

        return new AIQueryResponse
        {
            Id = $"azure-{Guid.NewGuid():N}",
            Question = request.Question,
            Answer = answer,
            Confidence = 0.85,
            Sources = request.Context != null ? new List<string> { "context_provided" } : new List<string>(),
            Timestamp = DateTime.UtcNow,
            TokensUsed = tokens
        };
    }
}
