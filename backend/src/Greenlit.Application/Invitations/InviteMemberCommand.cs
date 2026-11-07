using MediatR;

namespace Greenlit.Application.Invitations;

/// <summary>Add a person to the caller's team and email them a link (L2-010, docs/detailed-designs/teams/invite-member).</summary>
public sealed record InviteMemberCommand(string? Name, string? Email, string? Role) : IRequest<InvitedMemberDto>;

/// <summary>The row the invitation put on the sheet. <c>Resent</c> is true when the person was already invited and only got a new link.</summary>
public sealed record InvitedMemberDto(Guid Id, string Name, string Email, string Role, bool Resent);
