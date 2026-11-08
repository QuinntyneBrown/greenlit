namespace Greenlit.Domain.Entities;

/// <summary>
/// A day or run of days school is closed (a PA day, a school vacation) on a child's row, or on every child's row
/// (L2-061, ADR-015). It is neither a <see cref="Holiday"/> (red, team-wide) nor a <see cref="TimeOffDay"/> (it has no
/// status), so it counts in no figure.
/// </summary>
public class SchoolClosure
{
    public Guid Id { get; set; }
    public Guid TeamId { get; set; }
    public Team Team { get; set; } = null!;

    /// <summary>The child it is for; null means every child on the team, including children marked later.</summary>
    public Guid? TeamMemberId { get; set; }

    public string Label { get; set; } = string.Empty;
    public DateOnly FirstDay { get; set; }
    public DateOnly LastDay { get; set; }

    /// <summary>Added by a calendar import (L2-062): a later import for the same child replaces it. Editing clears it.</summary>
    public bool Imported { get; set; }
}
