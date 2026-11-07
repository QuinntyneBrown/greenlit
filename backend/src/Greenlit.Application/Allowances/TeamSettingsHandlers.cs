using Greenlit.Application.Abstractions;
using Greenlit.Application.Requests;
using Greenlit.Application.Teams;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Allowances;

/// <summary>Reads the caller's team's allowance defaults; only its manager may (L2-027).</summary>
public sealed class GetTeamSettingsQueryHandler : IRequestHandler<GetTeamSettingsQuery, TeamSettingsDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public GetTeamSettingsQueryHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<TeamSettingsDto> Handle(GetTeamSettingsQuery request, CancellationToken ct)
    {
        var team = await RequestCaller.FindManagedTeamAsync(_db, _currentUser, ct);
        return await TeamSettings.ReadAsync(_db, team, ct);
    }
}

/// <summary>Saves the caller's team's allowance defaults; only its manager may (L2-027 AC1).</summary>
public sealed class SaveAllowanceDefaultsCommandHandler : IRequestHandler<SaveAllowanceDefaultsCommand, TeamSettingsDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public SaveAllowanceDefaultsCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<TeamSettingsDto> Handle(SaveAllowanceDefaultsCommand request, CancellationToken ct)
    {
        var managed = await RequestCaller.FindManagedTeamAsync(_db, _currentUser, ct);
        var team = await _db.Teams.SingleAsync(t => t.Id == managed.Id, ct);
        team.DefaultYearlyDays = request.DefaultYearlyDays!.Value;
        team.LeaveYearStartMonth = request.LeaveYearStartMonth!.Value;
        team.MaxCarryOver = request.MaxCarryOver!.Value;
        await _db.SaveChangesAsync(ct);
        return await TeamSettings.ReadAsync(_db, team, ct);
    }
}

internal static class TeamSettings
{
    public static async Task<TeamSettingsDto> ReadAsync(IAppDbContext db, Domain.Entities.Team team, CancellationToken ct) =>
        new(
            team.DefaultYearlyDays,
            team.LeaveYearStartMonth,
            team.MaxCarryOver,
            await db.TeamMembers.AsNoTracking().CountAsync(m => m.TeamId == team.Id && m.YearlyDays == null, ct),
            WorkingDaysNames.ToNames(team.WorkingDays),
            team.CoverageMinimum,
            await db.TeamMembers.AsNoTracking().CountAsync(m => m.TeamId == team.Id, ct));
}
