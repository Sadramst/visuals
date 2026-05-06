// AI Provider Interface

using Appilico.AIQueryApi.Models;

namespace Appilico.AIQueryApi.Services;

/// <summary>
/// AI provider interface - implementations for different providers
/// </summary>
public interface IAIProvider
{
    string Name { get; }
    bool IsAvailable();
    Task<AIQueryResponse> QueryAsync(AIQueryRequest request, CancellationToken ct = default);
}

/// <summary>
/// Factory for creating AI providers based on configuration
/// SWITCHING PROVIDERS IS JUST AN ENV VARIABLE
/// </summary>
public interface IAIProviderFactory
{
    IAIProvider GetProvider();
}

/// <summary>
/// AI query service interface
/// </summary>
public interface IAIQueryService
{
    Task<AIQueryResponse> QueryAsync(AIQueryRequest request, CancellationToken ct = default);
}
