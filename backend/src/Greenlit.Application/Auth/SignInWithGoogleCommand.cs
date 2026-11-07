using Greenlit.Domain.Enums;
using MediatR;

namespace Greenlit.Application.Auth;

/// <summary>Continue with Google (L2-051, docs/detailed-designs/identity-and-access/sign-in-with-google).</summary>
public sealed record SignInWithGoogleCommand(string? AccessToken) : IRequest<GoogleSessionDto>;

/// <summary>A <see cref="SessionDto"/> that also says whether signing in created the account (L2-051 AC4).</summary>
public sealed record GoogleSessionDto(
    string AccessToken,
    DateTimeOffset ExpiresUtc,
    Guid UserId,
    string DisplayName,
    UserRole Role,
    Guid? TeamId,
    bool NewAccount)
{
    public static GoogleSessionDto From(SessionDto session, bool newAccount) => new(
        session.AccessToken, session.ExpiresUtc, session.UserId, session.DisplayName, session.Role, session.TeamId, newAccount);
}
