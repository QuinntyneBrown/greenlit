using Greenlit.Application.Abstractions;
using Microsoft.Extensions.Configuration;

namespace Greenlit.Infrastructure.Email;

/// <summary>The link is <c>{Greenlit:App:Origin}/accept-invite/{token}</c>; the origin defaults to the Angular dev server.</summary>
public sealed class InvitationLinks : IInvitationLinks
{
    public const string OriginKey = "Greenlit:App:Origin";
    public const string DefaultOrigin = "http://localhost:4200";

    private readonly string _origin;

    public InvitationLinks(IConfiguration configuration) =>
        _origin = (configuration[OriginKey] is { Length: > 0 } o ? o : DefaultOrigin).TrimEnd('/');

    public string For(string token) => $"{_origin}/accept-invite/{token}";
}
