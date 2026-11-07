namespace Greenlit.Domain.Entities;

/// <summary>
/// Days added to (or removed from) one member's allowance for the leave year that contains
/// <see cref="EffectiveDate"/>, with the reason that explains it later (ADR-007). Journey 23 lets the manager add them.
/// </summary>
public class AllowanceAdjustment
{
    public Guid Id { get; set; }
    public Guid TeamMemberId { get; set; }
    public TeamMember TeamMember { get; set; } = null!;

    /// <summary>Positive adds days, negative removes them.</summary>
    public int Days { get; set; }

    public string Reason { get; set; } = string.Empty;
    public DateOnly EffectiveDate { get; set; }
    public DateTimeOffset CreatedUtc { get; set; }
}
