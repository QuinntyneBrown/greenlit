using Greenlit.Application.Pipeline;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Greenlit.Api.Controllers;

/// <summary>Pipeline smoke endpoint; anonymous so the tests can prove the plumbing before auth exists.</summary>
[ApiController]
[Route("api/_ping")]
[AllowAnonymous]
public sealed class PingController : ControllerBase
{
    private readonly ISender _sender;

    public PingController(ISender sender) => _sender = sender;

    [HttpPost]
    public async Task<ActionResult<PingResponse>> Post([FromBody] PingCommand command, CancellationToken ct)
    {
        var response = await _sender.Send(command, ct);
        return Ok(response);
    }
}
