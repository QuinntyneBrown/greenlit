using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Greenlit.Application.Abstractions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Greenlit.Infrastructure.Authentication;

/// <summary>
/// Reads a Google account from Google itself (ADR-012): <c>tokeninfo</c> says who the token was issued to
/// and for, and <c>userinfo</c> adds the name. A token issued to another client, or one Google rejects,
/// reads as null. The access token is used for these two calls and never kept or logged.
/// </summary>
public sealed class GoogleAccounts : IGoogleAccounts
{
    private static readonly Uri TokenInfo = new("https://oauth2.googleapis.com/tokeninfo");
    private static readonly Uri UserInfo = new("https://www.googleapis.com/oauth2/v3/userinfo");
    private static readonly HttpClient Http = new() { Timeout = TimeSpan.FromSeconds(10) };

    private readonly GoogleOptions _options;
    private readonly ILogger<GoogleAccounts> _logger;

    public GoogleAccounts(IOptions<GoogleOptions> options, ILogger<GoogleAccounts> logger)
    {
        _options = options.Value;
        _logger = logger;
    }

    public async Task<GoogleAccount?> ReadAsync(string accessToken, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(accessToken) || accessToken.Any(char.IsWhiteSpace)) return null;
        try
        {
            using var infoRequest = new HttpRequestMessage(HttpMethod.Get, TokenInfo);
            infoRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
            using var infoResponse = await Http.SendAsync(infoRequest, ct);
            if (!infoResponse.IsSuccessStatusCode)
            {
                _logger.LogInformation("Google rejected an access token ({Status}).", (int)infoResponse.StatusCode);
                return null;
            }
            var info = await infoResponse.Content.ReadFromJsonAsync<TokenInfoDto>(ct);
            if (info is null || !IsOurs(info))
            {
                _logger.LogWarning("A Google access token for another client ({Audience}) was refused.", info?.Audience ?? info?.AuthorizedParty);
                return null;
            }

            using var userRequest = new HttpRequestMessage(HttpMethod.Get, UserInfo);
            userRequest.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
            using var userResponse = await Http.SendAsync(userRequest, ct);
            var user = userResponse.IsSuccessStatusCode ? await userResponse.Content.ReadFromJsonAsync<UserInfoDto>(ct) : null;

            var subject = info.Subject ?? user?.Subject;
            var email = info.Email ?? user?.Email;
            if (string.IsNullOrWhiteSpace(subject) || string.IsNullOrWhiteSpace(email)) return null;
            var verified = IsTrue(info.EmailVerified) || (info.EmailVerified is null && user?.EmailVerified == true);
            return new GoogleAccount(subject, email, verified, user?.Name);
        }
        catch (Exception ex) when (ex is HttpRequestException or TaskCanceledException or JsonException)
        {
            _logger.LogWarning(ex, "Google could not be asked about an access token.");
            return null;
        }
    }

    private bool IsOurs(TokenInfoDto info) =>
        !string.IsNullOrWhiteSpace(_options.ClientId)
        && (info.Audience == _options.ClientId || info.AuthorizedParty == _options.ClientId);

    /// <summary>tokeninfo answers <c>email_verified</c> as the string "true"; userinfo as a boolean.</summary>
    private static bool IsTrue(string? value) => string.Equals(value, "true", StringComparison.OrdinalIgnoreCase);

    private sealed class TokenInfoDto
    {
        [JsonPropertyName("aud")] public string? Audience { get; set; }
        [JsonPropertyName("azp")] public string? AuthorizedParty { get; set; }
        [JsonPropertyName("sub")] public string? Subject { get; set; }
        [JsonPropertyName("email")] public string? Email { get; set; }
        [JsonPropertyName("email_verified")] public string? EmailVerified { get; set; }
    }

    private sealed class UserInfoDto
    {
        [JsonPropertyName("sub")] public string? Subject { get; set; }
        [JsonPropertyName("email")] public string? Email { get; set; }
        [JsonPropertyName("email_verified")] public bool? EmailVerified { get; set; }
        [JsonPropertyName("name")] public string? Name { get; set; }
    }
}
