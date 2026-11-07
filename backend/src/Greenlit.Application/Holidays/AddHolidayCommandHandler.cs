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
/// (<see cref="DayIsWeekend"/>). Days members already hold on the date are deleted in the same unit
/// of work, because a holiday never holds time off (ADR-003, ADR-008).
/// </summary>
public sealed class AddHolidayCommandHandler : IRequestHandler<AddHolidayCommand, HolidayDto>
{
    public const string DayIsWeekend = "day_is_weekend";
    public const string HolidayExists = "holiday_exists";

    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public AddHolidayCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<HolidayDto> Handle(AddHolidayCommand request, CancellationToken ct)
    {
        var team = await RequestCaller.FindManagedTeamAsync(_db, _currentUser, ct);
        var date = DateOnly.ParseExact(request.Date!, "yyyy-MM-dd", CultureInfo.InvariantCulture);
        var name = request.Name!.Trim();

        var existing = await _db.Holidays.SingleOrDefaultAsync(h => h.TeamId == team.Id && h.Date == date, ct);
        if (existing is not null)
            throw new ConflictException(HolidayExists, $"{HolidayLabels.Date(date)} is already a holiday ({existing.Name}).");

        if (WorkingDayRule.IsWeekend(date))
            throw new BadRequestException(DayIsWeekend, "That day is already a weekend.");

        var holiday = new Holiday { Id = Guid.NewGuid(), TeamId = team.Id, Date = date, Name = name };
        _db.Holidays.Add(holiday);
        _db.TimeOffDays.RemoveRange(await _db.TimeOffDays
            .Where(d => d.Date == date && d.TeamMember.TeamId == team.Id)
            .ToListAsync(ct));
        await _db.SaveChangesAsync(ct);
        return HolidayLabels.ToDto(holiday);
    }
}

internal static class HolidayLabels
{
    /// <summary>"Mon 25 May", as the Settings list and dialogs write a date.</summary>
    public static string Date(DateOnly date) => date.ToString("ddd d MMM", CultureInfo.InvariantCulture);

    public static HolidayDto ToDto(Holiday holiday) => new(holiday.Id, holiday.Date.ToString("yyyy-MM-dd"), holiday.Name);
}
