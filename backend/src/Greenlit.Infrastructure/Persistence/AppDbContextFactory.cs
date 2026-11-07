using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Design;

namespace Greenlit.Infrastructure.Persistence;

/// <summary>
/// Lets <c>dotnet ef migrations add</c> build the context for SQL Server, whose migrations live
/// in this assembly. It never connects; the connection string only has to be well formed.
/// </summary>
public sealed class AppDbContextFactory : IDesignTimeDbContextFactory<AppDbContext>
{
    public AppDbContext CreateDbContext(string[] args)
    {
        var cs = Environment.GetEnvironmentVariable(DependencyInjection.ConnectionEnvironmentVariable)
            ?? "Server=(localdb)\\mssqllocaldb;Database=Greenlit;Trusted_Connection=True";
        var options = new DbContextOptionsBuilder<AppDbContext>()
            .UseSqlServer(cs, sql => sql.MigrationsAssembly(typeof(AppDbContext).Assembly.GetName().Name))
            .Options;
        return new AppDbContext(options);
    }
}
