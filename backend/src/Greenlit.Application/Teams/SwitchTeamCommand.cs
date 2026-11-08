using Greenlit.Application.Abstractions;
using Greenlit.Application.Auth;
using Greenlit.Application.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Teams;

/// <summary>Make another team the caller belongs to the active team (L2-054 AC3, L2-056 AC3; ADR-014, ADR-015).</summary>
public sealed record SwitchTeamCommand(Guid TeamId) : IRequest<SessionDto>;

/// <summary>A team the caller may not use is a 404, the same whether it is someone else's or none (L2-054 AC8).</summary>
public static class ManagedTeams
{
    public const string NotFoundCode = "team_not_found";

    public static NotFoundException NotFound() => new("Team not found.") { Code = NotFoundCode };
}

/// <summary>
/// Issues a new session that names the chosen team and the caller's own live row on it, with the caller's role on that
/// team (ADR-015); a team the caller has no live row on is a 404. The previous session is left
/// alone and keeps naming its team until it expires, so a switch on one device never signs out another (AC10).
/// </summary>
public sealed class SwitchTeamCommandHandler : IRequestHandler<SwitchTeamCommand, SessionDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly ITokenService _tokens;

    public SwitchTeamCommandHandler(IAppDbContext db, ICurrentUser currentUser, ITokenService tokens)
    {
        _db = db;
        _currentUser = currentUser;
        _tokens = tokens;
    }

    public async Task<SessionDto> Handle(SwitchTeamCommand request, CancellationToken ct)
    {
        var userId = _currentUser.UserId ?? throw ManagedTeams.NotFound();
        var row = await _db.TeamMembers.AsNoTracking()
            .FirstOrDefaultAsync(m => m.TeamId == request.TeamId && m.UserId == userId, ct)
            ?? throw ManagedTeams.NotFound();
        var user = await _db.Users.AsNoTracking().SingleAsync(u => u.Id == userId, ct);
        return await Sessions.IssueAsync(_db, _tokens, user, row, ct);
    }
}
