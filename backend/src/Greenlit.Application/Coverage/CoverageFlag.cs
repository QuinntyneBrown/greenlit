namespace Greenlit.Application.Coverage;

/// <summary>
/// The flag on an Out cell (L2-042): a working day is short when the team has a minimum above 0 and fewer
/// people are in than it. The month and the request detail both use this, so they flag the same days.
/// </summary>
internal static class CoverageFlag
{
    public static bool IsShort(int minimum, int peopleIn) => minimum > 0 && peopleIn < minimum;

    /// <summary>The minimum as the sheet reports it: null when the team has none.</summary>
    public static int? Minimum(int minimum) => minimum > 0 ? minimum : null;
}
