using Greenlit.Application.Teams;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Greenlit.Api.Controllers;

/// <summary>Create a team (docs/detailed-designs/teams/create-team). Authenticated by the fallback policy.</summary>
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
}

public sealed record CreateTeamRequest(string? Name, string? TimeZone, string? HolidayCountry, IReadOnlyList<CreateTeamMemberRequest>? Members);

public sealed record CreateTeamMemberRequest(string? Name, string? Email);
