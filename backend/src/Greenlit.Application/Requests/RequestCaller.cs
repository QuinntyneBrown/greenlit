using Greenlit.Domain.Enums;
using Greenlit.Application.Abstractions;
using Greenlit.Application.Teams;
using Greenlit.Application.Exceptions;
using Greenlit.Application.Sheet;
using Greenlit.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Requests;

/// <summary>
/// Who is asking, and on which team: the caller's own row on their own team. A caller on no team
/// is a 404 like any unknown team, so nothing about other teams leaks.
/// </summary>
internal static class RequestCaller
{
    public static async Task<(Team Team, TeamMember Member)> FindAsync(
        IAppDbContext db, ICurrentUser currentUser, CancellationToken ct)
    {
        var userId = currentUser.UserId ?? throw new NotFoundException("Team", "the signed-in user");
        var activeTeamId = await ActiveTeam.IdAsync(db, currentUser, ct);
        var team = await db.Teams.AsNoTracking()
            .Where(t => t.Id == activeTeamId && (t.ManagerUserId == userId || t.Members.Any(m => m.UserId == userId)))
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Team", "the signed-in user");
        var member = await db.TeamMembers
            .FirstOrDefaultAsync(m => m.TeamId == team.Id && m.UserId == userId, ct)
            ?? throw new NotFoundException("Member", "the signed-in user");
        return (team, member);
    }

    /// <summary>
    /// The caller's team, when the caller manages it: a caller on no team is a 404, a member of
    /// one a 403, so a member learns nothing beyond "managers only".
    /// </summary>
    public static async Task<Team> FindManagedTeamAsync(IAppDbContext db, ICurrentUser currentUser, CancellationToken ct)
    {
        var userId = currentUser.UserId ?? throw new NotFoundException("Team", "the signed-in user");
        var activeTeamId = await ActiveTeam.IdAsync(db, currentUser, ct);
        var team = await db.Teams.AsNoTracking()
            .Where(t => t.Id == activeTeamId && (t.ManagerUserId == userId || t.Members.Any(m => m.UserId == userId)))
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Team", "the signed-in user");
        if (team.ManagerUserId != userId)
            throw new ForbiddenException("forbidden", "Only the team's manager can do that.");
        return team;
    }

    /// <summary>The manager's name as the team shows it: their row, else their account.</summary>
    public static async Task<string> ManagerNameAsync(IAppDbContext db, Team team, CancellationToken ct) =>
        await db.TeamMembers.AsNoTracking().Where(m => m.TeamId == team.Id && m.UserId == team.ManagerUserId)
            .Select(m => m.Name).FirstOrDefaultAsync(ct)
        ?? await db.Users.AsNoTracking().Where(u => u.Id == team.ManagerUserId).Select(u => u.DisplayName).FirstAsync(ct);

    /// <summary>The dates from <paramref name="first"/> to <paramref name="last"/> that are neither off days of the member nor the team's holidays.</summary>
    public static async Task<(List<DateOnly> Working, bool AllHolidays)> WorkingDaysAsync(
        IAppDbContext db, Guid teamId, WorkingDays workingDays, DateOnly first, DateOnly last, CancellationToken ct)
    {
        var holidays = (await db.Holidays.AsNoTracking()
                .Where(h => h.TeamId == teamId && h.Date >= first && h.Date <= last)
                .Select(h => h.Date)
                .ToListAsync(ct))
            .ToHashSet();
        var all = Enumerable.Range(0, last.DayNumber - first.DayNumber + 1).Select(first.AddDays).ToList();
        var working = all.Where(d => !WorkingDayRule.IsOffDay(d, workingDays) && !holidays.Contains(d)).ToList();
        return (working, all.All(holidays.Contains));
    }
}
