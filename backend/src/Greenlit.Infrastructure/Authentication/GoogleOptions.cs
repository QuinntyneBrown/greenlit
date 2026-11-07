namespace Greenlit.Infrastructure.Authentication;

/// <summary>Google sign-in settings (ADR-012): <c>Greenlit:Google</c>, with the client id also read from <c>GREENLIT_GOOGLE_CLIENT_ID</c>.</summary>
public sealed class GoogleOptions
{
    public const string SectionName = "Greenlit:Google";
    public const string ClientIdEnvironmentVariable = "GREENLIT_GOOGLE_CLIENT_ID";

    /// <summary>The reader behind <c>IGoogleAccounts</c>: <see cref="GoogleReader"/> (the default) or <see cref="FakeReader"/>.</summary>
    public const string GoogleReader = "Google";
    public const string FakeReader = "Fake";

    /// <summary>The OAuth 2.0 web client id, which every token's audience must match. Public: the browser compiles it in too.</summary>
    public string ClientId { get; set; } = string.Empty;

    /// <summary><see cref="GoogleReader"/> or <see cref="FakeReader"/>; the fake is for tests and the e2e API and is refused in Production.</summary>
    public string Accounts { get; set; } = GoogleReader;

    public bool UsesFake => Accounts.Equals(FakeReader, StringComparison.OrdinalIgnoreCase);
}
