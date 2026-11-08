using Greenlit.Application.Abstractions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Teams;

/// <summary>The teams the caller manages, for "Your teams" and the team switcher (L2-054, docs/detailed-designs/teams/switch-team).</summary>
public sealed record GetMyTeamsQuery : IRequest<IReadOnlyList<MyTeamDto>>;

/// <summary>One team the caller manages: <c>Active</c> when the session names it, <c>IsDefault</c> when sign-in opens it.</summary>
public sealed record MyTeamDto(Guid Id, string Name, bool Active, bool IsDefault);

/// <summary>
/// Lists only teams whose manager is the caller, oldest first; anyone who manages no team gets an empty list, so a
/// member learns nothing about other teams (L2-054 AC7, AC8).
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
        var ids = await TeamChoice.ManagedTeamIdsAsync(_db, userId, ct);
        if (ids.Count == 0) return [];

        var names = await _db.Teams.AsNoTracking().Where(t => ids.Contains(t.Id)).ToDictionaryAsync(t => t.Id, t => t.Name, ct);
        var active = await ActiveTeam.IdAsync(_db, _currentUser, ct);
        var defaultTeam = await TeamChoice.TeamIdAsync(_db, userId, ct);
        return ids.Select(id => new MyTeamDto(id, names[id], id == active, id == defaultTeam)).ToList();
    }
}
