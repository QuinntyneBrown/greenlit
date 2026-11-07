using MediatR;

namespace Greenlit.Application.Sheet;

/// <summary>One month of the caller's team as a sheet (L2-012). <c>Month</c> is <c>yyyy-MM</c>; null means the current month in the team's time zone.</summary>
public sealed record GetMonthQuery(string? Month) : IRequest<MonthDto>;

public sealed record MonthDto(
    string Month,
    string Today,
    bool IsManager,
    int? CoverageMinimum,
    IReadOnlyList<MemberRowDto> Members);

public sealed record MemberRowDto(
    Guid Id,
    string Name,
    string Initials,
    bool IsYou,
    int? DaysLeft);
