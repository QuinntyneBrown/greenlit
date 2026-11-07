using MediatR;

namespace Greenlit.Application.Invitations;

/// <summary>Read the invitation behind a link (L2-004 AC1, AC2). Anonymous: the token is the credential.</summary>
public sealed record GetInvitationQuery(string Token) : IRequest<InvitationSummaryDto>;

/// <summary>What the accept page shows: whose team it is, who invited the person, and where the invitation was sent.</summary>
public sealed record InvitationSummaryDto(string TeamName, string ManagerName, string MemberName, string Email);
