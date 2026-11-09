using System.Globalization;
using Greenlit.Application.Abstractions;
using Greenlit.Application.Exceptions;
using Greenlit.Application.Requests;
using Greenlit.Application.Sheet;
using Greenlit.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Holidays;

/// <summary>
/// Adds a day off to the caller's own team; only its manager may (L2-037). A date that is already a holiday is
/// refused naming it (<see cref="HolidayExists"/>), even on a weekend; any other weekend adds nothing
/// (<see cref="DayIsWeekend"/>). A date whose holiday was removed is revived under the new name, so the
/// team has one row per date. Days members already hold on the date are deleted in the same unit
/// of work, because a holiday never holds time off (ADR-003, ADR-008).
/// </summary>
public sealed class AddHolidayCommandHandler : IRequestHandler<AddHolidayCommand, HolidayDto>
{
    public const string DayIsWeekend = "day_is_weekend";
    public const string HolidayExists = "holiday_exists";

    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly TimeProvider _time;

    public AddHolidayCommandHandler(IAppDbContext db, ICurrentUser currentUser, TimeProvider time)
    {
        _time = time;
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<HolidayDto> Handle(AddHolidayCommand request, CancellationToken ct)
    {
        var team = await RequestCaller.FindManagedTeamAsync(_db, _currentUser, ct);
        var date = DateOnly.ParseExact(request.Date!, "yyyy-MM-dd", CultureInfo.InvariantCulture);
        var name = request.Name!.Trim();

        var holiday = await _db.Holidays.IgnoreQueryFilters().SingleOrDefaultAsync(h => h.TeamId == team.Id && h.Date == date, ct);
        if (holiday is { RemovedUtc: null })
            throw new ConflictException(HolidayExists, $"{HolidayCalendar.Date(date)} is already a holiday ({holiday.Name}).");
        if (WorkingDayRule.IsWeekend(date))
            throw new BadRequestException(DayIsWeekend, "That day is already a weekend.");

        if (holiday is null)
        {
            holiday = new Holiday { Id = Guid.NewGuid(), TeamId = team.Id, Date = date };
            _db.Holidays.Add(holiday);
        }
        holiday.Name = name;
        holiday.RemovedUtc = null;
        await HolidayCalendar.ClearDaysAsync(_db, team.Id, date, _time.GetUtcNow(), ct);
        await _db.SaveChangesAsync(ct);
        return HolidayCalendar.ToDto(holiday);
    }
}
