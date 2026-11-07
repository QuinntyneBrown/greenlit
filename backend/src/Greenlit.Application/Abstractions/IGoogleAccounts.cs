namespace Greenlit.Application.Abstractions;

/// <summary>What Google vouches for about an account (ADR-012).</summary>
/// <param name="Subject">Google's stable id for the account.</param>
/// <param name="Email">The account's email, as Google gives it.</param>
/// <param name="EmailVerified">Whether Google has verified that email; nothing matches or is created without it.</param>
/// <param name="Name">The display name Google gives, or null when it gives none.</param>
public sealed record GoogleAccount(string Subject, string Email, bool EmailVerified, string? Name);

/// <summary>
/// Reads the Google account behind an access token the browser got from Google Identity Services;
/// implemented in Greenlit.Infrastructure against Google, and by a fake for tests (ADR-012).
/// </summary>
public interface IGoogleAccounts
{
    /// <summary>The account, or null when the token is not one Google issued to Greenlit's client, or Google rejects it.</summary>
    Task<GoogleAccount?> ReadAsync(string accessToken, CancellationToken ct);
}
