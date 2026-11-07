namespace Greenlit.Domain.Enums;

/// <summary>The weekdays a team, or one member, works. The other weekdays are red (docs/detailed-designs/teams/working-days).</summary>
[Flags]
public enum WorkingDays
{
    None = 0,
    Mon = 1,
    Tue = 2,
    Wed = 4,
    Thu = 8,
    Fri = 16,
    Sat = 32,
    Sun = 64,

    /// <summary>The default work week.</summary>
    MonToFri = Mon | Tue | Wed | Thu | Fri,
}
