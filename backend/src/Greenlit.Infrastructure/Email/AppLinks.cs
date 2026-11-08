using Greenlit.Application.Abstractions;
using Microsoft.Extensions.Configuration;

namespace Greenlit.Infrastructure.Email;

/// <summary>The app's origin from <c>Greenlit:App:Origin</c>, defaulting to the Angular dev server like the other link builders.</summary>
public sealed class AppLinks : IAppLinks
{
    public AppLinks(IConfiguration configuration) =>
        Origin = (configuration[InvitationLinks.OriginKey] is { Length: > 0 } o ? o : InvitationLinks.DefaultOrigin).TrimEnd('/');

    public string Origin { get; }
}
