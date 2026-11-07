using Greenlit.Application.Auth;
using MediatR;

namespace Greenlit.Application.Invitations;

/// <summary>Join the team from an invitation with a Google account (L2-052, ADR-012).</summary>
public sealed record AcceptInvitationWithGoogleCommand(string Token, string? AccessToken) : IRequest<SessionDto>;
