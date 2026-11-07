using Greenlit.Application.Abstractions;
using Greenlit.Application.Exceptions;
using Greenlit.Domain.Entities;
using Greenlit.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Teams;

/// <summary>
/// Creates the caller's team in one unit of work (L2-008 AC5, AC6): the team,
/// the caller's own row first, one row per named member, and the chosen
/// country's holidays for this year and next in the team's time zone. The
/// caller becomes the manager and gets a session that names the team.
/// Invitations arrive with journey 5 (L2-010).
/// </summary>
public sealed class CreateTeamCommandHandler : IRequestHandler<CreateTeamCommand, CreatedTeamDto>
{
    public const string TeamExists = "team_exists";

    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IPublicHolidayProvider _holidays;
    private readonly ITokenService _tokens;
    private readonly TimeProvider _time;

    public CreateTeamCommandHandler(
        IAppDbContext db, ICurrentUser currentUser, IPublicHolidayProvider holidays, ITokenService tokens, TimeProvider time)
    {
        _db = db;
        _currentUser = currentUser;
        _holidays = holidays;
        _tokens = tokens;
        _time = time;
    }

    public async Task<CreatedTeamDto> Handle(CreateTeamCommand request, CancellationToken ct)
    {
        var userId = _currentUser.UserId ?? throw new UnauthorizedException("unauthorized", "Sign in to create a team.");
        var user = await _db.Users.SingleOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new UnauthorizedException("unauthorized", "Sign in to create a team.");

        var onATeam = await _db.Teams.AnyAsync(t => t.ManagerUserId == userId, ct)
            || await _db.TeamMembers.AnyAsync(m => m.UserId == userId, ct);
        if (onATeam) throw new ConflictException(TeamExists, "You're already on a team.");

        var now = _time.GetUtcNow();
        var team = new Team
        {
            Id = Guid.NewGuid(),
            Name = request.Name!.Trim(),
            ManagerUserId = user.Id,
            TimeZone = request.TimeZone!,
            CreatedUtc = now,
        };

        var managerRow = new TeamMember
        {
            Id = Guid.NewGuid(), Name = user.DisplayName, Email = user.Email, UserId = user.Id, SortOrder = 0,
        };
        team.Members.Add(managerRow);
        foreach (var row in (request.Members ?? []).Where(r => !string.IsNullOrWhiteSpace(r.Name)))
        {
            team.Members.Add(new TeamMember
            {
                Id = Guid.NewGuid(),
                Name = row.Name!.Trim(),
                Email = string.IsNullOrWhiteSpace(row.Email) ? null : row.Email.Trim(),
                SortOrder = team.Members.Count,
            });
        }

        if (request.HolidayCountry != TeamOptions.NoHolidays)
        {
            var year = TimeZoneInfo.ConvertTime(now, TimeZoneInfo.FindSystemTimeZoneById(team.TimeZone)).Year;
            foreach (var holiday in _holidays.For(request.HolidayCountry!, year).Concat(_holidays.For(request.HolidayCountry!, year + 1)))
            {
                team.Holidays.Add(new Holiday { Id = Guid.NewGuid(), Date = holiday.Date, Name = holiday.Name });
            }
        }

        if (user.Role == UserRole.Member) user.Role = UserRole.Manager;
        _db.Teams.Add(team);
        await _db.SaveChangesAsync(ct);

        managerRow.TeamId = team.Id;
        return new CreatedTeamDto(team.Id, team.Name, Invited: 0, _tokens.Issue(user, managerRow));
    }
}
