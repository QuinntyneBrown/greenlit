using Greenlit.Domain.Enums;

namespace Greenlit.Domain.Entities;

/// <summary>A row in the sheet. May or may not have signed in yet (<see cref="UserId"/>).</summary>
public class TeamMember
{
    public Guid Id { get; set; }
    public Guid TeamId { get; set; }
    public Team Team { get; set; } = null!;

    public string Name { get; set; } = string.Empty;
    public string? Email { get; set; }

    /// <summary>Set once the member has an account; null while they are only a name on the sheet.</summary>
    public Guid? UserId { get; set; }

    /// <summary>Order of the rows down the left side of the sheet.</summary>
    public int SortOrder { get; set; }

    /// <summary>Member or Manager, as chosen when the person was invited; applied to their account when they join.</summary>
    public UserRole Role { get; set; } = UserRole.Member;

    /// <summary>The member's own yearly days; null means the team's default applies.</summary>
    public int? YearlyDays { get; set; }

    public ICollection<AllowanceAdjustment> Adjustments { get; set; } = new List<AllowanceAdjustment>();
    public ICollection<Invitation> Invitations { get; set; } = new List<Invitation>();
    public ICollection<TimeOffRequest> Requests { get; set; } = new List<TimeOffRequest>();
    public ICollection<TimeOffDay> TimeOffDays { get; set; } = new List<TimeOffDay>();
}
