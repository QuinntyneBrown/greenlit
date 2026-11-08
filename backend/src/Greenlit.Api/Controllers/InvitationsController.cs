using Greenlit.Application.Auth;
using Greenlit.Application.Invitations;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Greenlit.Api.Controllers;

/// <summary>
/// The invitee's side of an invitation (docs/detailed-designs/identity-and-access/accept-invitation, and sign-in-with-google).
/// Anonymous by design except joining with the signed-in account: the person may have no account yet, and the
/// unguessable token in the link is the credential.
/// </summary>
[ApiController]
[Route("api/invitations")]
public sealed class InvitationsController : ControllerBase
{
    private readonly ISender _sender;

    public InvitationsController(ISender sender) => _sender = sender;

    /// <summary>The team, manager and address an open invitation belongs to; 404 for an unknown token, 410 for one that is used or expired.</summary>
    [AllowAnonymous]
    [HttpGet("{token}")]
    public async Task<ActionResult<InvitationSummaryDto>> Get(string token, CancellationToken ct) =>
        Ok(await _sender.Send(new GetInvitationQuery(token), ct));

    /// <summary>Creates the account, links it to the member's row and signs the person in.</summary>
    [AllowAnonymous]
    [HttpPost("{token}/accept")]
    public async Task<ActionResult<SessionDto>> Accept(string token, [FromBody] AcceptInvitationRequest request, CancellationToken ct) =>
        Ok(await _sender.Send(new AcceptInvitationCommand(token, request.Name, request.Password), ct));

    /// <summary>Creates the account from the invited Google account, links it to the member's row and signs the person in (L2-052).</summary>
    [AllowAnonymous]
    [HttpPost("{token}/accept-google")]
    public async Task<ActionResult<SessionDto>> AcceptWithGoogle(string token, [FromBody] AcceptInvitationWithGoogleRequest request, CancellationToken ct) =>
        Ok(await _sender.Send(new AcceptInvitationWithGoogleCommand(token, request.AccessToken), ct));

    /// <summary>Signs in with the password of the account the invitation's address has and joins the team (L2-058 AC2).</summary>
    [AllowAnonymous]
    [HttpPost("{token}/sign-in")]
    public async Task<ActionResult<SessionDto>> SignInAndJoin(string token, [FromBody] SignInAndJoinRequest request, CancellationToken ct) =>
        Ok(await _sender.Send(new SignInAndJoinCommand(token, request.Password), ct));

    /// <summary>Joins the team with the signed-in account, which must have the invitation's address (L2-058 AC4, AC5).</summary>
    [HttpPost("{token}/join")]
    public async Task<ActionResult<SessionDto>> Join(string token, CancellationToken ct) =>
        Ok(await _sender.Send(new JoinInvitationCommand(token), ct));
}

public sealed record SignInAndJoinRequest(string? Password);

public sealed record AcceptInvitationRequest(string? Name, string? Password);

public sealed record AcceptInvitationWithGoogleRequest(string? AccessToken);
