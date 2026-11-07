using Greenlit.Application.Abstractions;
using Greenlit.Application.Allowances;
using Greenlit.Application.Requests;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Teams;

/// <summary>
/// Saves the caller's team's work week (L2-039). Stored days on the weekdays that become red are kept:
/// they read "Not working" and count nowhere (docs/detailed-designs/teams/working-days).
/// </summary>
public sealed class SaveWorkWeekCommandHandler : IRequestHandler<SaveWorkWeekCommand, TeamSettingsDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public SaveWorkWeekCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<TeamSettingsDto> Handle(SaveWorkWeekCommand request, CancellationToken ct)
    {
        var managed = await RequestCaller.FindManagedTeamAsync(_db, _currentUser, ct);
        var team = await _db.Teams.SingleAsync(t => t.Id == managed.Id, ct);
        team.WorkingDays = WorkingDaysNames.Parse(request.Days!)!.Value;
        await _db.SaveChangesAsync(ct);
        return await TeamSettings.ReadAsync(_db, team, ct);
    }
}
