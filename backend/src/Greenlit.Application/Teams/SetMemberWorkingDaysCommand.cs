using MediatR;

namespace Greenlit.Application.Teams;

/// <summary>Sets the days one member works, for a part-timer (L2-040). Sending the team's own days clears the override. Manager only.</summary>
public sealed record SetMemberWorkingDaysCommand(Guid MemberId, IReadOnlyList<string>? Days) : IRequest<MemberWorkingDaysDto>;

/// <summary>The days the member now works (their own, or the team's when they have none of their own).</summary>
public sealed record MemberWorkingDaysDto(Guid MemberId, IReadOnlyList<string> WorkingDays);
