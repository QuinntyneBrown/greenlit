using Greenlit.Application.SchoolCalendar;
using Greenlit.Application.Abstractions;
using Greenlit.Application.Exceptions;
using Greenlit.Application.Requests;
using Greenlit.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Teams;

/// <summary>
/// Saves the caller's team's Team section (L2-009 AC2). Members are matched within the caller's team only,
/// so another team's member id is a 404. The team keeps its manager: their row cannot be made a Member.
/// </summary>
public sealed class SaveTeamSectionCommandHandler : IRequestHandler<SaveTeamSectionCommand, TeamSectionDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;

    public SaveTeamSectionCommandHandler(IAppDbContext db, ICurrentUser currentUser)
    {
        _db = db;
        _currentUser = currentUser;
    }

    public async Task<TeamSectionDto> Handle(SaveTeamSectionCommand request, CancellationToken ct)
    {
        var managed = await RequestCaller.FindManagedTeamAsync(_db, _currentUser, ct);
        var team = await _db.Teams.SingleAsync(t => t.Id == managed.Id, ct);
        var rows = await _db.TeamMembers.Where(m => m.TeamId == team.Id).ToListAsync(ct);

        var changes = new List<(Domain.Entities.TeamMember Row, UserRole Role, int? YearlyDays, bool? IsChild)>();
        foreach (var member in request.Members ?? [])
        {
            var row = rows.SingleOrDefault(r => r.Id == member.Id) ?? throw new NotFoundException("Member", member.Id);
            var role = Enum.Parse<UserRole>(member.Role!, ignoreCase: true);
            if (row.UserId == team.ManagerUserId && role != UserRole.Manager)
                throw new ValidationException("Members", "The team needs a manager.");
            // A child mark needs the school calendar on, and the manager is never a child (L2-060 AC8).
            if (member.IsChild == true && !row.IsChild && (!team.SchoolCalendar || row.UserId == team.ManagerUserId))
                throw new BadRequestException(SchoolCalendarRules.ChildNotAllowed, "Only members of a team with the school calendar on can be marked as children.");
            changes.Add((row, role, member.YearlyDays, member.IsChild));
        }

        team.Name = request.Name!.Trim();
        team.TimeZone = request.TimeZone!;
        foreach (var (row, role, yearlyDays, isChild) in changes)
        {
            row.Role = role;
            row.YearlyDays = yearlyDays;
            if (isChild is { } child) row.IsChild = child;
        }
        await _db.SaveChangesAsync(ct);
        return await TeamSection.ReadAsync(_db, team, canEdit: true, ct);
    }
}
