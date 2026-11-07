namespace Greenlit.Domain.Entities;

/// <summary>One sheet: a manager and the people whose time off they track.</summary>
public class Team
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>The user who manages the team (confirms requests, edits holidays).</summary>
    public Guid ManagerUserId { get; set; }

    /// <summary>IANA time zone the team's days are read in, e.g. <c>America/Toronto</c>.</summary>
    public string TimeZone { get; set; } = "UTC";

    public DateTimeOffset CreatedUtc { get; set; }

    /// <summary>
    /// The fewest members who should be in on any working day (docs/detailed-designs/teams/coverage-minimum);
    /// 0 means no minimum, so no day is ever short.
    /// </summary>
    public int CoverageMinimum { get; set; }

    /// <summary>Yearly days a member gets when they have none of their own (allowances/allowance-figures).</summary>
    public int DefaultYearlyDays { get; set; } = 25;

    /// <summary>Month (1-12) the leave year starts in; 1 is a calendar year.</summary>
    public int LeaveYearStartMonth { get; set; } = 1;

    /// <summary>The most days a manager should carry over; a stored setting, carry-over itself is an adjustment (ADR-007).</summary>
    public int MaxCarryOver { get; set; } = 5;

    public ICollection<TeamMember> Members { get; set; } = new List<TeamMember>();
    public ICollection<Holiday> Holidays { get; set; } = new List<Holiday>();
}
