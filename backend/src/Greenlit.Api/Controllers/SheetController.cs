using Greenlit.Application.Sheet;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Greenlit.Api.Controllers;

/// <summary>The team's month (docs/detailed-designs/sheet/view-month). Authenticated by the fallback policy.</summary>
[ApiController]
[Route("api/sheet")]
public sealed class SheetController : ControllerBase
{
    private readonly ISender _sender;

    public SheetController(ISender sender) => _sender = sender;

    /// <summary>One month of the caller's team; <paramref name="month"/> is yyyy-MM, default the current month.</summary>
    [HttpGet]
    public async Task<ActionResult<MonthDto>> Get([FromQuery] string? month, CancellationToken ct) =>
        Ok(await _sender.Send(new GetMonthQuery(month), ct));
}
