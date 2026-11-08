using Greenlit.Application.Abstractions;
using Greenlit.Application.Requests;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Teams;

/// <summary>Reads the caller's own team's Team section, whoever on the team asks (L2-009 AC1, AC3).</summary>
public sealed class GetTeamSectionQueryHandler : IRequestHandler<GetTeamSectionQuery, TeamSectionDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public GetTeamSectionQueryHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<TeamSectionDto> Handle(GetTeamSectionQuery request, CancellationToken ct)
    {
        var (team, _) = await RequestCaller.FindAsync(_db, _currentUser, ct);
        return await TeamSection.ReadAsync(_db, team, _currentUser.UserId == team.ManagerUserId, ct);
    }
}

internal static class TeamSection
{
    public static async Task<TeamSectionDto> ReadAsync(IAppDbContext db, Domain.Entities.Team team, bool canEdit, CancellationToken ct)
    {
        var rows = await db.TeamMembers.AsNoTracking()
            .Where(m => m.TeamId == team.Id)
            .OrderBy(m => m.SortOrder)
            .ToListAsync(ct);
        return new TeamSectionDto(
            team.Name,
            team.TimeZone,
            canEdit,
            await RequestCaller.ManagerNameAsync(db, team, ct),
            rows.Select(m => new TeamSectionMemberDto(m.Id, m.Name, m.Email, (m.UserId == team.ManagerUserId ? Domain.Enums.UserRole.Manager : m.Role).ToString(), m.YearlyDays, m.IsChild, m.UserId == team.ManagerUserId)).ToList(),
            team.SchoolCalendar);
    }
}
