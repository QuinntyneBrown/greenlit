using Greenlit.Domain.Enums;

namespace Greenlit.Domain.Entities;

/// <summary>
/// One coloured cell: a member, a calendar day, and its status. A day with no
/// row is a plain working day (or a weekend / holiday, which the team owns).
/// </summary>
public class TimeOffDay
{
    public Guid Id { get; set; }
    public Guid TeamMemberId { get; set; }
    public TeamMember TeamMember { get; set; } = null!;

    public DateOnly Date { get; set; }
    public DayStatus Status { get; set; }

    public DateTimeOffset UpdatedUtc { get; set; }

    /// <summary>Set when the manager confirms the day.</summary>
    public DateTimeOffset? ConfirmedUtc { get; set; }
}
