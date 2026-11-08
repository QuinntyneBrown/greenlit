using Greenlit.Application.SchoolCalendar;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Greenlit.Api.Controllers;

/// <summary>
/// The school calendar of the caller's active team (docs/detailed-designs/teams/school-calendar, L2-060 to L2-062):
/// children and school closures. Writes are the manager's; the handlers check the team.
/// </summary>
[ApiController]
[Route("api/team")]
public sealed class SchoolCalendarController : ControllerBase
{
    private readonly ISender _sender;

    public SchoolCalendarController(ISender sender) => _sender = sender;

    /// <summary>Adds a child by name, with an optional email that invites them (L2-060 AC2).</summary>
    [HttpPost("children")]
    [Authorize(Policy = "Manager")]
    public async Task<ActionResult<AddedChildDto>> AddChild([FromBody] AddChildCommand command, CancellationToken ct)
    {
        var child = await _sender.Send(command, ct);
        return Created($"/api/team/settings/team", child);
    }
}
