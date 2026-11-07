using Greenlit.Domain.Enums;

namespace Greenlit.Domain.Entities;

/// <summary>
/// Who may change which day (ADR-003, L2-017): a member edits only their own row,
/// never sets Confirmed and never moves a Confirmed day; the manager does anything.
/// </summary>
public static class DayChangePolicy
{
    /// <summary>May the caller paint this row at all?</summary>
    public static bool MayEditRow(bool callerIsManager, Guid callerUserId, Guid? rowUserId) =>
        callerIsManager || rowUserId == callerUserId;

    /// <summary>May the caller move one day from <paramref name="current"/> to <paramref name="target"/> (null is a working day)?</summary>
    public static bool MayChange(bool callerIsManager, DayStatus? current, DayStatus? target) =>
        callerIsManager || (current != DayStatus.Confirmed && target != DayStatus.Confirmed);
}
