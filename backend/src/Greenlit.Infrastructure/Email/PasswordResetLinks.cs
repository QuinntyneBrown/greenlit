using Greenlit.Application.Abstractions;
using Microsoft.Extensions.Configuration;

namespace Greenlit.Infrastructure.Email;

/// <summary>The link is <c>{Greenlit:App:Origin}/reset-password/{token}</c>.</summary>
public sealed class PasswordResetLinks : IPasswordResetLinks
{
    private readonly string _origin;

    public PasswordResetLinks(IConfiguration configuration) =>
        _origin = (configuration[InvitationLinks.OriginKey] is { Length: > 0 } o ? o : InvitationLinks.DefaultOrigin).TrimEnd('/');

    public string For(string token) => $"{_origin}/reset-password/{token}";
}
