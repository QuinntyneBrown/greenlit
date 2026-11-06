using System.CommandLine;
using System.CommandLine.Invocation;
using Greenlit.Cli.Database;
using Greenlit.Cli.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Greenlit.Cli.Seed;

/// <summary><c>greenlit seed</c>: idempotent development data (a demo team and its sheet).</summary>
public static class SeedCommand
{
    public static Command Build(string[] args)
    {
        var cmd = new Command("seed", "Seed the configured database with the demo team (idempotent).");
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
            var handler = scope.ServiceProvider.GetRequiredService<SeedCommandHandler>();
            ctx.ExitCode = await handler.ExecuteAsync(ctx.GetCancellationToken());
        });
        return cmd;
    }
}
