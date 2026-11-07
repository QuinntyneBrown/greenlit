using Greenlit.Application.Allowances;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Greenlit.Api.Controllers;

/// <summary>The team's allowance defaults (docs/detailed-designs/allowances/allowance-figures). Managers only.</summary>
[ApiController]
[Route("api/team/settings")]
[Authorize(Policy = "Manager")]
public sealed class TeamSettingsController : ControllerBase
{
    private readonly ISender _sender;

    public TeamSettingsController(ISender sender) => _sender = sender;

    [HttpGet]
    public Task<TeamSettingsDto> Get(CancellationToken ct) => _sender.Send(new GetTeamSettingsQuery(), ct);

    [HttpPut("allowances")]
    public Task<TeamSettingsDto> SaveAllowances([FromBody] SaveAllowanceDefaultsCommand command, CancellationToken ct) =>
        _sender.Send(command, ct);
}
