using Greenlit.Application.Teams;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Greenlit.Api.Controllers;

/// <summary>
/// Create a team (docs/detailed-designs/teams/create-team) and run several (docs/detailed-designs/teams/switch-team).
/// Authenticated by the fallback policy; the handlers decide who may do what.
/// </summary>
[ApiController]
[Route("api/teams")]
public sealed class TeamsController : ControllerBase
{
    private readonly ISender _sender;

    public TeamsController(ISender sender) => _sender = sender;

    /// <summary>Creates the caller's team with its first rows; the caller becomes its manager.</summary>
    [HttpPost]
    public async Task<ActionResult<CreatedTeamDto>> Create([FromBody] CreateTeamRequest request, CancellationToken ct)
    {
        var created = await _sender.Send(
            new CreateTeamCommand(
                request.Name,
                request.TimeZone,
                request.HolidayCountry,
                request.Members?.Select(m => new NewMemberRow(m.Name, m.Email)).ToList()),
            ct);
        return StatusCode(StatusCodes.Status201Created, created);
    }

    /// <summary>The teams the caller manages, oldest first, with the active and the default marked; empty for anyone else.</summary>
    [HttpGet("mine")]
    public async Task<ActionResult<IReadOnlyList<MyTeamDto>>> Mine(CancellationToken ct) =>
        Ok(await _sender.Send(new GetMyTeamsQuery(), ct));
}

public sealed record CreateTeamRequest(string? Name, string? TimeZone, string? HolidayCountry, IReadOnlyList<CreateTeamMemberRequest>? Members);

public sealed record CreateTeamMemberRequest(string? Name, string? Email);
