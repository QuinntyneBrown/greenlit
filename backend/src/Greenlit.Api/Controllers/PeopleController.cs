using Greenlit.Application.People;
using Microsoft.AspNetCore.Authorization;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Greenlit.Api.Controllers;

/// <summary>A person's page (docs/detailed-designs/allowances/person-page). Authenticated by the fallback policy.</summary>
[ApiController]
[Route("api/people")]
public sealed class PeopleController : ControllerBase
{
    private readonly ISender _sender;

    public PeopleController(ISender sender) => _sender = sender;

    /// <summary>The caller's own page ("My time off").</summary>
    [HttpGet("me")]
    public async Task<ActionResult<PersonDto>> GetMe(CancellationToken ct) =>
        Ok(await _sender.Send(new GetPersonQuery(null), ct));

    /// <summary>The person with <paramref name="id"/> on the caller's team.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PersonDto>> Get(Guid id, CancellationToken ct) =>
        Ok(await _sender.Send(new GetPersonQuery(id), ct));

    /// <summary>Adds days to (or removes days from) a member's allowance with a reason (docs/detailed-designs/allowances/adjust-allowance). Manager only.</summary>
    [HttpPost("{id:guid}/adjustments")]
    [Authorize(Policy = "Manager")]
    public async Task<ActionResult<AdjustmentDto>> Adjust(Guid id, [FromBody] AdjustmentBody body, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await _sender.Send(new AddAdjustmentCommand(id, body.Days, body.Reason), ct));

    public sealed record AdjustmentBody(int Days, string? Reason);
}
