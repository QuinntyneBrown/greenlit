using Greenlit.Application.Auth;
using Greenlit.Application.Invitations;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Greenlit.Api.Controllers;

/// <summary>
/// The invitee's side of an invitation (docs/detailed-designs/identity-and-access/accept-invitation, and sign-in-with-google).
/// Anonymous by design: the person has no account yet, and the unguessable token in the link is the credential.
/// </summary>
[ApiController]
[Route("api/invitations")]
[AllowAnonymous]
public sealed class InvitationsController : ControllerBase
{
    private readonly ISender _sender;

    public InvitationsController(ISender sender) => _sender = sender;

    /// <summary>The team, manager and address an open invitation belongs to; 404 for an unknown token, 410 for one that is used or expired.</summary>
    [HttpGet("{token}")]
    public async Task<ActionResult<InvitationSummaryDto>> Get(string token, CancellationToken ct) =>
        Ok(await _sender.Send(new GetInvitationQuery(token), ct));

    /// <summary>Creates the account, links it to the member's row and signs the person in.</summary>
    [HttpPost("{token}/accept")]
    public async Task<ActionResult<SessionDto>> Accept(string token, [FromBody] AcceptInvitationRequest request, CancellationToken ct) =>
        Ok(await _sender.Send(new AcceptInvitationCommand(token, request.Name, request.Password), ct));

    /// <summary>Creates the account from the invited Google account, links it to the member's row and signs the person in (L2-052).</summary>
    [HttpPost("{token}/accept-google")]
    public async Task<ActionResult<SessionDto>> AcceptWithGoogle(string token, [FromBody] AcceptInvitationWithGoogleRequest request, CancellationToken ct) =>
        Ok(await _sender.Send(new AcceptInvitationWithGoogleCommand(token, request.AccessToken), ct));
}

public sealed record AcceptInvitationRequest(string? Name, string? Password);

public sealed record AcceptInvitationWithGoogleRequest(string? AccessToken);
