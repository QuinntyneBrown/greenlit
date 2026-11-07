using Greenlit.Application.Auth;
using Greenlit.Application.PasswordResets;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Greenlit.Api.Controllers;

/// <summary>Sign-in (docs/detailed-designs/identity-and-access/sign-in).</summary>
[ApiController]
[Route("api/auth")]
public sealed class AuthController : ControllerBase
{
    private readonly ISender _sender;

    public AuthController(ISender sender) => _sender = sender;

    /// <summary>Exchanges an email and password for a session. Anonymous by design: it is how a session starts.</summary>
    [HttpPost("sign-in")]
    [AllowAnonymous]
    public async Task<ActionResult<SessionDto>> SignIn([FromBody] SignInRequest request, CancellationToken ct) =>
        Ok(await _sender.Send(new SignInCommand(request.Email, request.Password), ct));

    /// <summary>Emails a reset link when the address has an account. Anonymous by design, and 204 either way so it reveals nothing.</summary>
    [HttpPost("password-reset")]
    [AllowAnonymous]
    public async Task<IActionResult> RequestPasswordReset([FromBody] RequestPasswordResetRequest request, CancellationToken ct)
    {
        await _sender.Send(new RequestPasswordResetCommand(request.Email), ct);
        return NoContent();
    }
}

public sealed record RequestPasswordResetRequest(string? Email);

public sealed record SignInRequest(string? Email, string? Password);
