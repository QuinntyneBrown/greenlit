using System.Globalization;
using Greenlit.Application.Abstractions;
using Greenlit.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Holidays;

/// <summary>What the holiday handlers share: how a date is written, and clearing booked days off a holiday.</summary>
internal static class HolidayCalendar
{
    /// <summary>"Mon 25 May", as the Settings list and dialogs write a date.</summary>
    public static string Date(DateOnly date) => date.ToString("ddd d MMM", CultureInfo.InvariantCulture);

    public static HolidayDto ToDto(Holiday holiday) => new(holiday.Id, holiday.Date.ToString("yyyy-MM-dd"), holiday.Name);

    /// <summary>
    /// Deletes the days every member of <paramref name="teamId"/> holds on <paramref name="date"/>, in any
    /// status: a holiday never holds time off (ADR-003, ADR-008). The caller saves.
    /// </summary>
    public static async Task ClearDaysAsync(IAppDbContext db, Guid teamId, DateOnly date, CancellationToken ct) =>
        db.TimeOffDays.RemoveRange(await db.TimeOffDays
            .Where(d => d.Date == date && d.TeamMember.TeamId == teamId)
            .ToListAsync(ct));
}
