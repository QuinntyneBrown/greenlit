using Greenlit.Application.Year;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Greenlit.Api.Controllers;

/// <summary>The team's year (docs/detailed-designs/allowances/year-overview). Authenticated by the fallback policy.</summary>
[ApiController]
[Route("api/year")]
public sealed class YearController : ControllerBase
{
    private readonly ISender _sender;

    public YearController(ISender sender) => _sender = sender;

    /// <summary>The caller's team for <paramref name="year"/>: twelve months per member, the caller first.</summary>
    [HttpGet]
    public async Task<ActionResult<YearDto>> Get([FromQuery] int? year, CancellationToken ct) =>
        Ok(await _sender.Send(new GetYearQuery(year), ct));
}
