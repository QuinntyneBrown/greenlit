using MediatR;

namespace Greenlit.Application.Teams;

/// <summary>The Team section of Settings (L2-009 AC1, AC3): readable by every member of the caller's team.</summary>
public sealed record GetTeamSectionQuery : IRequest<TeamSectionDto>;

/// <summary>
/// <c>CanEdit</c> is true for the team's manager; a member sees the same values read-only. <c>SchoolCalendar</c> says
/// whether the team's school calendar is on (L2-059), so every member's Settings shows that section.
/// </summary>
public sealed record TeamSectionDto(string Name, string TimeZone, bool CanEdit, string ManagerName, IReadOnlyList<TeamSectionMemberDto> Members, bool SchoolCalendar);

public sealed record TeamSectionMemberDto(Guid Id, string Name, string? Email, string Role, int? YearlyDays);

/// <summary>
/// Saves the Team section as one request (L2-009 AC2): the name, the time zone, and the role and yearly days of
/// each listed member. A null <c>YearlyDays</c> means the member uses the team's default. Manager only.
/// </summary>
public sealed record SaveTeamSectionCommand(string? Name, string? TimeZone, IReadOnlyList<SaveTeamSectionMember>? Members) : IRequest<TeamSectionDto>;

public sealed record SaveTeamSectionMember(Guid Id, string? Role, int? YearlyDays);
