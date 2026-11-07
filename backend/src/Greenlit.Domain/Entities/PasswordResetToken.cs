namespace Greenlit.Domain.Entities;

/// <summary>
/// A single-use link that lets the person behind a <see cref="User"/> choose a new password
/// (docs/detailed-designs/identity-and-access/reset-password, ADR-011). Only the hash of the token
/// is stored; the token itself exists in the email alone.
/// </summary>
public class PasswordResetToken
{
    /// <summary>How long a link works, from the moment it is issued (L2-002 AC2, L2-003 AC4).</summary>
    public static readonly TimeSpan Lifetime = TimeSpan.FromHours(1);

    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    /// <summary>SHA-256 of the token, hex encoded.</summary>
    public string TokenHash { get; set; } = string.Empty;

    public DateTimeOffset ExpiresUtc { get; set; }
    public DateTimeOffset? UsedUtc { get; set; }
}
