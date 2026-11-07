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

    /// <summary>When the manager approved or declined it; null while it is Pending.</summary>
    public DateTimeOffset? DecidedUtc { get; set; }

    /// <summary>The manager's user id, set with <see cref="DecidedUtc"/>.</summary>
    public Guid? DecidedByUserId { get; set; }

    /// <summary>Why the manager declined it, when they said; set by Decline (journey 10).</summary>
    public string? DeclineReason { get; set; }

    public ICollection<TimeOffDay> Days { get; set; } = new List<TimeOffDay>();

    /// <summary>
    /// The manager approves a Pending request: it becomes Approved and its days Confirmed
    /// (docs/detailed-designs/requests/approve-request). Load <see cref="Days"/> first.
    /// </summary>
    public void Approve(Guid by, DateTimeOffset now)
    {
        if (Status != RequestStatus.Pending)
            throw new InvalidOperationException($"A {Status} request cannot be approved.");
        Status = RequestStatus.Approved;
        DecidedUtc = now;
        DecidedByUserId = by;
        foreach (var day in Days)
        {
            day.Status = DayStatus.Confirmed;
            day.ConfirmedUtc = now;
            day.UpdatedUtc = now;
        }
    }

    /// <summary>
    /// The manager declines a Pending request, with a reason when they gave one: it becomes Declined and its
    /// days go back to Tentative, still linked so Undo can find them (docs/detailed-designs/requests/decline-request).
    /// Load <see cref="Days"/> first.
    /// </summary>
    public void Decline(Guid by, string? reason, DateTimeOffset now)
    {
        if (Status != RequestStatus.Pending)
            throw new InvalidOperationException($"A {Status} request cannot be declined.");
        Status = RequestStatus.Declined;
        DecidedUtc = now;
        DecidedByUserId = by;
        DeclineReason = string.IsNullOrWhiteSpace(reason) ? null : reason.Trim();
        foreach (var day in Days)
        {
            day.Status = DayStatus.Tentative;
            day.ConfirmedUtc = null;
            day.UpdatedUtc = now;
        }
    }

    /// <summary>
    /// Undo of an approval: the request is Pending again and its days still Confirmed return to Requested.
    /// A day the manager has since changed is not in that state and is left alone. Load <see cref="Days"/> first.
    /// </summary>
    public void Reopen(DateTimeOffset now)
    {
        if (Status != RequestStatus.Approved)
            throw new InvalidOperationException($"A {Status} request cannot be reopened.");
        Status = RequestStatus.Pending;
        DecidedUtc = null;
        DecidedByUserId = null;
        foreach (var day in Days.Where(d => d.Status == DayStatus.Confirmed))
        {
            day.Status = DayStatus.Requested;
            day.ConfirmedUtc = null;
            day.UpdatedUtc = now;
        }
    }
}
