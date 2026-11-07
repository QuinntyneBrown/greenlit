using System.Buffers.Text;
using System.Text;
using System.Text.Json;

namespace Greenlit.Api.Tests.Support;

/// <summary>
/// Access tokens the API's <c>FakeGoogleAccounts</c> reads (Greenlit:Google:Accounts=Fake, ADR-012):
/// <c>fake-google.</c> followed by the account as base64url JSON. The tests stand in for Google with them.
/// </summary>
public static class FakeGoogle
{
    public const string Prefix = "fake-google.";

    public static string Token(string subject, string email, string name, bool emailVerified = true)
    {
        var json = JsonSerializer.Serialize(new { sub = subject, email, email_verified = emailVerified, name });
        return Prefix + Base64Url.EncodeToString(Encoding.UTF8.GetBytes(json));
    }
}
