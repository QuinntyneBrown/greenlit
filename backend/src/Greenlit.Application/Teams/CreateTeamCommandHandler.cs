using Greenlit.Application.Abstractions;
using Greenlit.Application.Exceptions;
using Greenlit.Application.Invitations;
using Greenlit.Domain.Entities;
using Greenlit.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Greenlit.Application.Teams;

/// <summary>
/// Creates the caller's team in one unit of work (L2-008 AC5, AC6): the team,
/// the caller's own row first, one row per named member, and the chosen
/// country's holidays for this year and next in the team's time zone. The
/// caller becomes the manager and gets a session that names the team.
/// Every named member with an email is then sent an invitation (L2-008 AC5, L2-010); one that
/// cannot be sent is not counted and the manager can invite that person again from Settings.
/// </summary>
public sealed class CreateTeamCommandHandler : IRequestHandler<CreateTeamCommand, CreatedTeamDto>
{
    public const string TeamExists = "team_exists";

    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly IPublicHolidayProvider _holidays;
    private readonly ITokenService _tokens;
    private readonly TimeProvider _time;
    private readonly IEmailSender _email;
    private readonly InvitationIssuer _issuer;
    private readonly ILogger<CreateTeamCommandHandler> _logger;

    public CreateTeamCommandHandler(
        IAppDbContext db, ICurrentUser currentUser, IPublicHolidayProvider holidays, ITokenService tokens, TimeProvider time,
        IEmailSender email, InvitationIssuer issuer, ILogger<CreateTeamCommandHandler> logger)
    {
        _email = email;
        _issuer = issuer;
        _logger = logger;
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
            HolidayCountry = request.HolidayCountry == TeamOptions.NoHolidays ? null : request.HolidayCountry,
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
        var invited = await InviteAsync(team, user.DisplayName, ct);
        return new CreatedTeamDto(team.Id, team.Name, invited, _tokens.Issue(user, managerRow));
    }
    private async Task<int> InviteAsync(Team team, string managerName, CancellationToken ct)
    {
        var issued = team.Members
            .Where(m => m.UserId is null && m.Email is not null)
            .Select(m => _issuer.Issue(team, managerName, m, m.Email!))
            .ToList();
        if (issued.Count == 0) return 0;
        foreach (var i in issued) _db.Invitations.Add(i.Invitation);
        await _db.SaveChangesAsync(ct);

        var sent = 0;
        foreach (var i in issued)
        {
            try
            {
                await _email.SendAsync(i.Email, ct);
                sent++;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "The invitation for {Email} could not be sent.", i.Invitation.Email);
            }
        }
        return sent;
    }
}
