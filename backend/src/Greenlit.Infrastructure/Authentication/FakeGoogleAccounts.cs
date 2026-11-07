using System.Buffers.Text;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Greenlit.Application.Abstractions;

namespace Greenlit.Infrastructure.Authentication;

/// <summary>
/// Stands in for Google in the API tests and the e2e API (Greenlit:Google:Accounts=Fake, ADR-012): a token is
/// <c>fake-google.</c> followed by the account as base64url JSON (<c>sub</c>, <c>email</c>, <c>email_verified</c>,
/// <c>name</c>). Anything else reads as null, as a token Google rejects would. Refused in Production.
/// </summary>
public sealed class FakeGoogleAccounts : IGoogleAccounts
{
    public const string Prefix = "fake-google.";

    public Task<GoogleAccount?> ReadAsync(string accessToken, CancellationToken ct)
    {
        if (!accessToken.StartsWith(Prefix, StringComparison.Ordinal)) return Task.FromResult<GoogleAccount?>(null);
        try
        {
            var json = Encoding.UTF8.GetString(Base64Url.DecodeFromChars(accessToken.AsSpan(Prefix.Length)));
            var account = JsonSerializer.Deserialize<FakeAccount>(json);
            if (account?.Subject is null || account.Email is null) return Task.FromResult<GoogleAccount?>(null);
            return Task.FromResult<GoogleAccount?>(new GoogleAccount(account.Subject, account.Email, account.EmailVerified, account.Name));
        }
        catch (Exception ex) when (ex is FormatException or JsonException)
        {
            return Task.FromResult<GoogleAccount?>(null);
        }
    }

    private sealed class FakeAccount
    {
        [JsonPropertyName("sub")] public string? Subject { get; set; }
        [JsonPropertyName("email")] public string? Email { get; set; }
        [JsonPropertyName("email_verified")] public bool EmailVerified { get; set; } = true;
        [JsonPropertyName("name")] public string? Name { get; set; }
    }
}
