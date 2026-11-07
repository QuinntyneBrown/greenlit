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

    /// <summary>Who the caller is, for the account menu. Authenticated by the fallback policy.</summary>
    [HttpGet("me")]
    public async Task<ActionResult<AccountDto>> Me(CancellationToken ct) =>
        Ok(await _sender.Send(new GetAccountQuery(), ct));

    /// <summary>Records the sign-out; the client discards its token. Authenticated by the fallback policy.</summary>
    [HttpPost("sign-out")]
    public async Task<IActionResult> SignOut(CancellationToken ct)
    {
        await _sender.Send(new SignOutCommand(), ct);
        return NoContent();
    }

    /// <summary>Emails a reset link when the address has an account. Anonymous by design, and 204 either way so it reveals nothing.</summary>
    [HttpPost("password-reset")]
    [AllowAnonymous]
    public async Task<IActionResult> RequestPasswordReset([FromBody] RequestPasswordResetRequest request, CancellationToken ct)
    {
        await _sender.Send(new RequestPasswordResetCommand(request.Email), ct);
        return NoContent();
    }

    /// <summary>Whether a reset link still works: 204, or 410 <c>reset_link_expired</c>. Changes nothing.</summary>
    [HttpGet("password-reset/{token}")]
    [AllowAnonymous]
    public async Task<IActionResult> CheckPasswordResetLink(string token, CancellationToken ct)
    {
        await _sender.Send(new CheckPasswordResetLinkQuery(token), ct);
        return NoContent();
    }

    /// <summary>Chooses a new password with the emailed token. Anonymous by design: the unguessable single-use token is the credential.</summary>
    [HttpPost("password-reset/confirm")]
    [AllowAnonymous]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request, CancellationToken ct)
    {
        await _sender.Send(new ResetPasswordCommand(request.Token, request.Password, request.ConfirmPassword), ct);
        return NoContent();
    }
}

public sealed record ResetPasswordRequest(string? Token, string? Password, string? ConfirmPassword);

public sealed record RequestPasswordResetRequest(string? Email);

public sealed record SignInRequest(string? Email, string? Password);
