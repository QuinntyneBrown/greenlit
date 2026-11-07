namespace Greenlit.Application.Sheet;

/// <summary>
/// Which dates are non-working (red): weekends by rule and the team's holidays
/// (ADR-003). Per-member working days (teams/working-days) extend this rule.
/// </summary>
public static class WorkingDayRule
{
    public static bool IsWeekend(DateOnly date) =>
        date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;
}
