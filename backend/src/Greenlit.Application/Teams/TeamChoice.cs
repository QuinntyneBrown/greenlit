using Greenlit.Application.Abstractions;
using Greenlit.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Teams;

/// <summary>
/// The team a session opens on when nothing else names one (L2-054 AC1, AC12; ADR-014): the person's default team
/// while they manage it, else the earliest created team they manage, else the team they have a live row on.
/// The stored default is never trusted alone, so a stale one can never open a team the person no longer manages.
/// </summary>
public static class TeamChoice
{
    /// <summary>The person's own row on the team sign-in opens; null when they are on no team.</summary>
    public static async Task<TeamMember?> ForSignInAsync(IAppDbContext db, Guid userId, CancellationToken ct)
    {
        var teamId = await TeamIdAsync(db, userId, ct);
        if (teamId is null) return null;
        return await db.TeamMembers.AsNoTracking().FirstOrDefaultAsync(m => m.TeamId == teamId && m.UserId == userId, ct);
    }

    /// <summary>
    /// The ids of the teams the person manages (and has their row on), oldest first. Sorted in memory: SQLite cannot
    /// order by a <see cref="DateTimeOffset"/>, and a manager has a handful of teams.
    /// </summary>
    public static async Task<List<Guid>> ManagedTeamIdsAsync(IAppDbContext db, Guid userId, CancellationToken ct) =>
        (await db.Teams.AsNoTracking()
            .Where(t => t.ManagerUserId == userId && t.Members.Any(m => m.UserId == userId))
            .Select(t => new { t.Id, t.CreatedUtc })
            .ToListAsync(ct))
        .OrderBy(t => t.CreatedUtc).Select(t => t.Id).ToList();

    /// <summary>The id of the team sign-in opens for the person; null when they are on no team.</summary>
    public static async Task<Guid?> TeamIdAsync(IAppDbContext db, Guid userId, CancellationToken ct)
    {
        var managed = await ManagedTeamIdsAsync(db, userId, ct);
        if (managed.Count > 0)
        {
            var stored = await db.Users.AsNoTracking().Where(u => u.Id == userId).Select(u => u.DefaultTeamId).FirstOrDefaultAsync(ct);
            return stored is { } id && managed.Contains(id) ? id : managed[0];
        }
        return await db.TeamMembers.AsNoTracking()
            .Where(m => m.UserId == userId)
            .Select(m => (Guid?)m.TeamId)
            .FirstOrDefaultAsync(ct);
    }
}
