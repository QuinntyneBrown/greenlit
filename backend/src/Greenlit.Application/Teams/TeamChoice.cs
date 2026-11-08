using Greenlit.Application.Abstractions;
using Greenlit.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Teams;

/// <summary>
/// The team a session opens on when nothing else names one (L2-054 AC1, AC12, L2-056 AC4; ADR-014, ADR-015): the
/// person's default team while they manage it, else the earliest created team they manage; for a person who manages
/// none, their default team (the team they joined first) while they have a live row on it, else the earliest created
/// team they have a live row on.
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
        var memberships = await MembershipTeamIdsAsync(db, userId, ct);
        if (memberships.Count == 0) return null;
        var joinedFirst = await db.Users.AsNoTracking().Where(u => u.Id == userId).Select(u => u.DefaultTeamId).FirstOrDefaultAsync(ct);
        return joinedFirst is { } first && memberships.Contains(first) ? first : memberships[0];
    }

    /// <summary>
    /// The ids of every team the person has a live row on, as manager or member, oldest first (L2-055, ADR-015).
    /// Sorted in memory for the same reason as <see cref="ManagedTeamIdsAsync"/>.
    /// </summary>
    public static async Task<List<Guid>> MembershipTeamIdsAsync(IAppDbContext db, Guid userId, CancellationToken ct) =>
        (await db.Teams.AsNoTracking()
            .Where(t => t.Members.Any(m => m.UserId == userId))
            .Select(t => new { t.Id, t.CreatedUtc })
            .ToListAsync(ct))
        .OrderBy(t => t.CreatedUtc).Select(t => t.Id).ToList();
}
