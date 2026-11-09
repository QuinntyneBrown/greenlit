using Greenlit.Application.Abstractions;
using Greenlit.Domain.Entities;
using Greenlit.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Sheet;

/// <summary>
/// Keeps a person's synced days in step across their teams (L2-064, ADR-016, docs/detailed-designs/sheet/mark-days).
/// For each date, a live row of the person holds a synced day exactly when it holds no day of its own there, the date is
/// a working day for that row, and another live row of the person holds a day of its own on that date. Works on tracked
/// rows, so it sees the caller's unsaved changes; the caller saves them in the same unit of work.
/// </summary>
internal static class DaySync
{
    public static async Task ReconcileAsync(
        IAppDbContext db, Guid? userId, IReadOnlyCollection<DateOnly> dates, DateTimeOffset now, CancellationToken ct)
    {
        // A login-less row has nobody behind it to sync (L2-064 AC7).
        if (userId is null || dates.Count == 0) return;

        // The query filter leaves out removed rows: they neither give nor receive synced days (ADR-016).
        // A row the caller has just attached to the account (joining, L2-064 AC8) counts before it is saved.
        var stored = await db.TeamMembers.AsNoTracking().Where(m => m.UserId == userId).ToListAsync(ct);
        var tracked = db.TeamMembers.Local.Where(m => m.UserId == userId && m.RemovedUtc == null).ToList();
        var rows = tracked.Concat(stored.Where(m => tracked.All(t => t.Id != m.Id))).ToList();
        if (rows.Count < 2) return;

        var rowIds = rows.Select(r => r.Id).ToList();
        var teamIds = rows.Select(r => r.TeamId).Distinct().ToList();
        var teams = await db.Teams.AsNoTracking().Where(t => teamIds.Contains(t.Id)).ToDictionaryAsync(t => t.Id, ct);
        var dateList = dates.Distinct().ToList();
        var holidays = (await db.Holidays.AsNoTracking()
                .Where(h => teamIds.Contains(h.TeamId) && dateList.Contains(h.Date))
                .Select(h => new { h.TeamId, h.Date })
                .ToListAsync(ct))
            .Select(h => (h.TeamId, h.Date))
            .ToHashSet();
        // A holiday the caller is adding or restoring in this unit of work is red already (L2-064 AC6).
        foreach (var h in db.Holidays.Local.Where(h => h.RemovedUtc == null && teamIds.Contains(h.TeamId) && dateList.Contains(h.Date)))
            holidays.Add((h.TeamId, h.Date));

        // Loads the days into the tracker; rows already tracked keep their unsaved values, deleted ones stay out of Local.
        await db.TimeOffDays.Where(d => rowIds.Contains(d.TeamMemberId) && dateList.Contains(d.Date)).LoadAsync(ct);
        var days = db.TimeOffDays.Local
            .Where(d => rowIds.Contains(d.TeamMemberId) && dateList.Contains(d.Date))
            .ToList();

        foreach (var date in dateList)
        {
            var onDate = days.Where(d => d.Date == date).ToList();
            foreach (var row in rows)
            {
                var mine = onDate.FirstOrDefault(d => d.TeamMemberId == row.Id);
                if (mine is { IsSynced: false }) continue;

                var bookedElsewhere = onDate.Any(d => d.TeamMemberId != row.Id && !d.IsSynced);
                var working = !WorkingDayRule.IsOffDay(date, WorkingDayRule.For(teams[row.TeamId], row))
                    && !holidays.Contains((row.TeamId, date));
                var wanted = bookedElsewhere && working;

                if (mine is not null && !wanted)
                {
                    db.TimeOffDays.Remove(mine);
                }
                else if (mine is null && wanted)
                {
                    db.TimeOffDays.Add(new TimeOffDay
                    {
                        Id = Guid.NewGuid(),
                        TeamMemberId = row.Id,
                        Date = date,
                        Status = DayStatus.Tentative,
                        IsSynced = true,
                        UpdatedUtc = now,
                    });
                }
            }
        }
    }
}
