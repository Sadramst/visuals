// Appilico AI Query API - ASP.NET Core 8 Minimal API
// SWITCHING PROVIDERS IS JUST AN ENV VARIABLE

using Appilico.AIQueryApi.Models;
using Appilico.AIQueryApi.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Appilico AI Query API", Version = "v1" });
});

// Configure CORS for Power BI and React apps
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAppilico", policy =>
    {
        policy.WithOrigins(
            "https://app.powerbi.com",
            "https://*.powerbi.com",
            "http://localhost:3000",
            "http://localhost:5173"
        )
        .AllowAnyMethod()
        .AllowAnyHeader()
        .AllowCredentials();
    });
});

// Register AI providers based on configuration
builder.Services.AddMemoryCache();
builder.Services.AddHttpClient();

// Provider registration - SWITCHING IS JUST AN ENV VARIABLE
var aiProvider = builder.Configuration["AI:Provider"] ?? "mock";
builder.Services.AddSingleton<IAIProviderFactory, AIProviderFactory>();
builder.Services.AddScoped<IAIQueryService, AIQueryService>();

var app = builder.Build();

// Configure pipeline
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseHttpsRedirection();
app.UseCors("AllowAppilico");

// Health check endpoint
app.MapGet("/health", () => Results.Ok(new { status = "healthy", timestamp = DateTime.UtcNow }))
    .WithName("HealthCheck")
    .WithOpenApi();

// Query endpoint
app.MapPost("/api/query", async (AIQueryRequest request, IAIQueryService service) =>
{
    try
    {
        var response = await service.QueryAsync(request);
        return Results.Ok(response);
    }
    catch (Exception ex)
    {
        return Results.Problem(
            detail: ex.Message,
            statusCode: 500,
            title: "Query Failed"
        );
    }
})
.WithName("Query")
.WithOpenApi()
.Produces<AIQueryResponse>(200)
.Produces(500);

// Provider info endpoint
app.MapGet("/api/provider", (IAIProviderFactory factory) =>
{
    var provider = factory.GetProvider();
    return Results.Ok(new
    {
        name = provider.Name,
        isAvailable = provider.IsAvailable()
    });
})
.WithName("GetProvider")
.WithOpenApi();

app.Run();
