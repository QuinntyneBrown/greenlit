using Greenlit.Domain.Enums;

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

    /// <summary>The public-holiday calendar chosen when the team was created (<c>GB</c>, <c>IE</c>, <c>US</c>, <c>CA</c> or <c>IT</c>); null when it chose none (ADR-008).</summary>
    public string? HolidayCountry { get; set; }

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

    /// <summary>Email the manager when a member sends a request (teams/notification-settings, L2-043).</summary>
    public bool NotifyNewRequests { get; set; } = true;

    /// <summary>Email a member when their request is approved or declined (teams/notification-settings, L2-043).</summary>
    public bool NotifyDecisions { get; set; } = true;

    /// <summary>The weekdays the team works; the others are red for every row (teams/working-days).</summary>
    public WorkingDays WorkingDays { get; set; } = WorkingDays.MonToFri;

    /// <summary>
    /// The school calendar (L2-059, ADR-015): off by default; while on, the manager marks children and records school
    /// closures. Turning it off hides them and keeps them.
    /// </summary>
    public bool SchoolCalendar { get; set; }

    public ICollection<TeamMember> Members { get; set; } = new List<TeamMember>();
    public ICollection<Holiday> Holidays { get; set; } = new List<Holiday>();
}
