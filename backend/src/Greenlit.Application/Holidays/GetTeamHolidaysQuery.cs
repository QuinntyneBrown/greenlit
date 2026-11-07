using MediatR;

namespace Greenlit.Application.Holidays;

/// <summary>The holidays for the Work week &amp; holidays section of Settings (L2-036). Manager only.</summary>
public sealed record GetTeamHolidaysQuery : IRequest<TeamHolidaysDto>;

/// <summary>One holiday. <c>Date</c> is <c>yyyy-MM-dd</c>.</summary>
public sealed record HolidayDto(Guid Id, string Date, string Name);

/// <summary>
/// The current year's holidays in date order. <c>Source</c> names the public-holiday calendar the team
/// was created with ("Public holidays: United Kingdom"), null when it chose none.
/// </summary>
public sealed record TeamHolidaysDto(int Year, string? Source, IReadOnlyList<HolidayDto> Holidays);
