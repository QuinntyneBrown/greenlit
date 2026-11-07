using Greenlit.Application.Abstractions;
using Greenlit.Domain.Entities;
using Greenlit.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Coverage;

/// <summary>
/// How many members are in on a working day (docs/detailed-designs/teams/coverage-minimum): the
/// team's members minus those out, a member being out on a day that is Requested or Confirmed.
/// A day is short when fewer are in than <see cref="Team.CoverageMinimum"/>; a minimum of 0 is
/// never short. Callers pass working days only, so weekends and holidays are never counted.
/// </summary>
internal static class CoverageCalculator
{
    /// <summary>The people in on each of <paramref name="dates"/>, as the database stands now.</summary>
    public static async Task<Dictionary<DateOnly, int>> InOnAsync(
        IAppDbContext db, Team team, IReadOnlyCollection<DateOnly> dates, CancellationToken ct)
    {
        var size = await db.TeamMembers.CountAsync(m => m.TeamId == team.Id, ct);
        var low = dates.Min();
        var high = dates.Max();
        var out_ = await db.TimeOffDays.AsNoTracking()
            .Where(d => d.TeamMember.TeamId == team.Id
                && d.Date >= low && d.Date <= high
                && (d.Status == DayStatus.Requested || d.Status == DayStatus.Confirmed))
            .GroupBy(d => d.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() })
            .ToListAsync(ct);
        var outByDate = out_.ToDictionary(x => x.Date, x => x.Count);
        return dates.Distinct().ToDictionary(d => d, d => size - outByDate.GetValueOrDefault(d));
    }

    /// <summary>The earliest of <paramref name="dates"/> with fewer people in than the minimum, or null.</summary>
    public static (DateOnly Date, int In)? FirstShort(
        Team team, IEnumerable<DateOnly> dates, IReadOnlyDictionary<DateOnly, int> inOn)
    {
        foreach (var date in dates.OrderBy(d => d))
        {
            if (inOn.TryGetValue(date, out var count) && count < team.CoverageMinimum) return (date, count);
        }
        return null;
    }
}
