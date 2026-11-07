using Greenlit.Domain.Enums;
using MediatR;

namespace Greenlit.Application.Sheet;

/// <summary>
/// One paint stroke (L2-015): set <c>Dates</c> (<c>yyyy-MM-dd</c>) on a member's row to
/// <c>Status</c> (<c>Tentative</c>, <c>Requested</c>, <c>Confirmed</c>), or null to clear them.
/// </summary>
public sealed record SetDaysCommand(Guid MemberId, IReadOnlyList<string>? Dates, string? Status) : IRequest<ChangeSetDto>;

/// <summary>Undo (L2-018 AC1): write each day's previous status back; a null status clears the day.</summary>
public sealed record RestoreDaysCommand(Guid MemberId, IReadOnlyList<RestoreDay>? Days) : IRequest<ChangeSetDto>;

public sealed record RestoreDay(string? Date, string? Status);

/// <summary>What a stroke changed: each day's status before and after, which Undo writes back.</summary>
public sealed record ChangeSetDto(Guid MemberId, string MemberName, DayStatus? Status, IReadOnlyList<DayChangeDto> Changes);

public sealed record DayChangeDto(string Date, DayStatus? Previous, DayStatus? Current);
