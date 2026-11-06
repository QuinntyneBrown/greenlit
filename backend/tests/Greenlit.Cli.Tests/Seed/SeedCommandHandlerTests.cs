using FluentAssertions;
using Greenlit.Cli.Seed;
using Greenlit.Infrastructure.Persistence;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;

namespace Greenlit.Cli.Tests.Seed;

public class SeedCommandHandlerTests
{
    [Fact]
    public async Task Seeding_twice_leaves_one_demo_team()
    {
        await using var connection = new SqliteConnection("Data Source=:memory:");
        await connection.OpenAsync();
        var options = new DbContextOptionsBuilder<AppDbContext>().UseSqlite(connection).Options;

        await using (var db = new AppDbContext(options))
        {
            await db.EnsureSqliteSchemaAsync();
        }

        for (var i = 0; i < 2; i++)
        {
            await using var db = new AppDbContext(options);
            var exit = await new SeedCommandHandler(db, NullLogger<SeedCommandHandler>.Instance).ExecuteAsync(CancellationToken.None);
            exit.Should().Be(0);
        }

        await using var read = new AppDbContext(options);
        (await read.Teams.CountAsync()).Should().Be(1);
        (await read.Users.CountAsync(u => u.Email == SeedCommandHandler.DemoManagerEmail)).Should().Be(1);
        (await read.TeamMembers.CountAsync()).Should().Be(5);
    }
}
