using Greenlit.Application.Teams;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Greenlit.Api.Controllers;

/// <summary>
/// The Team section of Settings (docs/detailed-designs/teams/team-settings). Any member of the team reads it;
/// only its manager saves it. Authenticated by the fallback policy.
/// </summary>
[ApiController]
[Route("api/team/settings/team")]
public sealed class TeamSectionController : ControllerBase
{
    private readonly ISender _sender;

    public TeamSectionController(ISender sender) => _sender = sender;

    [HttpGet]
    public Task<TeamSectionDto> Get(CancellationToken ct) => _sender.Send(new GetTeamSectionQuery(), ct);

    [HttpPut]
    [Authorize(Policy = "Manager")]
    public Task<TeamSectionDto> Save([FromBody] SaveTeamSectionCommand command, CancellationToken ct) =>
        _sender.Send(command, ct);
}
