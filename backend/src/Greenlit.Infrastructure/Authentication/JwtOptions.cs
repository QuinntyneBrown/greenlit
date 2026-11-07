namespace Greenlit.Infrastructure.Authentication;

public sealed class JwtOptions
{
    public const string SectionName = "Greenlit:Jwt";

    public string Issuer { get; set; } = "greenlit";
    public string Audience { get; set; } = "greenlit-clients";
    public string SigningKey { get; set; } = string.Empty;
    public int AccessTokenMinutes { get; set; } = 480;
}
