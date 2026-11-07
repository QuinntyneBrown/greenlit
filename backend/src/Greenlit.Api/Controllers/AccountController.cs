using Greenlit.Application.Account;
using Greenlit.Application.Auth;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace Greenlit.Api.Controllers;

/// <summary>The caller's own account (docs/detailed-designs/identity-and-access/manage-account). Authenticated by the fallback policy; acts only on the caller.</summary>
[ApiController]
[Route("api/account")]
public sealed class AccountController : ControllerBase
{
    private readonly ISender _sender;

    public AccountController(ISender sender) => _sender = sender;

    [HttpGet]
    public Task<AccountDto> Get(CancellationToken ct) => _sender.Send(new GetAccountQuery(), ct);

    [HttpPut("profile")]
    public Task<AccountDto> UpdateProfile([FromBody] UpdateProfileCommand command, CancellationToken ct) =>
        _sender.Send(command, ct);
}
