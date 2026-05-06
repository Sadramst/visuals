// AI Query API - Data Models

namespace Appilico.AIQueryApi.Models;

/// <summary>
/// AI query request model
/// </summary>
public record AIQueryRequest
{
    /// <summary>Natural language question</summary>
    public required string Question { get; init; }
    
    /// <summary>Optional context (dashboard state, selected filters)</summary>
    public string? Context { get; init; }
    
    /// <summary>Optional conversation history for multi-turn</summary>
    public List<ConversationMessage>? ConversationHistory { get; init; }
}

/// <summary>
/// Conversation message for multi-turn context
/// </summary>
public record ConversationMessage
{
    public required string Role { get; init; }
    public required string Content { get; init; }
}

/// <summary>
/// AI query response model
/// </summary>
public record AIQueryResponse
{
    /// <summary>Unique response ID</summary>
    public required string Id { get; init; }
    
    /// <summary>Original question</summary>
    public required string Question { get; init; }
    
    /// <summary>AI-generated answer</summary>
    public required string Answer { get; init; }
    
    /// <summary>Confidence score (0-1)</summary>
    public double Confidence { get; init; }
    
    /// <summary>Data sources referenced</summary>
    public List<string> Sources { get; init; } = new();
    
    /// <summary>Response timestamp</summary>
    public DateTime Timestamp { get; init; } = DateTime.UtcNow;
    
    /// <summary>Tokens used for billing</summary>
    public int? TokensUsed { get; init; }
}
