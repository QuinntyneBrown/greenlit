using FluentValidation;
using Greenlit.Application.Abstractions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Teams;

/// <summary>Make a team the caller manages their default team, the one sign-in opens (L2-054 AC4, ADR-014).</summary>
public sealed record SetDefaultTeamCommand(Guid? TeamId) : IRequest<Unit>;

public sealed class SetDefaultTeamCommandValidator : AbstractValidator<SetDefaultTeamCommand>
{
    public SetDefaultTeamCommandValidator()
    {
        RuleFor(c => c.TeamId).NotNull().WithMessage("Choose a team.");
    }
}

/// <summary>
/// Stores the default on the account, so there is exactly one by construction. It does not change the active team.
/// A team the caller does not manage is a 404 <c>team_not_found</c> and nothing changes (L2-054 AC8).
/// </summary>
public sealed class SetDefaultTeamCommandHandler : IRequestHandler<SetDefaultTeamCommand, Unit>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public SetDefaultTeamCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<Unit> Handle(SetDefaultTeamCommand request, CancellationToken ct)
    {
        var userId = _currentUser.UserId ?? throw ManagedTeams.NotFound();
        var teamId = request.TeamId!.Value;
        var manages = (await TeamChoice.ManagedTeamIdsAsync(_db, userId, ct)).Contains(teamId);
        if (!manages) throw ManagedTeams.NotFound();

        var user = await _db.Users.SingleAsync(u => u.Id == userId, ct);
        user.DefaultTeamId = teamId;
        await _db.SaveChangesAsync(ct);
        return Unit.Value;
    }
}
