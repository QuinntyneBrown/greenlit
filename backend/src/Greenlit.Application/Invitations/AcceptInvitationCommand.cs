using Greenlit.Application.Auth;
using MediatR;

namespace Greenlit.Application.Invitations;

/// <summary>Join the team from an invitation: create the account and sign in (L2-004 AC5).</summary>
public sealed record AcceptInvitationCommand(string Token, string? Name, string? Password) : IRequest<SessionDto>;
