using Greenlit.Application.Abstractions;
using Greenlit.Application.Sheet;
using Greenlit.Domain.Entities;
using Greenlit.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Allowances;

/// <summary>
/// One member's allowance for a leave year (L2-029). Left is Allowance - Used - Booked; Requested days are
/// counted separately and only make a member over when they take Left below zero (L2-030).
/// </summary>
public sealed record AllowanceFigures(
    int YearlyDays,
    int Adjustments,
    int Allowance,
    int Used,
    int Booked,
    int Requested,
    int Tentative,
    int Left)
{
    /// <summary>How many days the member's requests (and <paramref name="extra"/> more) exceed what they have left; 0 when they do not.</summary>
    public int DaysOver(int extra = 0) => Math.Max(0, Requested + extra - Left);

    /// <summary>The days the member can still request: Left minus what is already requested, never below zero.</summary>
    public int Available => Math.Max(0, Left - Requested);
}

/// <summary>
/// The single source of every allowance figure (ADR-007, docs/detailed-designs/allowances/allowance-figures):
/// computed on read from the members' days, the team's holidays and the members' adjustments, never stored.
/// </summary>
public sealed class AllowanceCalculator
{
    private readonly IAppDbContext _db;
    private readonly TimeProvider _time;

    public AllowanceCalculator(IAppDbContext db, TimeProvider time)
    {
        _db = db;
        _time = time;
    }

    /// <summary>Today in the team's time zone.</summary>
    public DateOnly Today(Team team)
    {
        var zone = TimeZoneInfo.FindSystemTimeZoneById(team.TimeZone);
        return DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(_time.GetUtcNow(), zone).DateTime);
    }

    /// <summary>The twelve months from the first of the team's start month that contain <paramref name="today"/>.</summary>
    public static (DateOnly First, DateOnly Last) LeaveYear(Team team, DateOnly today)
    {
        var first = new DateOnly(today.Year, team.LeaveYearStartMonth, 1);
        if (today < first) first = first.AddYears(-1);
        return (first, first.AddYears(1).AddDays(-1));
    }

    /// <summary>
    /// The figures of every member of <paramref name="team"/> in <paramref name="members"/>, for the leave year containing today,
    /// or, with <paramref name="leaveYear"/>, the leave year that starts in that calendar year (the year page).
    /// Used and Booked always split at today.
    /// </summary>
    public async Task<IReadOnlyDictionary<Guid, AllowanceFigures>> ComputeAsync(
        Team team, IReadOnlyCollection<TeamMember> members, CancellationToken ct, int? leaveYear = null)
    {
        var today = Today(team);
        var (first, last) = leaveYear is { } year
            ? LeaveYear(team, new DateOnly(year, team.LeaveYearStartMonth, 1))
            : LeaveYear(team, today);
        var ids = members.Select(m => m.Id).ToList();

        var holidays = (await _db.Holidays.AsNoTracking()
                .Where(h => h.TeamId == team.Id && h.Date >= first && h.Date <= last)
                .Select(h => h.Date)
                .ToListAsync(ct))
            .ToHashSet();
        var days = await _db.TimeOffDays.AsNoTracking()
            .Where(d => ids.Contains(d.TeamMemberId) && d.Date >= first && d.Date <= last)
            .Select(d => new { d.TeamMemberId, d.Date, d.Status })
            .ToListAsync(ct);
        var adjustments = (await _db.AllowanceAdjustments.AsNoTracking()
                .Where(a => ids.Contains(a.TeamMemberId) && a.EffectiveDate >= first && a.EffectiveDate <= last)
                .Select(a => new { a.TeamMemberId, a.Days })
                .ToListAsync(ct))
            .GroupBy(a => a.TeamMemberId)
            .ToDictionary(g => g.Key, g => g.Sum(a => a.Days));

        // L2-029 AC5: weekends, holidays and days the member does not work count in no figure.
        var worked = members.ToDictionary(m => m.Id, m => WorkingDayRule.For(team, m));
        var counted = days.Where(d => !WorkingDayRule.IsOffDay(d.Date, worked[d.TeamMemberId]) && !holidays.Contains(d.Date)).ToList();

        return members.ToDictionary(
            m => m.Id,
            m =>
            {
                var mine = counted.Where(d => d.TeamMemberId == m.Id).ToList();
                int Count(Func<DateOnly, DayStatus, bool> match) => mine.Count(d => match(d.Date, d.Status));
                var yearly = m.YearlyDays ?? team.DefaultYearlyDays;
                var adjusted = adjustments.GetValueOrDefault(m.Id);
                var used = Count((date, status) => status == DayStatus.Confirmed && date < today);
                var booked = Count((date, status) => status == DayStatus.Confirmed && date >= today);
                return new AllowanceFigures(
                    yearly,
                    adjusted,
                    yearly + adjusted,
                    used,
                    booked,
                    Count((_, status) => status == DayStatus.Requested),
                    Count((_, status) => status == DayStatus.Tentative),
                    yearly + adjusted - used - booked);
            });
    }
}
