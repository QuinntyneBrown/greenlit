using Greenlit.Application.Requests;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Greenlit.Api.Controllers;

/// <summary>Time-off requests (docs/detailed-designs/requests/send-request). Authenticated by the fallback policy.</summary>
[ApiController]
[Route("api/requests")]
public sealed class RequestsController : ControllerBase
{
    private readonly ISender _sender;

    public RequestsController(ISender sender) => _sender = sender;

    /// <summary>How many working days a range would take; stores nothing.</summary>
    [HttpGet("quote")]
    public async Task<ActionResult<QuoteDto>> Quote([FromQuery] string? first, [FromQuery] string? last, CancellationToken ct) =>
        Ok(await _sender.Send(new QuoteRequestQuery(first, last), ct));

    /// <summary>Asks the manager for a run of days on the caller's own row and marks them Requested.</summary>
    [HttpPost]
    public async Task<ActionResult<RequestDto>> Send([FromBody] SendRequestCommand command, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await _sender.Send(command, ct));

    /// <summary>The manager approves pending requests: they become Approved and their days Confirmed.</summary>
    [HttpPost("approve")]
    public async Task<ActionResult<IReadOnlyList<ApprovalResult>>> Approve([FromBody] ApproveRequestsCommand command, CancellationToken ct) =>
        Ok(await _sender.Send(command, ct));
}
