using System.CommandLine;
using Greenlit.Cli.Hosting;
using Greenlit.Cli.Migrate;
using Greenlit.Cli.Reset;
using Greenlit.Cli.Seed;

namespace Greenlit.Cli;

public static class RootCommandFactory
{
    public static RootCommand Create(string[] args)
    {
        var root = new RootCommand("Greenlit CLI: database migration, seeding and reset for the team time-off app.");
        root.AddGlobalOption(GlobalOptions.Provider);
        root.AddGlobalOption(GlobalOptions.Connection);
        root.AddGlobalOption(GlobalOptions.Verbose);
        root.AddCommand(MigrateCommand.Build(args));
        root.AddCommand(SeedCommand.Build(args));
        root.AddCommand(ResetCommand.Build(args));
        return root;
    }
}
