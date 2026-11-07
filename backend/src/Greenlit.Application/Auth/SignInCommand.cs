using Greenlit.Domain.Enums;
using MediatR;

namespace Greenlit.Application.Auth;

/// <summary>Sign in with email and password (L2-001, docs/detailed-designs/identity-and-access/sign-in).</summary>
public sealed record SignInCommand(string? Email, string? Password) : IRequest<SessionDto>;

/// <summary>The signed-in session: the bearer token and who it is for.</summary>
public sealed record SessionDto(
    string AccessToken,
    DateTimeOffset ExpiresUtc,
    Guid UserId,
    string DisplayName,
    UserRole Role,
    Guid? TeamId);
