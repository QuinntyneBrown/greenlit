using MediatR;

namespace Greenlit.Application.Teams;

/// <summary>The Team section of Settings (L2-009 AC1, AC3): readable by every member of the caller's team.</summary>
public sealed record GetTeamSectionQuery : IRequest<TeamSectionDto>;

/// <summary><c>CanEdit</c> is true for the team's manager; a member sees the same values read-only.</summary>
public sealed record TeamSectionDto(string Name, string TimeZone, bool CanEdit, string ManagerName, IReadOnlyList<TeamSectionMemberDto> Members);

public sealed record TeamSectionMemberDto(Guid Id, string Name, string? Email, string Role, int? YearlyDays);
