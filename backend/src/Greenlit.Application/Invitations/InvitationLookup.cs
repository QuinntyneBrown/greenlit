using Greenlit.Application.Abstractions;
using Greenlit.Application.Exceptions;
using Greenlit.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Invitations;

/// <summary>An invitation that still works, with the team, member and manager it belongs to.</summary>
internal sealed record OpenInvitation(Invitation Invitation, TeamMember Member, Team Team, string ManagerName);

/// <summary>
/// Finds the invitation behind a token and decides whether the link still works
/// (docs/detailed-designs/identity-and-access/accept-invitation). A token that matches nothing is
/// <c>invitation_not_found</c> and names no one; one that matches an invitation that is used,
/// retired by a newer one or past its seven days is <c>invitation_expired</c> and names the manager,
/// so the page can say who to ask for a new one.
/// </summary>
internal static class InvitationLookup
{
    public const string NotFound = "invitation_not_found";
    public const string ExpiredCode = "invitation_expired";

    public static async Task<OpenInvitation> FindOpenAsync(IAppDbContext db, TimeProvider time, string token, CancellationToken ct)
    {
        var hash = InvitationIssuer.Hash(token ?? string.Empty);
        var invitation = await db.Invitations
            .Include(i => i.TeamMember).ThenInclude(m => m.Team)
            .SingleOrDefaultAsync(i => i.TokenHash == hash, ct)
            ?? throw new NotFoundException("That invitation link is not recognised.") { Code = NotFound };

        var team = invitation.TeamMember.Team;
        var managerName = await db.Users.AsNoTracking()
            .Where(u => u.Id == team.ManagerUserId).Select(u => u.DisplayName).SingleOrDefaultAsync(ct) ?? string.Empty;

        var used = invitation.AcceptedUtc is not null || invitation.RetiredUtc is not null || invitation.TeamMember.UserId is not null;
        if (used || invitation.ExpiresUtc <= time.GetUtcNow())
        {
            throw Expired(managerName);
        }
        return new OpenInvitation(invitation, invitation.TeamMember, team, managerName);
    }

    public static GoneException Expired(string managerName) =>
        new(ExpiredCode, "This invitation has expired.", new Dictionary<string, object?> { ["managerName"] = managerName });
}
