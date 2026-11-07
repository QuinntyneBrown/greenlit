using System.Globalization;
using Greenlit.Application.Abstractions;
using Greenlit.Application.Allowances;
using Greenlit.Application.Exceptions;
using Greenlit.Application.Sheet;
using Greenlit.Application.Teams;
using Greenlit.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.People;

/// <summary>Builds a person's page for the caller (docs/detailed-designs/allowances/person-page).</summary>
public sealed class GetPersonQueryHandler : IRequestHandler<GetPersonQuery, PersonDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly AllowanceCalculator _allowances;

    public GetPersonQueryHandler(IAppDbContext db, ICurrentUser currentUser, AllowanceCalculator allowances)
    {
        _db = db;
        _currentUser = currentUser;
        _allowances = allowances;
    }

    public async Task<PersonDto> Handle(GetPersonQuery request, CancellationToken ct)
    {
        var userId = _currentUser.UserId ?? throw new NotFoundException("Team", "the signed-in user");

        var team = await _db.Teams.AsNoTracking()
            .Include(t => t.Members)
            .Where(t => t.ManagerUserId == userId || t.Members.Any(m => m.UserId == userId))
            .FirstOrDefaultAsync(ct)
            ?? throw new NotFoundException("Team", "the signed-in user");

        var isManager = team.ManagerUserId == userId;
        var member = (request.Id is { } id
                ? team.Members.FirstOrDefault(m => m.Id == id)
                : team.Members.FirstOrDefault(m => m.UserId == userId))
            ?? throw new NotFoundException("This person isn't on the team.") { Code = "person_not_found" };

        // L2-035 AC1: a member sees only their own page; the manager sees everyone's.
        var isYou = member.UserId == userId;
        if (!isManager && !isYou)
            throw new ForbiddenException("own_details_only", "Only your own details are visible.");

        var figures = (await _allowances.ComputeAsync(team, [member], ct))[member.Id];
        var (first, _) = AllowanceCalculator.LeaveYear(team, _allowances.Today(team));

        var year = first.Year;
        var from = new DateOnly(year, 1, 1);
        var to = new DateOnly(year, 12, 31);
        var statusOf = (await _db.TimeOffDays.AsNoTracking()
                .Where(d => d.TeamMemberId == member.Id && d.Date >= from && d.Date <= to)
                .Select(d => new { d.Date, d.Status })
                .ToListAsync(ct))
            .ToDictionary(d => d.Date, d => d.Status);
        var holidays = (await _db.Holidays.AsNoTracking()
                .Where(h => h.TeamId == team.Id && h.Date >= from && h.Date <= to)
                .Select(h => new { h.Date, h.Name })
                .ToListAsync(ct))
            .ToDictionary(h => h.Date, h => h.Name);
        var workingDays = WorkingDayRule.For(team, member);
        var months = Enumerable.Range(1, 12)
            .Select(month => new PersonMonthDto(
                month,
                Enumerable.Range(1, DateTime.DaysInMonth(year, month))
                    .Select(day => DayOf(new DateOnly(year, month, day), workingDays, holidays, statusOf))
                    .ToList()))
            .ToList();

        // Runs split at today as Used and Booked do: Taken is the confirmed days before it, Upcoming every day from it.
        var today = _allowances.Today(team);
        var days = months
            .SelectMany(m => m.Days.Select((d, i) => (Date: new DateOnly(year, m.Month, i + 1), d.Status)))
            .Where(d => d.Status != "off")
            .Select(d => (d.Date, Status: d.Status == "empty" ? null : d.Status))
            .ToList();
        var upcoming = RunBuilder.Build(days.Where(d => d.Date >= today).Select(d => (d.Date, Name(d.Status))));
        var taken = RunBuilder.Build(days.Where(d => d.Date < today).Select(d => (d.Date, d.Status == "confirmed" ? Name(d.Status) : null)))
            .Reverse().ToList();

        return new PersonDto(member.Id, member.Name, member.JobTitle, member.JoinedOn, WorkingDaysNames.ToNames(WorkingDayRule.For(team, member)), year, isYou, isManager, figures, figures.DaysOver(), months, upcoming, taken);
    }

    /// <summary>The status as the API spells a <see cref="DayStatus"/>: "Confirmed", not "confirmed".</summary>
    private static string? Name(string? status) => status is null ? null : char.ToUpperInvariant(status[0]) + status[1..];

    private static PersonDayDto DayOf(
        DateOnly date,
        WorkingDays workingDays,
        IReadOnlyDictionary<DateOnly, string> holidays,
        IReadOnlyDictionary<DateOnly, DayStatus> statusOf)
    {
        holidays.TryGetValue(date, out var holiday);
        var status =
            holiday is not null || WorkingDayRule.IsOffDay(date, workingDays) ? "off"
            : !statusOf.TryGetValue(date, out var s) ? "empty"
            : s.ToString().ToLower(CultureInfo.InvariantCulture);
        return new PersonDayDto(status, holiday);
    }
}
