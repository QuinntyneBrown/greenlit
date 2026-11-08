using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Greenlit.Application.Abstractions;

namespace Greenlit.Api.Authentication;

/// <summary>Reads the caller's user id from the bearer token on the current request.</summary>
public sealed class HttpCurrentUser : ICurrentUser
{
    private readonly IHttpContextAccessor _http;

    public HttpCurrentUser(IHttpContextAccessor http) => _http = http;

    public Guid? UserId
    {
        get
        {
            var user = _http.HttpContext?.User;
            var id = user?.FindFirstValue(JwtRegisteredClaimNames.Sub) ?? user?.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(id, out var parsed) ? parsed : null;
        }
    }

    public Guid? TeamId =>
        Guid.TryParse(_http.HttpContext?.User.FindFirstValue("team_id"), out var parsed) ? parsed : null;
}
