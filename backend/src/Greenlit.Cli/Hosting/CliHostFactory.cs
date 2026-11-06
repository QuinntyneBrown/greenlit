using Greenlit.Cli.Database;
using Greenlit.Cli.Migrate;
using Greenlit.Cli.Reset;
using Greenlit.Cli.Seed;
using Greenlit.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Greenlit.Cli.Hosting;

public static class CliHostFactory
{
    public static IHostBuilder Create(DatabaseOptions database, bool verbose, string[] args)
    {
        return Host.CreateDefaultBuilder(args)
            .ConfigureAppConfiguration(cfg =>
            {
                cfg.SetBasePath(AppContext.BaseDirectory);
                cfg.AddJsonFile("appsettings.json", optional: true);
                cfg.AddEnvironmentVariables(prefix: "GREENLIT_");
                cfg.AddEnvironmentVariables();
                cfg.AddCommandLine(args);
            })
            .ConfigureLogging((ctx, log) =>
            {
                log.ClearProviders();
                log.AddSimpleConsole(o =>
                {
                    o.SingleLine = true;
                    o.TimestampFormat = "HH:mm:ss ";
                });
                log.SetMinimumLevel(verbose ? LogLevel.Debug : LogLevel.Information);
                log.AddFilter("Microsoft.EntityFrameworkCore", verbose ? LogLevel.Information : LogLevel.Warning);
            })
            .ConfigureServices((ctx, services) =>
            {
                ResolveConnection(database, ctx.Configuration);
                services.AddSingleton(database);
                services.AddSingleton<IDbContextRegistrar, DbContextRegistrar>();
                services.AddDbContext<AppDbContext>((sp, opt) =>
                {
                    var registrar = sp.GetRequiredService<IDbContextRegistrar>();
                    var opts = sp.GetRequiredService<DatabaseOptions>();
                    registrar.Configure(opt, opts);
                });

                services.AddScoped<SeedCommandHandler>();
                services.AddScoped<MigrateCommandHandler>();
                services.AddScoped<ResetCommandHandler>();
            });
    }

    /// <summary>
    /// Precedence mirrors the API host: explicit flag, then GREENLIT_CONNECTION,
    /// then configuration. Blank values never win: an empty
    /// <c>ConnectionStrings:Greenlit</c> in appsettings must not hide the env var.
    /// </summary>
    internal static void ResolveConnection(DatabaseOptions database, IConfiguration configuration)
    {
        if (!string.IsNullOrWhiteSpace(database.ConnectionString))
            return;

        var candidates = new[]
        {
            Environment.GetEnvironmentVariable(Greenlit.Infrastructure.DependencyInjection.ConnectionEnvironmentVariable),
            configuration.GetConnectionString("Greenlit"),
            configuration["Greenlit:ConnectionString"],
        };
        var resolved = candidates.FirstOrDefault(v => !string.IsNullOrWhiteSpace(v));

        if (resolved is not null)
        {
            database.ConnectionString = resolved;
            return;
        }

        if (database.Provider == DatabaseProvider.Sqlite)
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            if (string.IsNullOrWhiteSpace(appData))
                appData = Path.Combine(
                    Environment.GetFolderPath(Environment.SpecialFolder.UserProfile),
                    ".config");

            var dir = Path.Combine(appData, "greenlit");
            Directory.CreateDirectory(dir);
            database.ConnectionString = $"Data Source={Path.Combine(dir, "greenlit.db")}";
        }
    }
}
