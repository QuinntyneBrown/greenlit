using Greenlit.Application.Abstractions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Teams;

/// <summary>The teams the caller belongs to, for "Your teams" and the team switcher (L2-054, L2-056, docs/detailed-designs/teams/switch-team).</summary>
public sealed record GetMyTeamsQuery : IRequest<IReadOnlyList<MyTeamDto>>;

/// <summary>
/// One team the caller belongs to: <c>Active</c> when the session names it, <c>IsDefault</c> when sign-in opens it,
/// <c>Manages</c> when the caller is its manager ("Your teams" lists only those, L2-054 AC7).
/// </summary>
public sealed record MyTeamDto(Guid Id, string Name, bool Active, bool IsDefault, bool Manages);

/// <summary>
/// Lists only the teams the caller has a live row on, oldest first (ADR-015); a person on no team gets an empty list,
/// so no one learns anything about a team they are not on (L2-054 AC8).
/// </summary>
public sealed class GetMyTeamsQueryHandler : IRequestHandler<GetMyTeamsQuery, IReadOnlyList<MyTeamDto>>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public GetMyTeamsQueryHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<IReadOnlyList<MyTeamDto>> Handle(GetMyTeamsQuery request, CancellationToken ct)
    {
        if (_currentUser.UserId is not { } userId) return [];
        var ids = await TeamChoice.MembershipTeamIdsAsync(_db, userId, ct);
        if (ids.Count == 0) return [];

        var teams = await _db.Teams.AsNoTracking().Where(t => ids.Contains(t.Id))
            .ToDictionaryAsync(t => t.Id, t => new { t.Name, t.ManagerUserId }, ct);
        var active = await ActiveTeam.IdAsync(_db, _currentUser, ct);
        var defaultTeam = await TeamChoice.TeamIdAsync(_db, userId, ct);
        return ids.Select(id => new MyTeamDto(id, teams[id].Name, id == active, id == defaultTeam, teams[id].ManagerUserId == userId)).ToList();
    }
}
