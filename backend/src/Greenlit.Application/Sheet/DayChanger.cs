using System.Globalization;
using Greenlit.Application.Abstractions;
using Greenlit.Application.Allowances;
using Greenlit.Application.Exceptions;
using Greenlit.Application.Requests;
using Greenlit.Domain.Entities;
using Greenlit.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Sheet;

/// <summary>
/// Applies a set of target statuses to one member's row for the caller
/// (docs/detailed-designs/sheet/mark-days): finds the caller's team, drops
/// non-working dates, runs <see cref="DayChangePolicy"/> on each day and saves
/// the result in one unit of work. Shared by a stroke and by Undo.
/// </summary>
internal sealed class DayChanger
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly TimeProvider _time;
    private readonly RequestLedger _ledger;
    private readonly AllowanceCalculator _allowances;

    public DayChanger(IAppDbContext db, ICurrentUser currentUser, TimeProvider time)
    {
        _db = db;
        _currentUser = currentUser;
        _time = time;
        _ledger = new RequestLedger(db, time);
        _allowances = new AllowanceCalculator(db, time);
    }

    /// <param name="targets">Date and the status it should end up with (null: a working day).</param>
    /// <param name="status">The stroke's single status, echoed in the result; null for Clear and for Undo.</param>
    public async Task<ChangeSetDto> ApplyAsync(
        Guid memberId, IReadOnlyList<(DateOnly Date, DayStatus? Target)> targets, DayStatus? status, CancellationToken ct)
    {
        var userId = _currentUser.UserId ?? throw new NotFoundException("Team", "the signed-in user");

        var team = await _db.Teams.AsNoTracking()
            .Include(t => t.Members)
            .Where(t => t.ManagerUserId == userId || t.Members.Any(m => m.UserId == userId))
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Team", "the signed-in user");

        // A row outside the caller's team answers like an unknown one: nothing about other teams leaks.
        var member = team.Members.FirstOrDefault(m => m.Id == memberId)
            ?? throw new NotFoundException("Member", memberId.ToString());

        var isManager = team.ManagerUserId == userId;
        if (!DayChangePolicy.MayEditRow(isManager, userId, member.UserId))
            throw new ForbiddenException("not_your_row", "You can only change your own days.");

        var dates = targets.Select(t => t.Date).Distinct().ToList();
        var holidays = (await _db.Holidays.AsNoTracking()
                .Where(h => h.TeamId == team.Id && dates.Contains(h.Date))
                .Select(h => h.Date)
                .ToListAsync(ct))
            .ToHashSet();
        var working = targets
            .DistinctBy(t => t.Date)
            .Where(t => !WorkingDayRule.IsOffDay(t.Date, WorkingDayRule.For(team, member)) && !holidays.Contains(t.Date))
            .ToList();
        if (working.Count == 0)
        {
            // ADR-003: a day on a holiday is rejected as such; a stroke of only weekends is just non-working.
            var allHolidays = dates.All(holidays.Contains);
            throw new BadRequestException(
                allHolidays ? "day_is_holiday" : "all_non_working",
                allHolidays ? "Those days are holidays." : "Weekends and holidays are red by rule, so nothing changed.");
        }

        var workingDates = working.Select(t => t.Date).ToList();
        var existing = await _db.TimeOffDays
            .Where(d => d.TeamMemberId == member.Id && workingDates.Contains(d.Date))
            .ToDictionaryAsync(d => d.Date, ct);

        var now = _time.GetUtcNow();
        var changes = new List<DayChangeDto>();
        var locked = 0;
        var joining = new List<TimeOffDay>();
        var leaving = new List<(TimeOffDay Day, Guid RequestId)>();
        foreach (var (date, target) in working.OrderBy(t => t.Date))
        {
            existing.TryGetValue(date, out var row);
            DayStatus? current = row?.Status;
            if (current == target) continue;
            if (!DayChangePolicy.MayChange(isManager, current, target))
            {
                locked++;
                continue;
            }

            // A day leaving Requested leaves its pending request (RequestLedger).
            if (current == DayStatus.Requested && row!.TimeOffRequestId is { } requestId)
                leaving.Add((row, requestId));

            if (target is null)
            {
                _db.TimeOffDays.Remove(row!);
            }
            else if (row is null)
            {
                row = new TimeOffDay
                {
                    Id = Guid.NewGuid(),
                    TeamMemberId = member.Id,
                    Date = date,
                    Status = target.Value,
                    UpdatedUtc = now,
                    ConfirmedUtc = target == DayStatus.Confirmed ? now : null,
                };
                _db.TimeOffDays.Add(row);
            }
            else
            {
                row.Status = target.Value;
                row.UpdatedUtc = now;
                row.ConfirmedUtc = target == DayStatus.Confirmed ? now : null;
            }

            if (target == DayStatus.Requested) joining.Add(row!);

            changes.Add(new DayChangeDto(date.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture), current, target));
        }

        if (changes.Count == 0 && locked > 0)
            throw new ForbiddenException("confirmed_locked", "Confirmed days can only be changed by the manager.");

        await _ledger.ReconcileAsync(team.Id, member.Id, joining, leaving, ct);
        await _db.SaveChangesAsync(ct);
        var figures = (await _allowances.ComputeAsync(team, [member], ct))[member.Id];
        return new ChangeSetDto(member.Id, member.Name, status, changes, figures.DaysOver());
    }
}
