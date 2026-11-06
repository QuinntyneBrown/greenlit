namespace Greenlit.Domain.Enums;

/// <summary>
/// The colour a day carries in the team's sheet. Every day that is not a
/// weekend or a holiday starts as a working day and moves through the three
/// time-off states.
/// </summary>
public enum DayStatus
{
    /// <summary>Blue in the sheet: pencilled in by the team member, not yet requested.</summary>
    Tentative,

    /// <summary>Yellow in the sheet: requested, waiting on the manager.</summary>
    Requested,

    /// <summary>Green in the sheet: confirmed time off.</summary>
    Confirmed,
}
