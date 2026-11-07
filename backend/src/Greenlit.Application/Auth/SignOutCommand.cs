using Greenlit.Application.Abstractions;
using MediatR;
using Microsoft.Extensions.Logging;

namespace Greenlit.Application.Auth;

/// <summary>
/// Records that the caller signed out (L2-006, docs/detailed-designs/identity-and-access/sign-out). The token is
/// not revoked: a session is a stateless bearer that lapses after eight hours (ADR-004), and the client discards it.
/// </summary>
public sealed record SignOutCommand : IRequest;

public sealed class SignOutCommandHandler : IRequestHandler<SignOutCommand>
{
    private readonly ICurrentUser _current;
    private readonly ILogger<SignOutCommandHandler> _log;

    public SignOutCommandHandler(ICurrentUser current, ILogger<SignOutCommandHandler> log)
    {
        _current = current;
        _log = log;
    }

    public Task Handle(SignOutCommand request, CancellationToken ct)
    {
        _log.LogInformation("User {UserId} signed out", _current.UserId);
        return Task.CompletedTask;
    }
}
