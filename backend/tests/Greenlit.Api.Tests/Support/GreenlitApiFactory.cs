using Greenlit.Application.Abstractions;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Greenlit.Api.Tests.Support;

/// <summary>
/// Boots the API in-process against a per-fixture in-memory SQLite database.
/// The API creates the schema on startup; the database goes when the fixture is disposed.
/// </summary>
public class GreenlitApiFactory : WebApplicationFactory<Program>, IAsyncLifetime
{
    public const string Issuer = "greenlit-test";
    public const string Audience = "greenlit-test-clients";
    public const string SigningKey = "test-only-signing-key-must-be-at-least-32-bytes-long";

    public string DatabaseName { get; } = $"Greenlit_Api_{Guid.NewGuid():N}";

    /// <summary>A named shared-cache database: every DbContext the API opens reaches the same one.</summary>
    public string ConnectionString => $"Data Source={DatabaseName};Mode=Memory;Cache=Shared";

    /// <summary>An in-memory SQLite database lives as long as one connection to it is open.</summary>
    private SqliteConnection? _keepAlive;

    /// <summary>Every email the API sent, in place of a mail server.</summary>
    public RecordingEmailSender Emails { get; } = new();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<IEmailSender>();
            services.AddSingleton<IEmailSender>(Emails);
        });
        builder.ConfigureAppConfiguration((_, cfg) =>
        {
            cfg.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:Greenlit"] = ConnectionString,
                [Greenlit.Infrastructure.DependencyInjection.DatabaseProviderKey] = "Sqlite",
                ["Greenlit:Jwt:Issuer"] = Issuer,
                ["Greenlit:Jwt:Audience"] = Audience,
                ["Greenlit:Jwt:SigningKey"] = SigningKey,
                ["Greenlit:Jwt:AccessTokenMinutes"] = "15",
                ["Greenlit:App:Origin"] = "https://app.example.com",
                // Google is stood in for by the fake accounts reader (ADR-012); see FakeGoogle.
                ["Greenlit:Google:Accounts"] = "Fake",
                ["Greenlit:Google:ClientId"] = "test-client-id.apps.googleusercontent.com",
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
