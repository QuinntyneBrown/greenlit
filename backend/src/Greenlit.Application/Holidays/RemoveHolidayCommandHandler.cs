using Greenlit.Application.Abstractions;
using Greenlit.Application.Exceptions;
using Greenlit.Application.Requests;
using Greenlit.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Holidays;

/// <summary>
/// Removes a holiday by soft delete (<see cref="Holiday.RemovedUtc"/>) so Undo can bring it back with its name
/// (L2-038, ADR-008). Only the caller's own team's manager may; a holiday of another team, one that is already
/// removed and one that does not exist are all the same 404, so nothing about other teams leaks.
/// </summary>
public sealed class RemoveHolidayCommandHandler : IRequestHandler<RemoveHolidayCommand>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly TimeProvider _time;

    public RemoveHolidayCommandHandler(IAppDbContext db, ICurrentUser currentUser, TimeProvider time)
    {
        _db = db;
        _currentUser = currentUser;
        _time = time;
    }

    public async Task Handle(RemoveHolidayCommand request, CancellationToken ct)
    {
        var team = await RequestCaller.FindManagedTeamAsync(_db, _currentUser, ct);
        var holiday = await _db.Holidays.SingleOrDefaultAsync(h => h.Id == request.Id && h.TeamId == team.Id, ct)
            ?? throw new NotFoundException("Holiday", request.Id);
        holiday.RemovedUtc = _time.GetUtcNow();
        await _db.SaveChangesAsync(ct);
    }
}

/// <summary>
/// Brings a removed holiday back (Undo, L2-038 AC3). Days members booked on the date meanwhile are cleared, as when a
/// day off is added (ADR-008). Restoring a holiday that is not removed changes nothing.
/// </summary>
public sealed class RestoreHolidayCommandHandler : IRequestHandler<RestoreHolidayCommand, HolidayDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public RestoreHolidayCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<HolidayDto> Handle(RestoreHolidayCommand request, CancellationToken ct)
    {
        var team = await RequestCaller.FindManagedTeamAsync(_db, _currentUser, ct);
        var holiday = await _db.Holidays.IgnoreQueryFilters().SingleOrDefaultAsync(h => h.Id == request.Id && h.TeamId == team.Id, ct)
            ?? throw new NotFoundException("Holiday", request.Id);
        if (holiday.RemovedUtc is not null)
        {
            holiday.RemovedUtc = null;
            await HolidayCalendar.ClearDaysAsync(_db, team.Id, holiday.Date, ct);
            await _db.SaveChangesAsync(ct);
        }
        return HolidayCalendar.ToDto(holiday);
    }
}
