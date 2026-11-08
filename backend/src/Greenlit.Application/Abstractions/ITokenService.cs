using Greenlit.Application.Auth;
using Greenlit.Domain.Entities;
using Greenlit.Domain.Enums;

namespace Greenlit.Application.Abstractions;

/// <summary>Issues the session token (ADR-004); implemented in Greenlit.Infrastructure.</summary>
public interface ITokenService
{
    /// <summary>
    /// A session for <paramref name="user"/>; <paramref name="member"/> is their row on a team, if they have one, and
    /// <paramref name="role"/> their role on that team (ADR-015). Issue sessions through <c>Sessions.IssueAsync</c>.
    /// </summary>
    SessionDto Issue(User user, TeamMember? member, UserRole role);
}
