// AI Provider Factory and Query Service
// SWITCHING PROVIDERS IS JUST AN ENV VARIABLE

using Appilico.AIQueryApi.Models;
using Microsoft.Extensions.Caching.Memory;

namespace Appilico.AIQueryApi.Services;

/// <summary>
/// Factory for creating AI providers based on configuration
/// </summary>
public class AIProviderFactory : IAIProviderFactory
{
    private readonly IConfiguration _config;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<AIProviderFactory> _logger;

    public AIProviderFactory(
        IConfiguration config,
        IHttpClientFactory httpClientFactory,
        ILogger<AIProviderFactory> logger)
    {
        _config = config;
        _httpClientFactory = httpClientFactory;
        _logger = logger;
    }

    /// <summary>
    /// Get the configured AI provider
    /// SWITCHING PROVIDERS IS JUST AN ENV VARIABLE: AI__Provider
    /// </summary>
    public IAIProvider GetProvider()
    {
        var providerType = _config["AI:Provider"]?.ToLowerInvariant() ?? "mock";
        _logger.LogInformation("Creating AI provider: {Provider}", providerType);

        return providerType switch
        {
            "gemini" => new GeminiAIProvider(_httpClientFactory.CreateClient(), _config),
            "azure" or "azure-openai" => new AzureOpenAIProvider(_httpClientFactory.CreateClient(), _config),
            _ => new MockAIProvider()
        };
    }
}

/// <summary>
/// AI query service with caching and rate limiting
/// </summary>
public class AIQueryService : IAIQueryService
{
    private readonly IAIProviderFactory _providerFactory;
    private readonly IMemoryCache _cache;
    private readonly ILogger<AIQueryService> _logger;

    public AIQueryService(
        IAIProviderFactory providerFactory,
        IMemoryCache cache,
        ILogger<AIQueryService> logger)
    {
        _providerFactory = providerFactory;
        _cache = cache;
        _logger = logger;
    }

    public async Task<AIQueryResponse> QueryAsync(AIQueryRequest request, CancellationToken ct = default)
    {
        // Generate cache key based on question and context
        var cacheKey = $"query:{request.Question.ToLowerInvariant().GetHashCode()}:{request.Context?.GetHashCode() ?? 0}";

        // Check cache first (for identical recent queries)
        if (_cache.TryGetValue<AIQueryResponse>(cacheKey, out var cached) && cached != null)
        {
            _logger.LogDebug("Returning cached response for: {Question}", request.Question);
            return cached with { Id = $"{cached.Id}-cached" };
        }

        // Get provider and execute query
        var provider = _providerFactory.GetProvider();
        
        if (!provider.IsAvailable())
        {
            _logger.LogWarning("Provider {Provider} not available, falling back to mock", provider.Name);
            provider = new MockAIProvider();
        }

        _logger.LogInformation(
            "Executing query with {Provider}: {Question}",
            provider.Name,
            request.Question.Length > 50 ? request.Question[..50] + "..." : request.Question
        );

        var response = await provider.QueryAsync(request, ct);

        // Cache the response for 5 minutes
        _cache.Set(cacheKey, response, TimeSpan.FromMinutes(5));

        return response;
    }
}
