using Greenlit.Domain.Entities;
using Greenlit.Domain.Enums;
using Greenlit.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Greenlit.Cli.Seed;

/// <summary>
/// Seeds the demo team. Safe to re-run: every row is looked up by a stable key
/// before it is inserted, so a second run changes nothing.
/// </summary>
public sealed class SeedCommandHandler
{
    public const string DemoManagerEmail = "manager@greenlit.local";
    public const string DemoTeamName = "Demo team";

    private static readonly string[] DemoMembers = ["Alex", "Blake", "Casey", "Devon", "Emerson"];

    private readonly AppDbContext _db;
    private readonly ILogger<SeedCommandHandler> _logger;

    public SeedCommandHandler(AppDbContext db, ILogger<SeedCommandHandler> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<int> ExecuteAsync(CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;

        var manager = await _db.Users.SingleOrDefaultAsync(u => u.Email == DemoManagerEmail, ct);
        if (manager is null)
        {
            manager = new User
            {
                Id = Guid.NewGuid(),
                Email = DemoManagerEmail,
                DisplayName = "Demo manager",
                // Not a usable credential: the password flow sets a real hash when it lands.
                PasswordHash = "seed-placeholder",
                Role = UserRole.Manager,
                CreatedUtc = now,
            };
            _db.Users.Add(manager);
            _logger.LogInformation("Added demo manager {Email}.", DemoManagerEmail);
        }

        var team = await _db.Teams.Include(t => t.Members)
            .SingleOrDefaultAsync(t => t.ManagerUserId == manager.Id && t.Name == DemoTeamName, ct);
        if (team is null)
        {
            team = new Team
            {
                Id = Guid.NewGuid(),
                Name = DemoTeamName,
                ManagerUserId = manager.Id,
                TimeZone = "America/Toronto",
                CreatedUtc = now,
            };
            _db.Teams.Add(team);
            _logger.LogInformation("Added {Team}.", DemoTeamName);
        }

        var order = 0;
        foreach (var name in DemoMembers)
        {
            if (team.Members.All(m => m.Name != name))
            {
                team.Members.Add(new TeamMember { Id = Guid.NewGuid(), Name = name, SortOrder = order });
            }
            order++;
        }

        var written = await _db.SaveChangesAsync(ct);
        _logger.LogInformation("Seed complete ({Rows} rows written).", written);
        return 0;
    }
}
