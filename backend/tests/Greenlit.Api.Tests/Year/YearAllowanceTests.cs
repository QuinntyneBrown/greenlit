using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Domain.Enums;

namespace Greenlit.Api.Tests.Year;

/// <summary>
/// The allowance figures on GET /api/year (L2-032 AC1, figures of L2-029). Design:
/// docs/detailed-designs/allowances/year-overview. "Today" is Friday 6 November 2026.
/// </summary>
public class YearAllowanceTests : IClassFixture<FrozenClockApiFactory>
{
    private readonly FrozenClockApiFactory _factory;

    public YearAllowanceTests(FrozenClockApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Ana_has_28_days_of_which_14_are_used_none_booked_5_requested_leaving_14()
    {
        // L2-032 AC1: the table's columns are the figures of L2-029.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.SetYearlyDaysAsync("Ana Ruiz", 25);
        await team.AddAdjustmentAsync("Ana Ruiz", 3, new DateOnly(2026, 1, 1));
        foreach (var day in Weekdays(new DateOnly(2026, 7, 13), new DateOnly(2026, 7, 24))) await team.SetDayAsync("Ana Ruiz", day, DayStatus.Confirmed);
        foreach (var day in Weekdays(new DateOnly(2026, 4, 7), new DateOnly(2026, 4, 10))) await team.SetDayAsync("Ana Ruiz", day, DayStatus.Confirmed);
        foreach (var day in Weekdays(new DateOnly(2026, 11, 16), new DateOnly(2026, 11, 20))) await team.SetDayAsync("Ana Ruiz", day, DayStatus.Requested);

        var allowance = Member("Ana Ruiz", await YearGridTests.YearAsync(team.ClientFor("Maya Chen"), 2026));

        allowance.GetProperty("allowance").GetInt32().Should().Be(28);
        allowance.GetProperty("used").GetInt32().Should().Be(14);
        allowance.GetProperty("booked").GetInt32().Should().Be(0);
        allowance.GetProperty("requested").GetInt32().Should().Be(5);
        allowance.GetProperty("left").GetInt32().Should().Be(14);
    }

    [Fact]
    public async Task A_member_sees_the_same_figures_as_the_manager()
    {
        // The year page shows every row to every member (design decision).
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Ben Okafor");
        await team.SetYearlyDaysAsync("Ben Okafor", 27);

        var year = await YearGridTests.YearAsync(team.ClientFor("Ana Ruiz"), 2026);

        Member("Ben Okafor", year).GetProperty("left").GetInt32().Should().Be(27);
    }

    [Fact]
    public async Task The_figures_are_for_the_year_asked_for()
    {
        // A past year is all Used, a future year all Booked; days of other years are left out.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Cleo Park");
        await team.SetYearlyDaysAsync("Cleo Park", 25);
        await team.SetDayAsync("Cleo Park", new DateOnly(2025, 3, 3), DayStatus.Confirmed);
        await team.SetDayAsync("Cleo Park", new DateOnly(2027, 3, 1), DayStatus.Confirmed);
        await team.SetDayAsync("Cleo Park", new DateOnly(2026, 3, 2), DayStatus.Confirmed);

        var client = team.ClientFor("Maya Chen");

        var last = Member("Cleo Park", await YearGridTests.YearAsync(client, 2025));
        last.GetProperty("used").GetInt32().Should().Be(1);
        last.GetProperty("booked").GetInt32().Should().Be(0);
        last.GetProperty("left").GetInt32().Should().Be(24);
        var next = Member("Cleo Park", await YearGridTests.YearAsync(client, 2027));
        next.GetProperty("used").GetInt32().Should().Be(0);
        next.GetProperty("booked").GetInt32().Should().Be(1);
        next.GetProperty("left").GetInt32().Should().Be(24);
    }

    [Fact]
    public async Task A_leave_year_that_starts_in_april_is_the_one_starting_in_the_year_asked_for()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Finn Murphy");
        await team.SetYearlyDaysAsync("Finn Murphy", 22);
        await team.SetDefaultsAsync(yearlyDays: 25, leaveYearStartMonth: 4);
        await team.SetDayAsync("Finn Murphy", new DateOnly(2026, 3, 2), DayStatus.Confirmed); // leave year 2025
        await team.SetDayAsync("Finn Murphy", new DateOnly(2026, 5, 4), DayStatus.Confirmed); // leave year 2026
        await team.SetDayAsync("Finn Murphy", new DateOnly(2027, 2, 1), DayStatus.Confirmed); // leave year 2026

        var finn = Member("Finn Murphy", await YearGridTests.YearAsync(team.ClientFor("Maya Chen"), 2026));

        finn.GetProperty("used").GetInt32().Should().Be(1);
        finn.GetProperty("booked").GetInt32().Should().Be(1);
        finn.GetProperty("left").GetInt32().Should().Be(20);
    }

    private static System.Text.Json.JsonElement Member(string name, System.Text.Json.JsonElement year) =>
        YearGridTests.Member(year, name).GetProperty("allowance");

    private static IEnumerable<DateOnly> Weekdays(DateOnly first, DateOnly last)
    {
        for (var d = first; d <= last; d = d.AddDays(1))
            if (d.DayOfWeek is not (DayOfWeek.Saturday or DayOfWeek.Sunday)) yield return d;
    }
}
