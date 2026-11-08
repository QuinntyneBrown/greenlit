using FluentValidation;
using Greenlit.Application.Abstractions;
using Greenlit.Application.Allowances;
using Greenlit.Application.Requests;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Teams;

/// <summary>Turns the team's school calendar on or off (L2-059 AC2, docs/detailed-designs/teams/school-calendar). Manager only.</summary>
public sealed record SaveSchoolCalendarCommand(bool? SchoolCalendar) : IRequest<TeamSettingsDto>;

public sealed class SaveSchoolCalendarCommandValidator : AbstractValidator<SaveSchoolCalendarCommand>
{
    public SaveSchoolCalendarCommandValidator()
    {
        RuleFor(c => c.SchoolCalendar).NotNull().WithMessage("Say whether the school calendar is on.");
    }
}

/// <summary>Stores the switch only: turning it off deletes no child mark and no closure (L2-059 AC4, AC5).</summary>
public sealed class SaveSchoolCalendarCommandHandler : IRequestHandler<SaveSchoolCalendarCommand, TeamSettingsDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public SaveSchoolCalendarCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<TeamSettingsDto> Handle(SaveSchoolCalendarCommand request, CancellationToken ct)
    {
        var managed = await RequestCaller.FindManagedTeamAsync(_db, _currentUser, ct);
        var team = await _db.Teams.SingleAsync(t => t.Id == managed.Id, ct);
        team.SchoolCalendar = request.SchoolCalendar!.Value;
        await _db.SaveChangesAsync(ct);
        return await TeamSettings.ReadAsync(_db, team, ct);
    }
}
