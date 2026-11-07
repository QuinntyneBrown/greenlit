using Greenlit.Application.Abstractions;
using Greenlit.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Infrastructure.Persistence;

public class AppDbContext : DbContext, IAppDbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<User> Users => Set<User>();
    public DbSet<Team> Teams => Set<Team>();
    public DbSet<TeamMember> TeamMembers => Set<TeamMember>();
    public DbSet<TimeOffDay> TimeOffDays => Set<TimeOffDay>();
    public DbSet<TimeOffRequest> TimeOffRequests => Set<TimeOffRequest>();
    public DbSet<Holiday> Holidays => Set<Holiday>();
    public DbSet<Invitation> Invitations => Set<Invitation>();

    public void DiscardChanges() => ChangeTracker.Clear();

    /// <summary>
    /// Creates the SQLite schema from the model when it does not exist yet. The
    /// migrations are SQL Server's, so SQLite (tests and the e2e API) gets the
    /// model's tables directly (ADR-020 in the reference project).
    /// </summary>
    public async Task EnsureSqliteSchemaAsync(CancellationToken cancellationToken = default)
    {
        if (!Database.IsSqlite())
            throw new InvalidOperationException("EnsureSqliteSchemaAsync is for the SQLite provider only.");
        await Database.EnsureCreatedAsync(cancellationToken);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
