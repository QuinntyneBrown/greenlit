using MediatR;

namespace Greenlit.Application.Invitations;

/// <summary>Read the invitation behind a link (L2-004 AC1, AC2). Anonymous: the token is the credential.</summary>
public sealed record GetInvitationQuery(string Token) : IRequest<InvitationSummaryDto>;

/// <summary>
/// What the accept page shows: whose team it is, who invited the person, where the invitation was sent, and whether
/// that address already has an account, so the page asks to sign in and join instead of creating one (L2-058).
/// </summary>
public sealed record InvitationSummaryDto(string TeamName, string ManagerName, string MemberName, string Email, bool AccountExists);
