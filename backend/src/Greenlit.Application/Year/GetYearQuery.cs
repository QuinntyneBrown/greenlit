using Greenlit.Application.Allowances;
using MediatR;

namespace Greenlit.Application.Year;

/// <summary>The caller's team for one calendar year (L2-031, L2-032). <c>Year</c> is required.</summary>
public sealed record GetYearQuery(int? Year) : IRequest<YearDto>;

public sealed record YearDto(int Year, bool IsManager, IReadOnlyList<YearMemberDto> Members);

/// <summary>One member's year: twelve months and the allowance for the leave year that starts in it.</summary>
public sealed record YearMemberDto(
    Guid Id,
    string Name,
    string Initials,
    bool IsYou,
    IReadOnlyList<YearMonthDto> Months,
    AllowanceFigures Allowance);

/// <summary>
/// One month of a member's row. <c>Confirmed</c> counts confirmed working days; <c>Days</c> has one entry per
/// calendar day: <c>off</c>, <c>empty</c>, <c>tentative</c>, <c>requested</c> or <c>confirmed</c>.
/// </summary>
public sealed record YearMonthDto(int Month, int Confirmed, IReadOnlyList<string> Days);
