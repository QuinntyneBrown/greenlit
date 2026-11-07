using Greenlit.Application.Abstractions;
using Greenlit.Infrastructure.Authentication;
using Greenlit.Infrastructure.Holidays;
using Greenlit.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Greenlit.Infrastructure;

public static class DependencyInjection
{
    /// <summary>The environment variable that points the API and the CLI at the same database.</summary>
    public const string ConnectionEnvironmentVariable = "GREENLIT_CONNECTION";

    /// <summary>The configuration key that selects the database provider.</summary>
    public const string DatabaseProviderKey = "Greenlit:Database:Provider";

    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>((sp, opt) =>
        {
            var cfg = sp.GetRequiredService<IConfiguration>();
            var cs = Environment.GetEnvironmentVariable(ConnectionEnvironmentVariable)
                ?? cfg.GetConnectionString("Greenlit")
                ?? cfg["Greenlit:ConnectionString"]
                ?? throw new InvalidOperationException(
                    $"No connection string. Set {ConnectionEnvironmentVariable}, ConnectionStrings:Greenlit, or Greenlit:ConnectionString.");
            if (UsesSqlite(cfg))
                opt.UseSqlite(cs);
            else
                opt.UseSqlServer(cs, sql => sql.MigrationsAssembly(typeof(AppDbContext).Assembly.GetName().Name));
        });

        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDbContext>());

        // Signing key resolution: env var first (production), config section as
        // fallback for dev. The API warns at startup outside Development when the
        // placeholder is still in play.
        services.Configure<JwtOptions>(o =>
        {
            configuration.GetSection(JwtOptions.SectionName).Bind(o);
            var envKey = Environment.GetEnvironmentVariable("GREENLIT_JWT_SIGNING_KEY");
            if (!string.IsNullOrWhiteSpace(envKey)) o.SigningKey = envKey;
        });

        services.AddSingleton<IPasswordHasher, IdentityPasswordHasher>();
        services.AddSingleton<ITokenService, JwtTokenService>();
        services.AddSingleton<IPublicHolidayProvider, RuleBasedPublicHolidayProvider>();

        return services;
    }

    /// <summary>
    /// True when <see cref="DatabaseProviderKey"/> selects SQLite, the provider the API
    /// tests and the e2e API run on. SQL Server, when unset, is the only provider for
    /// development and production; any other value is a configuration error.
    /// </summary>
    public static bool UsesSqlite(IConfiguration configuration)
    {
        var provider = configuration[DatabaseProviderKey];
        if (string.IsNullOrWhiteSpace(provider) || provider.Equals("SqlServer", StringComparison.OrdinalIgnoreCase))
            return false;
        if (provider.Equals("Sqlite", StringComparison.OrdinalIgnoreCase))
            return true;
        throw new InvalidOperationException($"Unknown {DatabaseProviderKey} '{provider}'. Use SqlServer or Sqlite.");
    }
}
