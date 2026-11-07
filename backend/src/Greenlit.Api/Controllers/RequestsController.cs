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

    /// <summary>The team's requests with one status (default Pending; Declined includes Cancelled), oldest first; manager only.</summary>
    [HttpGet]
    public async Task<ActionResult<IReadOnlyList<RequestSummaryDto>>> List([FromQuery] string? status, CancellationToken ct) =>
        Ok(await _sender.Send(new ListRequestsQuery(status), ct));

    /// <summary>The caller's own requests, Upcoming (pending) and Past (decided or cancelled); any member of a team.</summary>
    [HttpGet("mine")]
    public async Task<ActionResult<MyRequestsDto>> Mine(CancellationToken ct) =>
        Ok(await _sender.Send(new GetMyRequestsQuery(), ct));

    /// <summary>How many requests each ledger tab holds (Declined includes Cancelled); manager only.</summary>
    [HttpGet("counts")]
    public async Task<ActionResult<RequestCountsDto>> Counts(CancellationToken ct) =>
        Ok(await _sender.Send(new CountRequestsQuery(), ct));

    /// <summary>One request of the manager's team with every member's days for the weeks around it; manager only.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<RequestDetailDto>> Get(Guid id, CancellationToken ct) =>
        Ok(await _sender.Send(new GetRequestQuery(id), ct));

    /// <summary>Asks the manager for a run of days on the caller's own row and marks them Requested.</summary>
    [HttpPost]
    public async Task<ActionResult<RequestDto>> Send([FromBody] SendRequestCommand command, CancellationToken ct) =>
        StatusCode(StatusCodes.Status201Created, await _sender.Send(command, ct));

    /// <summary>The manager approves pending requests: they become Approved and their days Confirmed.</summary>
    [HttpPost("approve")]
    public async Task<ActionResult<IReadOnlyList<ApprovalResult>>> Approve([FromBody] ApproveRequestsCommand command, CancellationToken ct) =>
        Ok(await _sender.Send(command, ct));

    /// <summary>The manager declines a pending request: it becomes Declined with the optional reason and its days Tentative.</summary>
    [HttpPost("{id:guid}/decline")]
    public async Task<ActionResult<DeclineResult>> Decline(Guid id, [FromBody] DeclineBody? body, CancellationToken ct) =>
        Ok(await _sender.Send(new DeclineRequestCommand(id, body?.Reason), ct));

    /// <summary>Undo of an approval: the request is Pending again and its days Requested.</summary>
    [HttpPost("{id:guid}/reopen")]
    public async Task<IActionResult> Reopen(Guid id, CancellationToken ct)
    {
        await _sender.Send(new ReopenRequestCommand(id), ct);
        return NoContent();
    }
}

/// <summary>The body of a decline: the manager's optional reason.</summary>
public sealed record DeclineBody(string? Reason);
