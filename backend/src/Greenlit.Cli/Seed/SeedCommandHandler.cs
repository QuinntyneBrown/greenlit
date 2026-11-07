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

    /// <summary>The fewest people the mocks want in (notifications/request-toast/warning); set when the team is first seeded.</summary>
    public const int DemoCoverageMinimum = 4;

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

    /// <summary>
    /// Accounts on no team yet, for create-team (docs/detailed-designs/teams/create-team):
    /// Noor only opens the page; Priya, Sam and Tomás each create a team, one per e2e viewport.
    /// Uma, Vic and Wren each create a team for the invite-a-member spec (teams/invite-member), one per viewport,
    /// because a person invited to the demo team cannot be taken off it again.
    /// </summary>
    private static readonly (string Name, string Email, Guid UserId)[] Newcomers =
    [
        ("Noor Haddad", "noor@northwind.studio", Guid.Parse("0d6f1c1e-7a3b-4c51-9a10-000000000101")),
        ("Priya Shah", "priya@northwind.studio", Guid.Parse("0d6f1c1e-7a3b-4c51-9a10-000000000102")),
        ("Sam Lee", "sam@northwind.studio", Guid.Parse("0d6f1c1e-7a3b-4c51-9a10-000000000103")),
        ("Tomás Silva", "tomas@northwind.studio", Guid.Parse("0d6f1c1e-7a3b-4c51-9a10-000000000104")),
        ("Uma Singh", "uma@northwind.studio", Guid.Parse("0d6f1c1e-7a3b-4c51-9a10-000000000105")),
        ("Vic Alvarez", "vic@northwind.studio", Guid.Parse("0d6f1c1e-7a3b-4c51-9a10-000000000106")),
        ("Wren Fox", "wren@northwind.studio", Guid.Parse("0d6f1c1e-7a3b-4c51-9a10-000000000107")),
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

        foreach (var (name, email, userId) in Cast.Concat(Newcomers))
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
                CoverageMinimum = DemoCoverageMinimum,
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

        await SeedRequestsAsync(team, ct);

        var written = await _db.SaveChangesAsync(ct);
        _logger.LogInformation("Seed complete ({Rows} rows written).", written);
        return 0;
    }

    /// <summary>The note on Ana's request, as pages/requests/member shows it.</summary>
    private static readonly Dictionary<string, string> RequestNotes = new() { ["Ana Ruiz"] = "Visiting family in Seville" };

    /// <summary>
    /// The Requested days of November are each member's pending request, as the requests mocks show.
    /// Days that already belong to a request are left alone, so a second seed adds nothing.
    /// </summary>
    private async Task SeedRequestsAsync(Team team, CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        var memberIds = team.Members.Select(m => m.Id).ToList();
        var stored = await _db.TimeOffRequests.Where(r => memberIds.Contains(r.TeamMemberId)).ToListAsync(ct);
        foreach (var member in team.Members)
        {
            var open = _db.TimeOffDays.Local
                .Where(d => d.TeamMemberId == member.Id && d.Status == DayStatus.Requested && d.TimeOffRequestId is null)
                .OrderBy(d => d.Date)
                .ToList();
            if (open.Count == 0 || stored.Any(r => r.TeamMemberId == member.Id)) continue;
            var request = new TimeOffRequest
            {
                Id = Guid.NewGuid(),
                TeamMemberId = member.Id,
                FirstDay = open[0].Date,
                LastDay = open[^1].Date,
                Note = RequestNotes.GetValueOrDefault(member.Name),
                Status = RequestStatus.Pending,
                CreatedUtc = now,
            };
            _db.TimeOffRequests.Add(request);
            foreach (var day in open) day.TimeOffRequestId = request.Id;
        }
    }
}
