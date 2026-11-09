using Greenlit.Application.Sheet;
using Greenlit.Application.Abstractions;
using Greenlit.Application.Exceptions;
using Greenlit.Domain.Entities;
using Greenlit.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Requests;

/// <summary>
/// Creates a pending request for the caller's own row and marks its working days Requested in one
/// unit of work (L2-019, docs/detailed-designs/requests/send-request). Weekends and holidays are
/// not counted (AC7); Tentative days in the range are taken over; days that are already Requested
/// or Confirmed refuse the whole request with <c>days_taken</c>, so nothing is half-sent.
/// </summary>
public sealed class SendRequestCommandHandler : IRequestHandler<SendRequestCommand, RequestDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly TimeProvider _time;
    private readonly RequestNotifier _notifier;

    public SendRequestCommandHandler(IAppDbContext db, ICurrentUser currentUser, TimeProvider time, RequestNotifier notifier)
    {
        _db = db;
        _currentUser = currentUser;
        _time = time;
        _notifier = notifier;
    }

    public async Task<RequestDto> Handle(SendRequestCommand command, CancellationToken ct)
    {
        var (team, member) = await RequestCaller.FindAsync(_db, _currentUser, ct);
        var (first, last) = RequestInput.Range(command.FirstDay!, command.LastDay!);

        var (working, allHolidays) = await RequestCaller.WorkingDaysAsync(_db, team.Id, WorkingDayRule.For(team, member), first, last, ct);
        if (working.Count == 0)
        {
            // ADR-003: a range of holidays is rejected as such; weekends alone are just non-working.
            throw new BadRequestException(
                allHolidays ? "day_is_holiday" : "all_non_working",
                allHolidays ? "Those days are holidays." : "Weekends and holidays aren’t counted, so there is nothing to request.");
        }

        var existing = await _db.TimeOffDays
            .Where(d => d.TeamMemberId == member.Id && working.Contains(d.Date))
            .ToDictionaryAsync(d => d.Date, ct);
        // Synced days are skipped like holidays; a range of only synced days asks for nothing (L2-064 AC3, ADR-016).
        if (existing.Values.Any(d => d.IsSynced))
        {
            working = working.Where(date => !(existing.TryGetValue(date, out var day) && day.IsSynced)).ToList();
            if (working.Count == 0) throw new ForbiddenException(DayChanger.SyncedDayLocked, DayChanger.SyncedDayLockedMessage);
        }
        if (existing.Values.Any(d => d.Status is DayStatus.Requested or DayStatus.Confirmed))
            throw new ConflictException("days_taken", "Some of those days are already requested or confirmed.");

        var now = _time.GetUtcNow();
        var note = string.IsNullOrWhiteSpace(command.Note) ? null : command.Note.Trim();
        var request = new TimeOffRequest
        {
            Id = Guid.NewGuid(),
            TeamMemberId = member.Id,
            FirstDay = working[0],
            LastDay = working[^1],
            Note = note,
            Status = RequestStatus.Pending,
            CreatedUtc = now,
        };
        _db.TimeOffRequests.Add(request);
        foreach (var date in working)
        {
            if (existing.TryGetValue(date, out var row))
            {
                row.Status = DayStatus.Requested;
                row.UpdatedUtc = now;
                row.TimeOffRequestId = request.Id;
            }
            else
            {
                _db.TimeOffDays.Add(new TimeOffDay
                {
                    Id = Guid.NewGuid(),
                    TeamMemberId = member.Id,
                    Date = date,
                    Status = DayStatus.Requested,
                    UpdatedUtc = now,
                    TimeOffRequestId = request.Id,
                });
            }
        }

        // The request's days show on the person's rows in their other teams (L2-064 AC1, ADR-016).
        await DaySync.ReconcileAsync(_db, member.UserId, working, now, ct);
        await _db.SaveChangesAsync(ct);
        await _notifier.NewRequestAsync(team, member, request, working.Count, ct);
        return new RequestDto(
            request.Id, member.Id, member.Name,
            RequestInput.Iso(request.FirstDay), RequestInput.Iso(request.LastDay),
            working.Count, request.Note, request.Status.ToString(), request.CreatedUtc);
    }
}
