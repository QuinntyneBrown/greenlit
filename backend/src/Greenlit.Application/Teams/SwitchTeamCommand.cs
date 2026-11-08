using Greenlit.Application.Abstractions;
using Greenlit.Application.Auth;
using Greenlit.Application.Exceptions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Teams;

/// <summary>Make another team the caller manages the active team (L2-054 AC3, ADR-014).</summary>
public sealed record SwitchTeamCommand(Guid TeamId) : IRequest<SessionDto>;

/// <summary>A team the caller does not manage is a 404, the same whether it is someone else's, theirs as a member, or none (L2-054 AC8).</summary>
public static class ManagedTeams
{
    public const string NotFoundCode = "team_not_found";

    public static NotFoundException NotFound() => new("Team not found.") { Code = NotFoundCode };
}

/// <summary>
/// Issues a new session that names the chosen team and the caller's own live row on it. The previous session is left
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
            .FirstOrDefaultAsync(m => m.TeamId == request.TeamId && m.UserId == userId && m.Team.ManagerUserId == userId, ct)
            ?? throw ManagedTeams.NotFound();
        var user = await _db.Users.AsNoTracking().SingleAsync(u => u.Id == userId, ct);
        return _tokens.Issue(user, row);
    }
}
