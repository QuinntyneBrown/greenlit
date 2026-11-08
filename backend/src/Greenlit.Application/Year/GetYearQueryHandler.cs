using Greenlit.Application.SchoolCalendar;
using System.Globalization;
using Greenlit.Application.Abstractions;
using Greenlit.Application.Teams;
using Greenlit.Application.Allowances;
using Greenlit.Application.Exceptions;
using Greenlit.Application.Sheet;
using Greenlit.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Year;

/// <summary>
/// Builds the year for the caller's team (docs/detailed-designs/allowances/year-overview): the caller's own row
/// first, then the team in its order, each with twelve months of day statuses.
/// </summary>
public sealed class GetYearQueryHandler : IRequestHandler<GetYearQuery, YearDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly AllowanceCalculator _allowances;

    public GetYearQueryHandler(IAppDbContext db, ICurrentUser currentUser, AllowanceCalculator allowances)
    {
        _db = db;
        _currentUser = currentUser;
        _allowances = allowances;
    }

    public async Task<YearDto> Handle(GetYearQuery request, CancellationToken ct)
    {
        var userId = _currentUser.UserId ?? throw new NotFoundException("Team", "the signed-in user");
        var year = request.Year!.Value;

        var activeTeamId = await ActiveTeam.IdAsync(_db, _currentUser, ct);
        var team = await _db.Teams.AsNoTracking()
            .Include(t => t.Members)
            .Where(t => t.Id == activeTeamId && (t.ManagerUserId == userId || t.Members.Any(m => m.UserId == userId)))
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Team", "the signed-in user");

        var ordered = team.Members.OrderBy(m => m.SortOrder).ThenBy(m => m.Name).ToList();
        var own = ordered.FirstOrDefault(m => m.UserId == userId);
        if (own is not null)
        {
            ordered.Remove(own);
            ordered.Insert(0, own);
        }

        // One round trip each for the year's days and holidays (ADR-003).
        var first = new DateOnly(year, 1, 1);
        var last = new DateOnly(year, 12, 31);
        var memberIds = ordered.Select(m => m.Id).ToList();
        var statusOf = (await _db.TimeOffDays.AsNoTracking()
                .Where(d => memberIds.Contains(d.TeamMemberId) && d.Date >= first && d.Date <= last)
                .Select(d => new { d.TeamMemberId, d.Date, d.Status })
                .ToListAsync(ct))
            .ToDictionary(d => (d.TeamMemberId, d.Date), d => d.Status);
        var holidays = (await _db.Holidays.AsNoTracking()
                .Where(h => h.TeamId == team.Id && h.Date >= first && h.Date <= last)
                .Select(h => h.Date)
                .ToListAsync(ct))
            .ToHashSet();

        var figures = await _allowances.ComputeAsync(team, ordered, ct, leaveYear: year);

        var members = ordered
            .Select(m => new YearMemberDto(
                m.Id,
                m.Name,
                GetMonthQueryHandler.Initials(m.Name),
                m.UserId == userId,
                Enumerable.Range(1, 12).Select(month => MonthOf(year, month, m.Id, WorkingDayRule.For(team, m), holidays, statusOf)).ToList(),
                // A child has no allowance (L2-060 AC3).
                SchoolCalendarRules.IsChild(team, m) ? null : figures[m.Id],
                SchoolCalendarRules.IsChild(team, m)))
            .ToList();

        return new YearDto(year, team.ManagerUserId == userId, members);
    }

    private static YearMonthDto MonthOf(
        int year,
        int month,
        Guid memberId,
        WorkingDays workingDays,
        IReadOnlySet<DateOnly> holidays,
        IReadOnlyDictionary<(Guid, DateOnly), DayStatus> statusOf)
    {
        var days = Enumerable.Range(1, DateTime.DaysInMonth(year, month))
            .Select(day => new DateOnly(year, month, day))
            .Select(date =>
                holidays.Contains(date) || WorkingDayRule.IsOffDay(date, workingDays) ? "off"
                : !statusOf.TryGetValue((memberId, date), out var status) ? "empty"
                : status.ToString().ToLower(CultureInfo.InvariantCulture))
            .ToList();
        return new YearMonthDto(month, days.Count(d => d == "confirmed"), days);
    }
}
