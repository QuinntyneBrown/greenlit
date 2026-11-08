using Greenlit.Application.Abstractions;

namespace Greenlit.Application.Teams;

/// <summary>
/// The caller's active team (L2-054, ADR-014): the team the session's <c>team_id</c> names. A session without the
/// claim (issued before the person was on a team) gets the team sign-in would open. Callers still require the caller
/// to manage the team or have a live row on it, so a stale claim never opens a team the caller has left.
/// </summary>
public static class ActiveTeam
{
    /// <summary>The id of the caller's active team; null when the caller is on no team.</summary>
    public static async Task<Guid?> IdAsync(IAppDbContext db, ICurrentUser currentUser, CancellationToken ct)
    {
        if (currentUser.TeamId is { } named) return named;
        return currentUser.UserId is { } userId ? await TeamChoice.TeamIdAsync(db, userId, ct) : null;
    }
}
