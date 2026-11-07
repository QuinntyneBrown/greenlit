using Greenlit.Application.Auth;
using Greenlit.Domain.Entities;

namespace Greenlit.Application.Abstractions;

/// <summary>Issues the session token (ADR-004); implemented in Greenlit.Infrastructure.</summary>
public interface ITokenService
{
    /// <summary>A session for <paramref name="user"/>; <paramref name="member"/> is their row on a team, if they have one.</summary>
    SessionDto Issue(User user, TeamMember? member);
}
