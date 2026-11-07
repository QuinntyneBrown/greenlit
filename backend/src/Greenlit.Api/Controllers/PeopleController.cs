using Greenlit.Application.People;
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

    /// <summary>The person with <paramref name="id"/> on the caller's team.</summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PersonDto>> Get(Guid id, CancellationToken ct) =>
        Ok(await _sender.Send(new GetPersonQuery(id), ct));
}
