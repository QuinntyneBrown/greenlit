using MediatR;

namespace Greenlit.Application.Sheet;

/// <summary>One month of the caller's team as a sheet (L2-012). <c>Month</c> is <c>yyyy-MM</c>; null means the current month in the team's time zone.</summary>
public sealed record GetMonthQuery(string? Month) : IRequest<MonthDto>;

public sealed record MonthDto(
    string Month,
    string Today,
    bool IsManager,
    int? CoverageMinimum,
    IReadOnlyList<MemberRowDto> Members,
    IReadOnlyList<CoverageDto> Coverage);

public sealed record MemberRowDto(
    Guid Id,
    string Name,
    string Initials,
    bool IsYou,
    int? DaysLeft,
    IReadOnlyList<CellDto> Cells);

/// <summary>One member's day. <c>HolidayName</c> is set when <c>Kind</c> is <see cref="CellKind.Holiday"/>.</summary>
public sealed record CellDto(string Date, CellKind Kind, string? HolidayName);

/// <summary>
/// Red days are separate from time off, so a cell never needs a stored row to be red.
/// </summary>
public enum CellKind
{
    Working,
    NotWorking,
    Holiday,
    Tentative,
    Requested,
    Confirmed,
}

/// <summary>The Out row for one team working day: members out (requested or confirmed) and in.</summary>
public sealed record CoverageDto(string Date, int Out, int In, bool BelowMinimum);
