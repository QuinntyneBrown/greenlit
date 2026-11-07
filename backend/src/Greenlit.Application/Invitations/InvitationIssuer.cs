using System.Security.Cryptography;
using System.Text;
using Greenlit.Application.Abstractions;
using Greenlit.Domain.Entities;

namespace Greenlit.Application.Invitations;

/// <summary>An invitation ready to store, and the email that carries its link.</summary>
public sealed record IssuedInvitation(Invitation Invitation, EmailMessage Email);

/// <summary>
/// Makes invitations (docs/detailed-designs/teams/invite-member, ADR-006): a random token whose
/// hash is stored, a seven-day expiry, and the email that holds the link. Used by the invite
/// command and by create-team, so one place decides how a link looks and how long it lives.
/// </summary>
public sealed class InvitationIssuer
{
    private readonly IInvitationLinks _links;
    private readonly TimeProvider _time;

    public InvitationIssuer(IInvitationLinks links, TimeProvider time)
    {
        _links = links;
        _time = time;
    }

    /// <summary>The hash stored for a token; also how an accepted link is looked up (journey 6).</summary>
    public static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    public IssuedInvitation Issue(Team team, string managerName, TeamMember member, string email)
    {
        var token = Base64Url(RandomNumberGenerator.GetBytes(32));
        var now = _time.GetUtcNow();
        var invitation = new Invitation
        {
            Id = Guid.NewGuid(),
            TeamMemberId = member.Id,
            Email = email,
            TokenHash = Hash(token),
            SentUtc = now,
            ExpiresUtc = now + Invitation.Lifetime,
        };
        return new IssuedInvitation(invitation, InvitationEmail.Compose(team.Name, managerName, member.Name, email, _links.For(token)));
    }

    private static string Base64Url(byte[] bytes) =>
        Convert.ToBase64String(bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
