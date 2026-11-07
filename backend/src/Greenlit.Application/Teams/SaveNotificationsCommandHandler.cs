using Greenlit.Application.Abstractions;
using Greenlit.Application.Allowances;
using Greenlit.Application.Requests;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Teams;

/// <summary>Saves the caller's team's email switches (L2-043).</summary>
public sealed class SaveNotificationsCommandHandler : IRequestHandler<SaveNotificationsCommand, TeamSettingsDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public SaveNotificationsCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<TeamSettingsDto> Handle(SaveNotificationsCommand request, CancellationToken ct)
    {
        var managed = await RequestCaller.FindManagedTeamAsync(_db, _currentUser, ct);
        var team = await _db.Teams.SingleAsync(t => t.Id == managed.Id, ct);
        team.NotifyNewRequests = request.NewRequests!.Value;
        team.NotifyDecisions = request.Decisions!.Value;
        await _db.SaveChangesAsync(ct);
        return await TeamSettings.ReadAsync(_db, team, ct);
    }
}
