using MediatR;

namespace Greenlit.Application.Teams;

/// <summary>The Team section of Settings (L2-009 AC1, AC3): readable by every member of the caller's team.</summary>
public sealed record GetTeamSectionQuery : IRequest<TeamSectionDto>;

/// <summary>
/// <c>CanEdit</c> is true for the team's manager; a member sees the section read-only. <c>SchoolCalendar</c> says
/// whether the team's school calendar is on (L2-059), so every member's Settings shows that section.
/// </summary>
public sealed record TeamSectionDto(string Name, string TimeZone, bool CanEdit, string ManagerName, IReadOnlyList<TeamSectionMemberDto> Members, bool SchoolCalendar);

/// <summary>
/// <c>IsChild</c> is the stored mark (L2-060); it counts only while the school calendar is on. <c>IsTeamManager</c> marks
/// the team's manager's own row, which can never be a child. <c>YearlyDays</c> is the stored override
/// for an editable manager response and the effective yearly days for a read-only member response.
/// </summary>
public sealed record TeamSectionMemberDto(Guid Id, string Name, string? Email, string Role, int? YearlyDays, bool IsChild, bool IsTeamManager);

/// <summary>
/// Saves the Team section as one request (L2-009 AC2): the name, the time zone, and the role and yearly days of
/// each listed member. A null <c>YearlyDays</c> means the member uses the team's default. Manager only.
/// </summary>
public sealed record SaveTeamSectionCommand(string? Name, string? TimeZone, IReadOnlyList<SaveTeamSectionMember>? Members) : IRequest<TeamSectionDto>;

/// <summary><c>IsChild</c> null leaves the mark as it is (L2-060 AC1).</summary>
public sealed record SaveTeamSectionMember(Guid Id, string? Role, int? YearlyDays, bool? IsChild = null);
