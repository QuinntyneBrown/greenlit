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

    /// <summary>The request a day belongs to: the pending one for a Requested day, the approved one for the days it confirmed; null for every other day.</summary>
    public Guid? TimeOffRequestId { get; set; }
    public TimeOffRequest? TimeOffRequest { get; set; }

    /// <summary>Set when the manager confirms the day.</summary>
    public DateTimeOffset? ConfirmedUtc { get; set; }

    /// <summary>
    /// A synced day (L2-064, ADR-016): a copy of a day the same person holds on their row in another team, kept in step by
    /// <c>DaySync</c>. Always Tentative, never part of a request, read-only here, and counted in no allowance figure.
    /// </summary>
    public bool IsSynced { get; set; }
}
