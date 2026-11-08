using Greenlit.Application.Abstractions;
using Greenlit.Domain.Entities;
using Greenlit.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Auth;

/// <summary>
/// Issues a session whose role is the caller's role on the team it names (ADR-015): Manager when they manage that team,
/// Member otherwise. A session that names no team carries the account's own role, as before.
/// </summary>
public static class Sessions
{
    public static async Task<SessionDto> IssueAsync(
        IAppDbContext db, ITokenService tokens, User user, TeamMember? member, CancellationToken ct)
    {
        if (member is null) return tokens.Issue(user, null, user.Role);
        var manages = await db.Teams.AsNoTracking().AnyAsync(t => t.Id == member.TeamId && t.ManagerUserId == user.Id, ct);
        return tokens.Issue(user, member, manages ? UserRole.Manager : UserRole.Member);
    }
}
