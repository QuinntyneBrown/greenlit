using Greenlit.Domain.Enums;

namespace Greenlit.Application.Sheet;

/// <summary>
/// Which dates are non-working (red): weekdays outside the work week and the team's holidays
/// (ADR-003, docs/detailed-designs/teams/working-days).
/// </summary>
public static class WorkingDayRule
{
    public static bool IsWeekend(DateOnly date) =>
        date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;

    /// <summary>True when the weekday of <paramref name="date"/> is not one of <paramref name="workingDays"/>.</summary>
    public static bool IsOffDay(DateOnly date, WorkingDays workingDays) => (workingDays & Flag(date)) == 0;

    public static WorkingDays Flag(DateOnly date) => date.DayOfWeek switch
    {
        DayOfWeek.Monday => WorkingDays.Mon,
        DayOfWeek.Tuesday => WorkingDays.Tue,
        DayOfWeek.Wednesday => WorkingDays.Wed,
        DayOfWeek.Thursday => WorkingDays.Thu,
        DayOfWeek.Friday => WorkingDays.Fri,
        DayOfWeek.Saturday => WorkingDays.Sat,
        _ => WorkingDays.Sun,
    };
}
