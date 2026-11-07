using Greenlit.Application.Abstractions;
using Greenlit.Application.Allowances;
using Greenlit.Application.Exceptions;
using Greenlit.Application.Requests;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Teams;

/// <summary>
/// Saves the caller's team's coverage minimum (L2-041 AC2): between 0 and the number of people on the team.
/// </summary>
public sealed class SaveCoverageCommandHandler : IRequestHandler<SaveCoverageCommand, TeamSettingsDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public SaveCoverageCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<TeamSettingsDto> Handle(SaveCoverageCommand request, CancellationToken ct)
    {
        var managed = await RequestCaller.FindManagedTeamAsync(_db, _currentUser, ct);
        var size = await _db.TeamMembers.CountAsync(m => m.TeamId == managed.Id, ct);
        var minimum = request.Minimum!.Value;
        if (minimum < 0 || minimum > size)
            throw new ValidationException("Minimum", $"Choose between 0 and {size} people.");

        var team = await _db.Teams.SingleAsync(t => t.Id == managed.Id, ct);
        team.CoverageMinimum = minimum;
        await _db.SaveChangesAsync(ct);
        return await TeamSettings.ReadAsync(_db, team, ct);
    }
}
