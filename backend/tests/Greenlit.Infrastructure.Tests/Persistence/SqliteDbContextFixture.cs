using Greenlit.Infrastructure.Persistence;
using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Infrastructure.Tests.Persistence;

/// <summary>
/// One in-memory SQLite database per fixture; the schema comes from the model.
/// Tests never need a database server.
/// </summary>
public sealed class SqliteDbContextFixture : IAsyncLifetime
{
    private readonly SqliteConnection _connection = new("Data Source=:memory:");

    public AppDbContext CreateContext()
        => new(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);

    public async Task InitializeAsync()
    {
        await _connection.OpenAsync();
        await using var db = CreateContext();
        await db.EnsureSqliteSchemaAsync();
    }

    public async Task DisposeAsync() => await _connection.DisposeAsync();
}
