using Greenlit.Application.Abstractions;
using Greenlit.Application.Allowances;
using Greenlit.Application.Exceptions;
using Greenlit.Application.Requests;
using Greenlit.Domain.Entities;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.People;

/// <summary>
/// Stores an <see cref="AllowanceAdjustment"/> for a member of the caller's own team, dated today in the team's time
/// zone so it counts in the current leave year (L2-028, ADR-007). Only the manager may; a member of another team is
/// a 404, so nothing about other teams leaks. No balance is stored: the next read of the figures picks it up.
/// </summary>
public sealed class AddAdjustmentCommandHandler : IRequestHandler<AddAdjustmentCommand, AdjustmentDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly AllowanceCalculator _allowances;
    private readonly TimeProvider _time;

    public AddAdjustmentCommandHandler(IAppDbContext db, ICurrentUser currentUser, AllowanceCalculator allowances, TimeProvider time)
    {
        _db = db;
        _currentUser = currentUser;
        _allowances = allowances;
        _time = time;
    }

    public async Task<AdjustmentDto> Handle(AddAdjustmentCommand request, CancellationToken ct)
    {
        var team = await RequestCaller.FindManagedTeamAsync(_db, _currentUser, ct);
        var member = await _db.TeamMembers.AsNoTracking().SingleOrDefaultAsync(m => m.Id == request.MemberId && m.TeamId == team.Id, ct)
            ?? throw new NotFoundException("This person isn't on the team.") { Code = "person_not_found" };

        var adjustment = new AllowanceAdjustment
        {
            Id = Guid.NewGuid(),
            TeamMemberId = member.Id,
            Days = request.Days,
            Reason = request.Reason!.Trim(),
            EffectiveDate = _allowances.Today(team),
            CreatedUtc = _time.GetUtcNow(),
        };
        _db.AllowanceAdjustments.Add(adjustment);
        await _db.SaveChangesAsync(ct);
        return new AdjustmentDto(adjustment.Id, adjustment.Days, adjustment.Reason, adjustment.EffectiveDate);
    }
}
