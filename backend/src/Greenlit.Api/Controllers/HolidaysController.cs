using Greenlit.Application.Holidays;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Greenlit.Api.Controllers;

/// <summary>The team's holidays (docs/detailed-designs/teams/manage-holidays). Managers only.</summary>
[ApiController]
[Route("api/team/holidays")]
[Authorize(Policy = "Manager")]
public sealed class HolidaysController : ControllerBase
{
    private readonly ISender _sender;

    public HolidaysController(ISender sender) => _sender = sender;

    [HttpGet]
    public Task<TeamHolidaysDto> List(CancellationToken ct) => _sender.Send(new GetTeamHolidaysQuery(), ct);

    /// <summary>Adds a day off for the whole team; a weekend or an existing holiday is refused.</summary>
    [HttpPost]
    public async Task<ActionResult<HolidayDto>> Add([FromBody] AddHolidayCommand command, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await _sender.Send(command, ct));
}
