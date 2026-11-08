using Greenlit.Application.Abstractions;
using Greenlit.Application.Auth;
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
        await db.SaveChangesAsync(ct);
        return await Sessions.IssueAsync(db, tokens, tracked, open.Member, ct);
    }
}
