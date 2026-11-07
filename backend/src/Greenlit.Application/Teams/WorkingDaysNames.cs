using Greenlit.Domain.Enums;

namespace Greenlit.Application.Teams;

/// <summary>The API spells working days as "Mon".."Sun", in week order.</summary>
public static class WorkingDaysNames
{
    private static readonly WorkingDays[] Week =
    [
        WorkingDays.Mon, WorkingDays.Tue, WorkingDays.Wed, WorkingDays.Thu,
        WorkingDays.Fri, WorkingDays.Sat, WorkingDays.Sun,
    ];

    public static IReadOnlyList<string> ToNames(WorkingDays days) =>
        Week.Where(d => days.HasFlag(d)).Select(d => d.ToString()).ToList();

    /// <summary>Null when any name is not a weekday abbreviation.</summary>
    public static WorkingDays? Parse(IEnumerable<string> names)
    {
        var days = WorkingDays.None;
        foreach (var name in names)
        {
            var match = Week.Where(d => d.ToString() == name).Select(d => (WorkingDays?)d).FirstOrDefault();
            if (match is null) return null;
            days |= match.Value;
        }
        return days;
    }
}
