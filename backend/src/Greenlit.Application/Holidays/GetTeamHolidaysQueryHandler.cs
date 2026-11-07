using Greenlit.Application.Abstractions;
using Greenlit.Application.Requests;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Application.Holidays;

/// <summary>Reads the caller's team's holidays for the current year in the team's time zone; only its manager may (L2-036).</summary>
public sealed class GetTeamHolidaysQueryHandler : IRequestHandler<GetTeamHolidaysQuery, TeamHolidaysDto>
{
    private readonly IAppDbContext _db;
    private readonly ICurrentUser _currentUser;
    private readonly TimeProvider _time;

    public GetTeamHolidaysQueryHandler(IAppDbContext db, ICurrentUser currentUser, TimeProvider time)
    {
        _db = db;
        _currentUser = currentUser;
        _time = time;
    }

    public async Task<TeamHolidaysDto> Handle(GetTeamHolidaysQuery request, CancellationToken ct)
    {
        var team = await RequestCaller.FindManagedTeamAsync(_db, _currentUser, ct);
        var year = TimeZoneInfo.ConvertTime(_time.GetUtcNow(), TimeZoneInfo.FindSystemTimeZoneById(team.TimeZone)).Year;
        var holidays = await _db.Holidays.AsNoTracking()
            .Where(h => h.TeamId == team.Id && h.Date.Year == year)
            .OrderBy(h => h.Date)
            .ToListAsync(ct);
        return new TeamHolidaysDto(
            year,
            SourceOf(team.HolidayCountry),
            holidays.Select(h => new HolidayDto(h.Id, h.Date.ToString("yyyy-MM-dd"), h.Name)).ToList());
    }

    private static string? SourceOf(string? country) => country switch
    {
        "GB" => "Public holidays: United Kingdom",
        "IE" => "Public holidays: Ireland",
        "US" => "Public holidays: United States",
        _ => null,
    };
}
