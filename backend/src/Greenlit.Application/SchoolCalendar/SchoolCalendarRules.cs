using Greenlit.Domain.Entities;

namespace Greenlit.Application.SchoolCalendar;

/// <summary>
/// What the school calendar means for a member (L2-059, L2-060, ADR-015). Every reader goes through these, so turning
/// the setting off changes every screen and count without touching stored data.
/// </summary>
public static class SchoolCalendarRules
{
    public const string ChildNotAllowed = "child_not_allowed";

    /// <summary>A child while the team's school calendar is on: no allowance, no days left.</summary>
    public static bool IsChild(Team team, TeamMember member) => team.SchoolCalendar && member.IsChild;

    /// <summary>A child with no email: the manager marks their days, and they are saved as Confirmed (L2-060 AC4).</summary>
    public static bool ConfirmsDirectly(Team team, TeamMember member) =>
        IsChild(team, member) && string.IsNullOrWhiteSpace(member.Email) && member.UserId is null;
}
