using Greenlit.Domain.Enums;

namespace Greenlit.Domain.Entities;

/// <summary>
/// A member's ask for a run of days off, decided by the manager. The days it covers are
/// <see cref="TimeOffDay"/> rows that point back to it; it spans from the first to the last of them.
/// </summary>
public class TimeOffRequest
{
    public Guid Id { get; set; }
    public Guid TeamMemberId { get; set; }
    public TeamMember TeamMember { get; set; } = null!;

    public DateOnly FirstDay { get; set; }
    public DateOnly LastDay { get; set; }

    /// <summary>What the member wrote, e.g. "Visiting family in Seville".</summary>
    public string? Note { get; set; }

    public RequestStatus Status { get; set; } = RequestStatus.Pending;

    public DateTimeOffset CreatedUtc { get; set; }

    public ICollection<TimeOffDay> Days { get; set; } = new List<TimeOffDay>();
}
