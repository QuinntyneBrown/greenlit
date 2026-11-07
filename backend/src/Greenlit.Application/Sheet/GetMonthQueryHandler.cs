using System.Globalization;
using Greenlit.Application.Abstractions;
using Greenlit.Application.Allowances;
using Greenlit.Application.Exceptions;
using Greenlit.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Sheet;

/// <summary>
/// Builds the month for the caller's team (docs/detailed-designs/sheet/view-month):
/// the manager sees the team in its order; a member sees their own row first.
/// </summary>
public sealed class GetMonthQueryHandler : IRequestHandler<GetMonthQuery, MonthDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly TimeProvider _time;
    private readonly AllowanceCalculator _allowances;

    public GetMonthQueryHandler(IAppDbContext db, ICurrentUser currentUser, TimeProvider time, AllowanceCalculator allowances)
    {
        _db = db;
        _currentUser = currentUser;
        _time = time;
        _allowances = allowances;
    }

    public async Task<MonthDto> Handle(GetMonthQuery request, CancellationToken ct)
    {
        var userId = _currentUser.UserId ?? throw new NotFoundException("Team", "the signed-in user");

        var team = await _db.Teams.AsNoTracking()
            .Include(t => t.Members)
            .Where(t => t.ManagerUserId == userId || t.Members.Any(m => m.UserId == userId))
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Team", "the signed-in user");

        var today = TodayIn(team.TimeZone);
        var month = request.Month is null
            ? new DateOnly(today.Year, today.Month, 1)
            : DateOnly.ParseExact(request.Month + "-01", "yyyy-MM-dd", CultureInfo.InvariantCulture);

        var isManager = team.ManagerUserId == userId;
        var managerName = team.Members.FirstOrDefault(m => m.UserId == team.ManagerUserId)?.Name
            ?? await _db.Users.AsNoTracking().Where(u => u.Id == team.ManagerUserId).Select(u => u.DisplayName).FirstAsync(ct);
        var ordered = team.Members.OrderBy(m => m.SortOrder).ThenBy(m => m.Name).ToList();
        if (!isManager)
        {
            // L2-012 AC2: a member's own row comes first.
            var own = ordered.FirstOrDefault(m => m.UserId == userId);
            if (own is not null)
            {
                ordered.Remove(own);
                ordered.Insert(0, own);
            }
        }

        // One round trip each for the month's days and holidays (ADR-003).
        var last = month.AddMonths(1).AddDays(-1);
        var memberIds = ordered.Select(m => m.Id).ToList();
        var stored = await _db.TimeOffDays.AsNoTracking()
            .Where(d => memberIds.Contains(d.TeamMemberId) && d.Date >= month && d.Date <= last)
            .ToListAsync(ct);
        var holidays = await _db.Holidays.AsNoTracking()
            .Where(h => h.TeamId == team.Id && h.Date >= month && h.Date <= last)
            .ToDictionaryAsync(h => h.Date, h => h.Name, ct);
        var statusOf = stored.ToDictionary(d => (d.TeamMemberId, d.Date), d => d.Status);

        var figures = await _allowances.ComputeAsync(team, ordered, ct);
        var dates = Enumerable.Range(0, last.Day).Select(month.AddDays).ToList();

        var members = ordered
            .Select(m => new MemberRowDto(
                m.Id, m.Name, Initials(m.Name), m.UserId == userId, figures[m.Id].Left, figures[m.Id],
                dates.Select(date => CellFor(m.Id, date, holidays, statusOf, team.WorkingDays)).ToList()))
            .ToList();

        // L2-014 AC2: on each day the team works, who is out (requested or confirmed) and who is in.
        var coverage = dates
            .Where(date => !WorkingDayRule.IsOffDay(date, team.WorkingDays) && !holidays.ContainsKey(date))
            .Select(date =>
            {
                var kinds = members.Select(m => m.Cells[date.Day - 1].Kind).ToList();
                var outCount = kinds.Count(k => k is CellKind.Requested or CellKind.Confirmed);
                var inCount = kinds.Count(k => k is CellKind.Working or CellKind.Tentative);
                return new CoverageDto(Iso(date), outCount, inCount, BelowMinimum: false);
            })
            .ToList();

        return new MonthDto(
            month.ToString("yyyy-MM", CultureInfo.InvariantCulture),
            Iso(today),
            isManager,
            managerName,
            CoverageMinimum: null,
            members,
            coverage);
    }

    internal static CellDto CellFor(
        Guid memberId,
        DateOnly date,
        IReadOnlyDictionary<DateOnly, string> holidays,
        IReadOnlyDictionary<(Guid, DateOnly), DayStatus> statusOf,
        WorkingDays workingDays)
    {
        if (holidays.TryGetValue(date, out var holiday)) return new CellDto(Iso(date), CellKind.Holiday, holiday);
        if (WorkingDayRule.IsOffDay(date, workingDays)) return new CellDto(Iso(date), CellKind.NotWorking, null);
        if (!statusOf.TryGetValue((memberId, date), out var status)) return new CellDto(Iso(date), CellKind.Working, null);
        var kind = status switch
        {
            DayStatus.Tentative => CellKind.Tentative,
            DayStatus.Requested => CellKind.Requested,
            DayStatus.Confirmed => CellKind.Confirmed,
            _ => throw new ArgumentOutOfRangeException(nameof(statusOf), status, "Unknown day status."),
        };
        return new CellDto(Iso(date), kind, null);
    }

    private static string Iso(DateOnly date) => date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);

    private DateOnly TodayIn(string timeZone)
    {
        var zone = TimeZoneInfo.FindSystemTimeZoneById(timeZone);
        return DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(_time.GetUtcNow(), zone).DateTime);
    }

    /// <summary>First letters of the first and last names: "Elif Yılmaz" is "EY".</summary>
    internal static string Initials(string name)
    {
        var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0) return string.Empty;
        var first = parts[0][..1];
        var last = parts.Length > 1 ? parts[^1][..1] : string.Empty;
        return (first + last).ToUpper(CultureInfo.InvariantCulture);
    }
}
