namespace Greenlit.Domain.Entities;

/// <summary>
/// A single-use link that lets the person on a <see cref="TeamMember"/> row set a password
/// and join (docs/detailed-designs/identity-and-access/accept-invitation). Only the hash of the
/// token is stored; the token itself exists in the email alone (ADR-006).
/// </summary>
public class Invitation
{
    /// <summary>How long a link works, from the moment it is sent (L2-004 AC4, L2-010 AC3).</summary>
    public static readonly TimeSpan Lifetime = TimeSpan.FromDays(7);

    public Guid Id { get; set; }
    public Guid TeamMemberId { get; set; }
    public TeamMember TeamMember { get; set; } = null!;

    public string Email { get; set; } = string.Empty;

    /// <summary>SHA-256 of the token, hex encoded.</summary>
    public string TokenHash { get; set; } = string.Empty;

    public DateTimeOffset SentUtc { get; set; }
    public DateTimeOffset ExpiresUtc { get; set; }
    public DateTimeOffset? AcceptedUtc { get; set; }

    /// <summary>Set when a newer invitation replaces this one; a retired link no longer works.</summary>
    public DateTimeOffset? RetiredUtc { get; set; }
}
