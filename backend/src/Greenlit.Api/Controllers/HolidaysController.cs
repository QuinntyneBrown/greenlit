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

    /// <summary>Removes a holiday; its date is a working day again. Undo restores it.</summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Remove(Guid id, CancellationToken ct)
    {
        await _sender.Send(new RemoveHolidayCommand(id), ct);
        return NoContent();
    }

    [HttpPost("{id:guid}/restore")]
    public Task<HolidayDto> Restore(Guid id, CancellationToken ct) => _sender.Send(new RestoreHolidayCommand(id), ct);
}
