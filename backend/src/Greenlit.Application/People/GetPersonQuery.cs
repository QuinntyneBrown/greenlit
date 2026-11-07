using Greenlit.Application.Allowances;
using MediatR;

namespace Greenlit.Application.People;

/// <summary>One person's page (L2-033): <c>Id</c> is a member's id, or null for the caller's own row.</summary>
public sealed record GetPersonQuery(Guid? Id) : IRequest<PersonDto>;

/// <summary>What a person's page shows (docs/detailed-designs/allowances/person-page).</summary>
public sealed record PersonDto(
    Guid Id,
    string Name,
    string? JobTitle,
    DateOnly? JoinedOn,
    IReadOnlyList<string> WorkingDays,
    int Year,
    string ManagerName,
    bool IsYou,
    bool CanManage,
    AllowanceFigures Allowance,
    int DaysOver,
    IReadOnlyList<PersonMonthDto> Months,
    IReadOnlyList<RunDto> Upcoming,
    IReadOnlyList<RunDto> Taken,
    IReadOnlyList<AdjustmentDto> Adjustments);

/// <summary>One allowance adjustment: days added (or removed, when negative), why, and from when.</summary>
public sealed record AdjustmentDto(Guid Id, int Days, string Reason, DateOnly EffectiveDate);

/// <summary>One month of the year at a glance; <c>Days</c> has one entry per calendar day.</summary>
public sealed record PersonMonthDto(int Month, IReadOnlyList<PersonDayDto> Days);

/// <summary>
/// One day: <c>off</c>, <c>empty</c>, <c>tentative</c>, <c>requested</c> or <c>confirmed</c>; <c>Holiday</c> names the
/// team holiday that makes it off, so the colour is never the only carrier.
/// </summary>
public sealed record PersonDayDto(string Status, string? Holiday);
