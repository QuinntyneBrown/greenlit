using Greenlit.Application.Abstractions;

namespace Greenlit.Infrastructure.Holidays;

/// <summary>
/// Public holidays worked out offline from each country's rules (ADR-005):
/// GB is England and Wales, IE Ireland, US the federal holidays. One-off
/// holidays a government declares are not in the rules; the manager adds them.
/// </summary>
public sealed class RuleBasedPublicHolidayProvider : IPublicHolidayProvider
{
    public IReadOnlyList<PublicHoliday> For(string country, int year) => country switch
    {
        "GB" => Substituted(
        [
            new(new DateOnly(year, 1, 1), "New Year's Day"),
            new(Easter(year).AddDays(-2), "Good Friday"),
            new(Easter(year).AddDays(1), "Easter Monday"),
            new(Nth(year, 5, DayOfWeek.Monday, 1), "Early May bank holiday"),
            new(Last(year, 5, DayOfWeek.Monday), "Spring bank holiday"),
            new(Last(year, 8, DayOfWeek.Monday), "Summer bank holiday"),
            new(new DateOnly(year, 12, 25), "Christmas Day"),
            new(new DateOnly(year, 12, 26), "Boxing Day"),
        ]),
        "IE" => Substituted(
        [
            new(new DateOnly(year, 1, 1), "New Year's Day"),
            new(StBrigidsDay(year), "St Brigid's Day"),
            new(new DateOnly(year, 3, 17), "St Patrick's Day"),
            new(Easter(year).AddDays(1), "Easter Monday"),
            new(Nth(year, 5, DayOfWeek.Monday, 1), "May bank holiday"),
            new(Nth(year, 6, DayOfWeek.Monday, 1), "June bank holiday"),
            new(Nth(year, 8, DayOfWeek.Monday, 1), "August bank holiday"),
            new(Last(year, 10, DayOfWeek.Monday), "October bank holiday"),
            new(new DateOnly(year, 12, 25), "Christmas Day"),
            new(new DateOnly(year, 12, 26), "St Stephen's Day"),
        ]),
        "US" => UnitedStates(year),
        _ => throw new ArgumentOutOfRangeException(nameof(country), country, "No public-holiday rules for this country."),
    };

    /// <summary>
    /// A holiday on a weekend moves to the next weekday that is not already a
    /// holiday (GB and IE), and is named "… (substitute)".
    /// </summary>
    private static List<PublicHoliday> Substituted(PublicHoliday[] holidays)
    {
        var result = holidays.Where(h => !IsWeekend(h.Date)).ToList();
        foreach (var holiday in holidays.Where(h => IsWeekend(h.Date)))
        {
            var date = holiday.Date;
            while (IsWeekend(date) || result.Any(h => h.Date == date)) date = date.AddDays(1);
            result.Add(new PublicHoliday(date, $"{holiday.Name} (substitute)"));
        }
        return result.OrderBy(h => h.Date).ToList();
    }

    /// <summary>The federal holidays on their observed days: a Saturday's on the Friday before, a Sunday's on the Monday after.</summary>
    private static List<PublicHoliday> UnitedStates(int year)
    {
        PublicHoliday[] rules(int y) =>
        [
            new(new DateOnly(y, 1, 1), "New Year's Day"),
            new(Nth(y, 1, DayOfWeek.Monday, 3), "Martin Luther King Jr. Day"),
            new(Nth(y, 2, DayOfWeek.Monday, 3), "Washington's Birthday"),
            new(Last(y, 5, DayOfWeek.Monday), "Memorial Day"),
            new(new DateOnly(y, 6, 19), "Juneteenth"),
            new(new DateOnly(y, 7, 4), "Independence Day"),
            new(Nth(y, 9, DayOfWeek.Monday, 1), "Labor Day"),
            new(Nth(y, 10, DayOfWeek.Monday, 2), "Columbus Day"),
            new(new DateOnly(y, 11, 11), "Veterans Day"),
            new(Nth(y, 11, DayOfWeek.Thursday, 4), "Thanksgiving Day"),
            new(new DateOnly(y, 12, 25), "Christmas Day"),
        ];

        // Next year's New Year's Day is observed on 31 December when it falls on a Saturday.
        return rules(year).Append(rules(year + 1)[0])
            .Select(h => h.Date.DayOfWeek switch
            {
                DayOfWeek.Saturday => new PublicHoliday(h.Date.AddDays(-1), $"{h.Name} (observed)"),
                DayOfWeek.Sunday => new PublicHoliday(h.Date.AddDays(1), $"{h.Name} (observed)"),
                _ => h,
            })
            .Where(h => h.Date.Year == year)
            .OrderBy(h => h.Date)
            .ToList();
    }

    /// <summary>The first Monday in February, or 1 February when that is a Friday.</summary>
    private static DateOnly StBrigidsDay(int year)
    {
        var first = new DateOnly(year, 2, 1);
        return first.DayOfWeek == DayOfWeek.Friday ? first : Nth(year, 2, DayOfWeek.Monday, 1);
    }

    private static bool IsWeekend(DateOnly date) => date.DayOfWeek is DayOfWeek.Saturday or DayOfWeek.Sunday;

    private static DateOnly Nth(int year, int month, DayOfWeek day, int n)
    {
        var date = new DateOnly(year, month, 1);
        while (date.DayOfWeek != day) date = date.AddDays(1);
        return date.AddDays(7 * (n - 1));
    }

    private static DateOnly Last(int year, int month, DayOfWeek day)
    {
        var date = new DateOnly(year, month, 1).AddMonths(1).AddDays(-1);
        while (date.DayOfWeek != day) date = date.AddDays(-1);
        return date;
    }

    /// <summary>Easter Sunday in the Gregorian calendar (the anonymous Gregorian algorithm).</summary>
    private static DateOnly Easter(int year)
    {
        int a = year % 19, b = year / 100, c = year % 100, d = b / 4, e = b % 4;
        int f = (b + 8) / 25, g = (b - f + 1) / 3, h = (19 * a + b - d - g + 15) % 30;
        int i = c / 4, k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = (a + 11 * h + 22 * l) / 451;
        int month = (h + l - 7 * m + 114) / 31, day = (h + l - 7 * m + 114) % 31 + 1;
        return new DateOnly(year, month, day);
    }
}
