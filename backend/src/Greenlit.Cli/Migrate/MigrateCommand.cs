using System.CommandLine;
using System.CommandLine.Invocation;
using Greenlit.Cli.Database;
using Greenlit.Cli.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Greenlit.Cli.Migrate;

/// <summary>
/// <c>greenlit migrate</c>: applies pending EF Core migrations against the configured
/// database. Reuses <see cref="CliHostFactory"/> and <see cref="DbContextRegistrar"/>
/// so connection resolution and EF configuration come from the same code path as
/// <c>seed</c> and <c>reset</c>.
/// </summary>
public static class MigrateCommand
{
    public static Command Build(string[] args)
    {
        var cmd = new Command("migrate", "Apply pending EF Core migrations to the configured database.");
        cmd.SetHandler(async (InvocationContext ctx) =>
        {
            var database = new DatabaseOptions
            {
                Provider = ctx.ParseResult.GetValueForOption(GlobalOptions.Provider),
                ConnectionString = ctx.ParseResult.GetValueForOption(GlobalOptions.Connection),
            };
            var verbose = ctx.ParseResult.GetValueForOption(GlobalOptions.Verbose);

            using var host = CliHostFactory.Create(database, verbose, args).Build();
            using var scope = host.Services.CreateScope();
            var handler = scope.ServiceProvider.GetRequiredService<MigrateCommandHandler>();
            ctx.ExitCode = await handler.ExecuteAsync(ctx.GetCancellationToken());
        });
        return cmd;
    }
}
