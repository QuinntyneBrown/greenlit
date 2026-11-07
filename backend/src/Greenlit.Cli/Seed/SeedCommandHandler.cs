using Greenlit.Application.Abstractions;
using Greenlit.Domain.Entities;
using Greenlit.Domain.Enums;
using Greenlit.Infrastructure.Authentication;
using Greenlit.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Greenlit.Cli.Seed;

/// <summary>
/// Seeds the demo team: the mocks' cast (docs/mocks/README.md) with the UK
/// holidays and the November 2026 days of docs/mocks/pages/calendar/default.
/// Safe to re-run: every row is looked up by a stable key before it is
/// inserted, so a second run changes nothing.
/// </summary>
public sealed class SeedCommandHandler
{
    public const string DemoManagerEmail = "maya@northwind.studio";
    public const string DemoTeamName = "Design team";

    /// <summary>The password of every demo account (docs/detailed-designs/identity-and-access/sign-in).</summary>
    public const string DemoPassword = "greenlit-demo";

    /// <summary>Stable ids so the e2e fixture can sign in as the manager or a member.</summary>
    public static readonly Guid MayaUserId = Guid.Parse("0d6f1c1e-7a3b-4c51-9a10-000000000001");
    public static readonly Guid AnaUserId = Guid.Parse("0d6f1c1e-7a3b-4c51-9a10-000000000002");

    private static readonly (string Name, string Email, Guid UserId)[] Cast =
    [
        ("Maya Chen", DemoManagerEmail, MayaUserId),
        ("Ana Ruiz", "ana@northwind.studio", AnaUserId),
        ("Ben Okafor", "ben@northwind.studio", Guid.Parse("0d6f1c1e-7a3b-4c51-9a10-000000000003")),
        ("Cleo Park", "cleo@northwind.studio", Guid.Parse("0d6f1c1e-7a3b-4c51-9a10-000000000004")),
        ("Dev Patel", "dev@northwind.studio", Guid.Parse("0d6f1c1e-7a3b-4c51-9a10-000000000005")),
        ("Elif Yılmaz", "elif@northwind.studio", Guid.Parse("0d6f1c1e-7a3b-4c51-9a10-000000000006")),
        ("Finn Murphy", "finn@northwind.studio", Guid.Parse("0d6f1c1e-7a3b-4c51-9a10-000000000007")),
    ];

    /// <summary>Public holidays: United Kingdom, 2026 (docs/mocks/README.md).</summary>
    private static readonly (DateOnly Date, string Name)[] Holidays =
    [
        (new(2026, 1, 1), "New Year's Day"),
        (new(2026, 4, 3), "Good Friday"),
        (new(2026, 4, 6), "Easter Monday"),
        (new(2026, 5, 4), "Early May bank holiday"),
        (new(2026, 5, 25), "Spring bank holiday"),
        (new(2026, 8, 31), "Summer bank holiday"),
        (new(2026, 12, 25), "Christmas Day"),
        (new(2026, 12, 28), "Boxing Day (substitute)"),
    ];

    /// <summary>November 2026 as pages/calendar/default shows it.</summary>
    private static readonly (string Member, int Day, DayStatus Status)[] November =
    [
        ("Ana Ruiz", 4, DayStatus.Confirmed), ("Ana Ruiz", 5, DayStatus.Confirmed),
        ("Ana Ruiz", 16, DayStatus.Requested), ("Ana Ruiz", 17, DayStatus.Requested), ("Ana Ruiz", 18, DayStatus.Requested),
        ("Ana Ruiz", 19, DayStatus.Requested), ("Ana Ruiz", 20, DayStatus.Requested),
        ("Ben Okafor", 23, DayStatus.Tentative), ("Ben Okafor", 24, DayStatus.Tentative), ("Ben Okafor", 25, DayStatus.Tentative),
        ("Ben Okafor", 26, DayStatus.Tentative), ("Ben Okafor", 27, DayStatus.Tentative),
        ("Cleo Park", 12, DayStatus.Requested), ("Cleo Park", 13, DayStatus.Requested),
        ("Dev Patel", 18, DayStatus.Requested), ("Dev Patel", 19, DayStatus.Requested),
    ];

    /// <summary>What seeds before sign-in stored instead of a hash.</summary>
    private const string LegacyPlaceholder = "seed-placeholder";

    private readonly IPasswordHasher _hasher = new IdentityPasswordHasher();
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

        foreach (var (name, email, userId) in Cast)
        {
            var user = await _db.Users.SingleOrDefaultAsync(u => u.Id == userId, ct);
            if (user is null)
            {
                user = new User
                {
                    Id = userId,
                    Email = email,
                    DisplayName = name,
                    Role = userId == MayaUserId ? UserRole.Manager : UserRole.Member,
                    CreatedUtc = now,
                };
                _db.Users.Add(user);
            }

            // Earlier seeds stored a placeholder; a real hash someone set is left alone.
            if (string.IsNullOrEmpty(user.PasswordHash) || user.PasswordHash == LegacyPlaceholder)
                user.PasswordHash = _hasher.Hash(user, DemoPassword);
        }

        var team = await _db.Teams.Include(t => t.Members).Include(t => t.Holidays)
            .SingleOrDefaultAsync(t => t.ManagerUserId == MayaUserId && t.Name == DemoTeamName, ct);
        if (team is null)
        {
            team = new Team
            {
                Id = Guid.NewGuid(),
                Name = DemoTeamName,
                ManagerUserId = MayaUserId,
                TimeZone = "Europe/London",
                CreatedUtc = now,
            };
            _db.Teams.Add(team);
            _logger.LogInformation("Added {Team}.", DemoTeamName);
        }

        for (var order = 0; order < Cast.Length; order++)
        {
            var (name, email, userId) = Cast[order];
            if (team.Members.All(m => m.UserId != userId))
            {
                team.Members.Add(new TeamMember { Id = Guid.NewGuid(), Name = name, Email = email, UserId = userId, SortOrder = order });
            }
        }

        foreach (var (date, name) in Holidays)
        {
            if (team.Holidays.All(h => h.Date != date))
            {
                team.Holidays.Add(new Holiday { Id = Guid.NewGuid(), Date = date, Name = name });
            }
        }

        var memberIds = team.Members.Select(m => m.Id).ToList();
        var existing = await _db.TimeOffDays.Where(d => memberIds.Contains(d.TeamMemberId)).ToListAsync(ct);
        foreach (var (memberName, day, status) in November)
        {
            var member = team.Members.Single(m => m.Name == memberName);
            var date = new DateOnly(2026, 11, day);
            if (existing.Any(d => d.TeamMemberId == member.Id && d.Date == date)) continue;
            _db.TimeOffDays.Add(new TimeOffDay
            {
                Id = Guid.NewGuid(),
                TeamMemberId = member.Id,
                Date = date,
                Status = status,
                UpdatedUtc = now,
                ConfirmedUtc = status == DayStatus.Confirmed ? now : null,
            });
        }

        var written = await _db.SaveChangesAsync(ct);
        _logger.LogInformation("Seed complete ({Rows} rows written).", written);
        return 0;
    }
}
