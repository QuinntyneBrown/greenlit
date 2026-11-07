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
    private readonly IPublicHolidayProvider _publicHolidays;

    public GetTeamHolidaysQueryHandler(IAppDbContext db, ICurrentUser currentUser, TimeProvider time, IPublicHolidayProvider publicHolidays)
    {
        _publicHolidays = publicHolidays;
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
            holidays.Select(h => new HolidayDto(h.Id, h.Date.ToString("yyyy-MM-dd"), h.Name)).ToList(),
            await ReviewAsync(team, year + 1, ct));
    }

    /// <summary>
    /// Next year's holidays of the team's calendar, when it has them and the team holds none of that year; a removed
    /// holiday counts as held, so a manager who removed them is not asked again.
    /// </summary>
    private async Task<HolidayReviewDto?> ReviewAsync(Domain.Entities.Team team, int year, CancellationToken ct)
    {
        if (team.HolidayCountry is not { } country || _publicHolidays.For(country, year).Count == 0) return null;
        var held = await _db.Holidays.IgnoreQueryFilters().AsNoTracking()
            .AnyAsync(h => h.TeamId == team.Id && h.Date.Year == year, ct);
        return held ? null : new HolidayReviewDto(year, $"{year} {ReviewNameOf(country)}");
    }

    private static string ReviewNameOf(string country) => country switch
    {
        "IE" => "Irish public holidays",
        "US" => "US federal holidays",
        _ => "UK bank holidays",
    };

    private static string? SourceOf(string? country) => country switch
    {
        "GB" => "Public holidays: United Kingdom",
        "IE" => "Public holidays: Ireland",
        "US" => "Public holidays: United States",
        _ => null,
    };
}
