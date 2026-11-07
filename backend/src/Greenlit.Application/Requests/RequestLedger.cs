using Greenlit.Application.Abstractions;
using Greenlit.Domain.Entities;
using Greenlit.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Requests;

/// <summary>
/// Keeps pending requests in step with the Requested days on the calendar
/// (docs/detailed-designs/sheet/mark-days, requests/send-request): days painted Requested join the
/// member's pending request for that run of days, or start one (L2-015 AC5); days that stop being
/// Requested leave theirs, and a request left with no days ends. A request spans from its first to
/// its last remaining day. A run is unbroken by weekends and holidays, so Friday and the next
/// Monday are one run. Works on tracked rows; the caller saves them in the same unit of work.
/// </summary>
internal sealed class RequestLedger
{
    private readonly IAppDbContext _db;
    private readonly TimeProvider _time;

    public RequestLedger(IAppDbContext db, TimeProvider time)
    {
        _db = db;
        _time = time;
    }

    public async Task ReconcileAsync(
        Guid teamId,
        Guid memberId,
        IReadOnlyList<TimeOffDay> joining,
        IReadOnlyList<(TimeOffDay Day, Guid RequestId)> leaving,
        CancellationToken ct)
    {
        if (joining.Count > 0) await JoinAsync(teamId, memberId, joining, ct);
        if (leaving.Count > 0) await LeaveAsync(leaving, ct);
    }

    private async Task JoinAsync(Guid teamId, Guid memberId, IReadOnlyList<TimeOffDay> joining, CancellationToken ct)
    {
        var dates = joining.Select(d => d.Date).OrderBy(d => d).ToList();
        var from = dates[0].AddDays(-RunGapLimit);
        var to = dates[^1].AddDays(RunGapLimit);
        var holidays = (await _db.Holidays.AsNoTracking()
                .Where(h => h.TeamId == teamId && h.Date >= from && h.Date <= to)
                .Select(h => h.Date)
                .ToListAsync(ct))
            .ToHashSet();
        var pending = await _db.TimeOffRequests
            .Where(r => r.TeamMemberId == memberId && r.Status == RequestStatus.Pending)
            .ToListAsync(ct);

        foreach (var day in joining.OrderBy(d => d.Date))
        {
            var before = WorkingNeighbour(day.Date, -1, holidays);
            var after = WorkingNeighbour(day.Date, 1, holidays);
            var request = pending.FirstOrDefault(r =>
                (day.Date >= r.FirstDay && day.Date <= r.LastDay)
                || (before >= r.FirstDay && before <= r.LastDay)
                || (after >= r.FirstDay && after <= r.LastDay));
            if (request is null)
            {
                request = new TimeOffRequest
                {
                    Id = Guid.NewGuid(),
                    TeamMemberId = memberId,
                    FirstDay = day.Date,
                    LastDay = day.Date,
                    Status = RequestStatus.Pending,
                    CreatedUtc = _time.GetUtcNow(),
                };
                _db.TimeOffRequests.Add(request);
                pending.Add(request);
            }
            else
            {
                if (day.Date < request.FirstDay) request.FirstDay = day.Date;
                if (day.Date > request.LastDay) request.LastDay = day.Date;
            }
            day.TimeOffRequestId = request.Id;
        }
    }

    private async Task LeaveAsync(IReadOnlyList<(TimeOffDay Day, Guid RequestId)> leaving, CancellationToken ct)
    {
        foreach (var (day, _) in leaving) day.TimeOffRequestId = null;

        var ids = leaving.Select(l => l.RequestId).Distinct().ToList();
        var requests = await _db.TimeOffRequests.Where(r => ids.Contains(r.Id)).ToListAsync(ct);
        // Loads the rest of those requests' days; rows already tracked keep their unsaved values.
        await _db.TimeOffDays.Where(d => d.TimeOffRequestId != null && ids.Contains(d.TimeOffRequestId.Value)).ToListAsync(ct);
        foreach (var request in requests)
        {
            var remaining = _db.TimeOffDays.Local.Where(d => d.TimeOffRequestId == request.Id).Select(d => d.Date).ToList();
            if (remaining.Count == 0)
            {
                _db.TimeOffRequests.Remove(request);
                continue;
            }
            request.FirstDay = remaining.Min();
            request.LastDay = remaining.Max();
        }
    }

    /// <summary>How far a run of weekends and holidays is followed to the next working day.</summary>
    private const int RunGapLimit = 14;

    /// <summary>The nearest working day before (-1) or after (+1) <paramref name="date"/>, skipping weekends and holidays.</summary>
    private static DateOnly WorkingNeighbour(DateOnly date, int step, IReadOnlySet<DateOnly> holidays)
    {
        var next = date.AddDays(step);
        for (var i = 0; i < RunGapLimit && (Sheet.WorkingDayRule.IsWeekend(next) || holidays.Contains(next)); i++)
            next = next.AddDays(step);
        return next;
    }
}
