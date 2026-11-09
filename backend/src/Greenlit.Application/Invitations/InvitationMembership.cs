using Greenlit.Application.Abstractions;
using Greenlit.Application.Auth;
using Greenlit.Application.Sheet;
using Greenlit.Application.Exceptions;
using Greenlit.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Invitations;

/// <summary>
/// Attaches an account that already exists to the row an invitation was sent for (L2-058, ADR-015): one identity, one
/// more membership. The invitation is claimed with the same conditional update as accepting it, so of two simultaneous
/// joins only one wins; the row keeps its days and takes the account's name; the person's first team becomes the one
/// they joined first. Returns a session that names the inviting team.
/// </summary>
internal static class InvitationMembership
{
    public static async Task<SessionDto> AttachAsync(
        IAppDbContext db, ITokenService tokens, TimeProvider time, OpenInvitation open, User user, CancellationToken ct)
    {
        if (await db.TeamMembers.AnyAsync(m => m.TeamId == open.Team.Id && m.UserId == user.Id, ct))
            throw new ConflictException(InviteMemberCommandHandler.MemberExists, "You're already on this team.");

        var claimed = await db.Invitations
            .Where(i => i.Id == open.Invitation.Id && i.AcceptedUtc == null && i.RetiredUtc == null)
            .ExecuteUpdateAsync(s => s.SetProperty(i => i.AcceptedUtc, time.GetUtcNow()), ct);
        if (claimed == 0) throw InvitationLookup.Expired(open.ManagerName);

        open.Member.UserId = user.Id;
        open.Member.Name = user.DisplayName;
        var tracked = await db.Users.SingleAsync(u => u.Id == user.Id, ct);
        if (tracked.DefaultTeamId is null || !await db.TeamMembers.AnyAsync(m => m.UserId == user.Id && m.TeamId == tracked.DefaultTeamId, ct))
            tracked.DefaultTeamId = open.Team.Id;
        await SyncFutureDaysAsync(db, time, open, user.Id, ct);
        await db.SaveChangesAsync(ct);
        return await Sessions.IssueAsync(db, tokens, tracked, open.Member, ct);
    }

    /// <summary>
    /// The person's days from today on, on every live row, are synced to each other row, the new one included
    /// (L2-064 AC8, ADR-016). Past days are not copied.
    /// </summary>
    private static async Task SyncFutureDaysAsync(IAppDbContext db, TimeProvider time, OpenInvitation open, Guid userId, CancellationToken ct)
    {
        var zone = TimeZoneInfo.FindSystemTimeZoneById(open.Team.TimeZone);
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(time.GetUtcNow(), zone).DateTime);
        var rowIds = await db.TeamMembers.Where(m => m.UserId == userId).Select(m => m.Id).ToListAsync(ct);
        rowIds.Add(open.Member.Id);
        var dates = await db.TimeOffDays
            .Where(d => rowIds.Contains(d.TeamMemberId) && !d.IsSynced && d.Date >= today)
            .Select(d => d.Date)
            .Distinct()
            .ToListAsync(ct);
        await DaySync.ReconcileAsync(db, userId, dates, time.GetUtcNow(), ct);
    }
}
