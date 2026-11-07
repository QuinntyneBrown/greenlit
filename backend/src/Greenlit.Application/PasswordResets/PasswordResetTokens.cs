using System.Security.Cryptography;
using System.Text;

namespace Greenlit.Application.PasswordResets;

/// <summary>Makes and hashes reset tokens (ADR-010): 32 random bytes, base64url; only the SHA-256 hash is stored.</summary>
internal static class PasswordResetTokens
{
    public static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    public static string NewToken() =>
        Convert.ToBase64String(RandomNumberGenerator.GetBytes(32)).TrimEnd('=').Replace('+', '-').Replace('/', '_');
}
