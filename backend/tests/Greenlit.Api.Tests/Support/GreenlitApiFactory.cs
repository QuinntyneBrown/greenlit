using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;

namespace Greenlit.Api.Tests.Support;

/// <summary>
/// Boots the API in-process against a per-fixture in-memory SQLite database.
/// The API creates the schema on startup; the database goes when the fixture is disposed.
/// </summary>
public class GreenlitApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    public string DatabaseName { get; } = $"Greenlit_Api_{Guid.NewGuid():N}";

    /// <summary>A named shared-cache database: every DbContext the API opens reaches the same one.</summary>
    public string ConnectionString => $"Data Source={DatabaseName};Mode=Memory;Cache=Shared";

    /// <summary>An in-memory SQLite database lives as long as one connection to it is open.</summary>
    private SqliteConnection? _keepAlive;

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, cfg) =>
        {
            cfg.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Greenlit"] = ConnectionString,
                [Greenlit.Infrastructure.DependencyInjection.DatabaseProviderKey] = "Sqlite",
                ["Greenlit:Jwt:Issuer"] = "greenlit-test",
                ["Greenlit:Jwt:Audience"] = "greenlit-test-clients",
                ["Greenlit:Jwt:SigningKey"] = "test-only-signing-key-must-be-at-least-32-bytes-long",
                ["Greenlit:Jwt:AccessTokenMinutes"] = "15",
                ["Greenlit:App:Origin"] = "https://app.example.com",
            });
        });
    }

    public async Task InitializeAsync()
    {
        _keepAlive = new SqliteConnection(ConnectionString);
        await _keepAlive.OpenAsync();
        // Building the host creates the schema.
        _ = Services;
    }

    async Task IAsyncLifetime.DisposeAsync()
    {
        await base.DisposeAsync();
        if (_keepAlive is not null) await _keepAlive.DisposeAsync();
    }
}
