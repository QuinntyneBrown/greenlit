using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Greenlit.Application.Abstractions;
using Greenlit.Application.Auth;
using Greenlit.Domain.Entities;
using Greenlit.Domain.Enums;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;

namespace Greenlit.Infrastructure.Authentication;

/// <summary>Signs the session JWT with <see cref="JwtOptions"/> (ADR-004).</summary>
public sealed class JwtTokenService : ITokenService
{
    private readonly JwtOptions _options;
    private readonly TimeProvider _time;

    public JwtTokenService(IOptions<JwtOptions> options, TimeProvider time)
    {
        _options = options.Value;
        _time = time;
    }

    public SessionDto Issue(User user, TeamMember? member, UserRole role)
    {
        var now = _time.GetUtcNow();
        var expires = now.AddMinutes(_options.AccessTokenMinutes);
        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
            new("role", role.ToString()),
        };
        if (member is not null)
        {
            claims.Add(new Claim("team_id", member.TeamId.ToString()));
            claims.Add(new Claim("team_member_id", member.Id.ToString()));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_options.SigningKey));
        var token = new JwtSecurityToken(
            issuer: _options.Issuer,
            audience: _options.Audience,
            claims: claims,
            notBefore: now.UtcDateTime,
            expires: expires.UtcDateTime,
            signingCredentials: new SigningCredentials(key, SecurityAlgorithms.HmacSha256));

        return new SessionDto(
            new JwtSecurityTokenHandler().WriteToken(token),
            expires,
            user.Id,
            user.DisplayName,
            role,
            member?.TeamId);
    }
}
