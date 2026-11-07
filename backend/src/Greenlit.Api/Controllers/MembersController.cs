using Greenlit.Application.Invitations;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Greenlit.Api.Controllers;

/// <summary>The team's members (docs/detailed-designs/teams/invite-member). Managers only.</summary>
[ApiController]
[Route("api/team/members")]
[Authorize(Policy = "Manager")]
public sealed class MembersController : ControllerBase
{
    private readonly ISender _sender;

    public MembersController(ISender sender) => _sender = sender;

    /// <summary>Adds a row to the caller's team and emails the person a link that works for seven days; inviting an address that has not joined yet sends a new link.</summary>
    [HttpPost]
    public async Task<ActionResult<InvitedMemberDto>> Invite([FromBody] InviteMemberCommand command, CancellationToken ct)
    {
        var invited = await _sender.Send(command, ct);
        return StatusCode(invited.Resent ? StatusCodes.Status200OK : StatusCodes.Status201Created, invited);
    }
}
