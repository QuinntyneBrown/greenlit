using MediatR;

namespace Greenlit.Application.Holidays;

/// <summary>Adds a team day off on <c>Date</c> (<c>yyyy-MM-dd</c>) (L2-037). Manager only.</summary>
public sealed record AddHolidayCommand(string? Date, string? Name) : IRequest<HolidayDto>;
