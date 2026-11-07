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

    /// <summary>Yearly days and the adjustment each person carries (docs/mocks/README.md, pages/year/default).</summary>
    private static readonly (string Member, int YearlyDays, int Adjustment, string Reason)[] Allowances =
    [
        ("Maya Chen", 25, 0, ""),
        ("Ana Ruiz", 25, 3, "Carried over from 2025"),
        ("Ben Okafor", 27, 2, "Long service"),
        ("Cleo Park", 25, 0, ""),
        ("Dev Patel", 20, 0, ""),
        ("Elif Yılmaz", 25, 0, ""),
        ("Finn Murphy", 22, 1, "Offsite Saturday"),
    ];

    /// <summary>The rest of Ana's 2026 as pages/person/default shows it, so her 17 used days leave 11 of 28.</summary>
    private static readonly (DateOnly First, DateOnly Last, DayStatus Status)[] AnaYear =
    [
        (new(2026, 1, 2), new(2026, 1, 2), DayStatus.Confirmed),
        (new(2026, 4, 7), new(2026, 4, 10), DayStatus.Confirmed),
        (new(2026, 7, 13), new(2026, 7, 17), DayStatus.Confirmed),
        (new(2026, 7, 20), new(2026, 7, 24), DayStatus.Confirmed),
        (new(2026, 12, 29), new(2026, 12, 31), DayStatus.Tentative),
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

        var team = await _db.Teams.IgnoreQueryFilters().Include(t => t.Members).Include(t => t.Holidays)
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

        team.HolidayCountry ??= "GB";

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
            AddDay(team, memberName, new DateOnly(2026, 11, day), status, now, existing);

        foreach (var (first, last, status) in AnaYear)
            for (var date = first; date <= last; date = date.AddDays(1))
                AddDay(team, "Ana Ruiz", date, status, now, existing);

        await SeedAllowancesAsync(team, now, ct);

        foreach (var (memberName, date) in WinterBreak) AddDay(team, memberName, date, DayStatus.Requested, now, existing);
        await SeedRequestsAsync(team, ct);
        await SeedHistoryAsync(team, now, ct);

        var written = await _db.SaveChangesAsync(ct);
        _logger.LogInformation("Seed complete ({Rows} rows written).", written);
        return 0;
    }

    /// <summary>
    /// Gives each person their yearly days when they have none, and their adjustment when it is not there yet
    /// (looked up by member and reason), so a second seed adds nothing and never overwrites an edit.
    /// </summary>
    private async Task SeedAllowancesAsync(Team team, DateTimeOffset now, CancellationToken ct)
    {
        var ids = team.Members.Select(m => m.Id).ToList();
        var stored = await _db.AllowanceAdjustments.Where(a => ids.Contains(a.TeamMemberId)).ToListAsync(ct);
        foreach (var (name, yearlyDays, adjustment, reason) in Allowances)
        {
            var member = team.Members.Single(m => m.Name == name);
            member.YearlyDays ??= yearlyDays;
            if (adjustment == 0 || stored.Any(a => a.TeamMemberId == member.Id && a.Reason == reason)) continue;
            _db.AllowanceAdjustments.Add(new AllowanceAdjustment
            {
                Id = Guid.NewGuid(),
                TeamMemberId = member.Id,
                Days = adjustment,
                Reason = reason,
                EffectiveDate = new DateOnly(2026, 1, 1),
                CreatedUtc = now,
            });
        }
    }

    /// <summary>The notes on the pending requests, as pages/requests/default shows them.</summary>
    private static readonly Dictionary<string, string> RequestNotes = new()
    {
        ["Ana Ruiz"] = "Visiting family in Seville",
        ["Cleo Park"] = "Long weekend away",
        ["Dev Patel"] = "Moving flat",
        ["Elif Yılmaz"] = "Winter break",
    };

    /// <summary>Elif's winter break is the fourth pending request of pages/requests/default.</summary>
    private static readonly (string Member, DateOnly Date)[] WinterBreak =
    [
        ("Elif Yılmaz", new(2026, 12, 29)), ("Elif Yılmaz", new(2026, 12, 30)), ("Elif Yılmaz", new(2026, 12, 31)),
    ];

    /// <summary>The requests already decided, as pages/requests/approved and declined show them.</summary>
    private sealed record Decided(
        string Member, DateOnly First, DateOnly Last, RequestStatus Status, string? Note,
        DateOnly Sent, DateOnly Decision, string? Reason, DayStatus? Days);

    private static readonly Decided[] History =
    [
        new("Finn Murphy", new(2026, 10, 19), new(2026, 10, 23), RequestStatus.Approved, "Half-term with my niece",
            new(2026, 9, 28), new(2026, 9, 29), null, DayStatus.Confirmed),
        new("Dev Patel", new(2026, 10, 12), new(2026, 10, 15), RequestStatus.Approved, null,
            new(2026, 9, 14), new(2026, 9, 15), null, DayStatus.Confirmed),
        new("Cleo Park", new(2026, 9, 7), new(2026, 9, 11), RequestStatus.Approved, "Wedding in Busan",
            new(2026, 6, 2), new(2026, 6, 2), null, DayStatus.Confirmed),
        new("Ben Okafor", new(2026, 12, 21), new(2026, 12, 24), RequestStatus.Declined, "Christmas",
            new(2026, 10, 30), new(2026, 11, 2), "Three people are already out that week. Could you take the 29th onward instead?", DayStatus.Tentative),
        new("Ana Ruiz", new(2026, 10, 5), new(2026, 10, 6), RequestStatus.Cancelled, "Short trip",
            new(2026, 9, 20), new(2026, 9, 25), null, null),
    ];

    /// <summary>
    /// The Requested days of November are each member's pending request, as the requests mocks show.
    /// Days that already belong to a request are left alone, so a second seed adds nothing.
    /// </summary>
    private async Task SeedRequestsAsync(Team team, CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow;
        foreach (var member in team.Members)
        {
            // One pending request per member for the Requested days that belong to none yet.
            var open = _db.TimeOffDays.Local
                .Where(d => d.TeamMemberId == member.Id && d.Status == DayStatus.Requested && d.TimeOffRequestId is null)
                .OrderBy(d => d.Date)
                .ToList();
            if (open.Count == 0) continue;
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

    private void AddDay(Team team, string memberName, DateOnly date, DayStatus status, DateTimeOffset now, List<TimeOffDay> existing)
    {
        var member = team.Members.Single(m => m.Name == memberName);
        if (existing.Any(d => d.TeamMemberId == member.Id && d.Date == date)) return;
        var day = new TimeOffDay
        {
            Id = Guid.NewGuid(),
            TeamMemberId = member.Id,
            Date = date,
            Status = status,
            UpdatedUtc = now,
            ConfirmedUtc = status == DayStatus.Confirmed ? now : null,
        };
        _db.TimeOffDays.Add(day);
        existing.Add(day);
    }

    /// <summary>
    /// The decided requests of the ledger. A request is looked up by member and first day, so a second seed
    /// adds nothing; an approved one confirms its working days and a declined one leaves them tentative.
    /// </summary>
    private async Task SeedHistoryAsync(Team team, DateTimeOffset now, CancellationToken ct)
    {
        var memberIds = team.Members.Select(m => m.Id).ToList();
        var stored = await _db.TimeOffRequests.Where(r => memberIds.Contains(r.TeamMemberId)).ToListAsync(ct);
        var days = await _db.TimeOffDays.Where(d => memberIds.Contains(d.TeamMemberId)).ToListAsync(ct);
        foreach (var h in History)
        {
            var member = team.Members.Single(m => m.Name == h.Member);
            if (stored.Any(r => r.TeamMemberId == member.Id && r.FirstDay == h.First)) continue;
            var request = new TimeOffRequest
            {
                Id = Guid.NewGuid(),
                TeamMemberId = member.Id,
                FirstDay = h.First,
                LastDay = h.Last,
                Note = h.Note,
                Status = h.Status,
                CreatedUtc = new DateTimeOffset(h.Sent.ToDateTime(new TimeOnly(9, 0)), TimeSpan.Zero),
                DecidedUtc = new DateTimeOffset(h.Decision.ToDateTime(new TimeOnly(9, 0)), TimeSpan.Zero),
                DeclineReason = h.Reason,
            };
            _db.TimeOffRequests.Add(request);
            if (h.Days is not { } status) continue;
            for (var date = h.First; date <= h.Last; date = date.AddDays(1))
            {
                if (date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday) continue;
                if (days.Any(d => d.TeamMemberId == member.Id && d.Date == date)) continue;
                _db.TimeOffDays.Add(new TimeOffDay
                {
                    Id = Guid.NewGuid(),
                    TeamMemberId = member.Id,
                    Date = date,
                    Status = status,
                    TimeOffRequestId = request.Id,
                    UpdatedUtc = now,
                    ConfirmedUtc = status == DayStatus.Confirmed ? now : null,
                });
            }
        }
    }
}
