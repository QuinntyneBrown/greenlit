using System.CommandLine;
using Greenlit.Cli;

return await RootCommandFactory.Create(args).InvokeAsync(args);
