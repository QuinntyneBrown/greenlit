using Greenlit.Application.Abstractions;
using Greenlit.Application.Exceptions;

namespace Greenlit.Application.Auth;

/// <summary>What the two Google journeys share: reading the account and the rules every Google account must pass (ADR-012).</summary>
public static class GoogleSignIns
{
    public const string TokenInvalid = "google_token_invalid";
    public const string EmailUnverified = "google_email_unverified";

    /// <summary>Reads the account behind <paramref name="accessToken"/>; a token Google does not vouch for is <see cref="TokenInvalid"/>.</summary>
    public static async Task<GoogleAccount> ReadAsync(IGoogleAccounts accounts, string accessToken, CancellationToken ct)
    {
        var account = await accounts.ReadAsync(accessToken, ct);
        if (account is null || string.IsNullOrWhiteSpace(account.Subject) || string.IsNullOrWhiteSpace(account.Email))
            throw new UnauthorizedException(TokenInvalid, "Google didn't accept that sign-in.");
        return account;
    }

    /// <summary>The email Greenlit stores and compares: trimmed, as Google gives it.</summary>
    public static string EmailOf(GoogleAccount account) => account.Email.Trim();

    /// <summary>The display name for an account created from Google: Google's name, or the email's local part when Google gives none.</summary>
    public static string NameOf(GoogleAccount account)
    {
        var name = account.Name?.Trim();
        if (!string.IsNullOrEmpty(name)) return name;
        var email = EmailOf(account);
        var at = email.IndexOf('@');
        return at > 0 ? email[..at] : email;
    }
}
