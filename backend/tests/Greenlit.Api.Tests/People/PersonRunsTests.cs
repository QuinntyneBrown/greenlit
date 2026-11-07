using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Domain.Enums;
using System.Text.Json;

namespace Greenlit.Api.Tests.People;

/// <summary>
/// Upcoming and Taken runs (L2-033 AC3). A run is consecutive working days with the same status, so a
/// weekend or a holiday inside it does not split it. "Today" is Friday 6 November 2026.
/// </summary>
public class PersonRunsTests : IClassFixture<FrozenClockApiFactory>
{
    private readonly FrozenClockApiFactory _factory;

    public PersonRunsTests(FrozenClockApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Taken_lists_past_confirmed_runs_newest_first_across_weekends()
    {
        // L2-033 AC3: "Taken in 2026" lists past confirmed runs, newest first, e.g. 4-5 Nov 2 days.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await Confirm(team, new DateOnly(2026, 1, 2), new DateOnly(2026, 1, 2));
        await Confirm(team, new DateOnly(2026, 7, 13), new DateOnly(2026, 7, 24));
        await Confirm(team, new DateOnly(2026, 11, 4), new DateOnly(2026, 11, 5));

        var person = await PersonFiguresTests.PersonAsync(team.ClientFor("Maya Chen"), team.MemberIdOf("Ana Ruiz"));

        Runs(person, "taken").Should().Equal(
            "2026-11-04 2026-11-05 2 Confirmed",
            "2026-07-13 2026-07-24 10 Confirmed",
            "2026-01-02 2026-01-02 1 Confirmed");
    }

    [Fact]
    public async Task Upcoming_lists_the_days_from_today_on_in_date_order_of_every_status()
    {
        // L2-033 AC3: "Upcoming" lists future runs with their range, days and status.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await Confirm(team, new DateOnly(2026, 11, 6), new DateOnly(2026, 11, 9));
        foreach (var day in new[] { 16, 17, 18, 19, 20 }) await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 11, day), DayStatus.Requested);
        foreach (var day in new[] { 29, 30, 31 }) await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 12, day), DayStatus.Tentative);

        var person = await PersonFiguresTests.PersonAsync(team.ClientFor("Maya Chen"), team.MemberIdOf("Ana Ruiz"));

        Runs(person, "upcoming").Should().Equal(
            "2026-11-06 2026-11-09 2 Confirmed",
            "2026-11-16 2026-11-20 5 Requested",
            "2026-12-29 2026-12-31 3 Tentative");
        Runs(person, "taken").Should().BeEmpty();
    }

    [Fact]
    public async Task A_holiday_inside_a_run_does_not_split_it_and_is_not_counted()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddHolidayAsync(new DateOnly(2026, 12, 25), "Christmas Day");
        await team.AddHolidayAsync(new DateOnly(2026, 12, 28), "Boxing Day (substitute)");
        foreach (var day in new[] { 24, 29 }) await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 12, day), DayStatus.Tentative);

        var person = await PersonFiguresTests.PersonAsync(team.ClientFor("Maya Chen"), team.MemberIdOf("Ana Ruiz"));

        Runs(person, "upcoming").Should().Equal("2026-12-24 2026-12-29 2 Tentative");
    }

    private static async Task Confirm(TestTeam team, DateOnly first, DateOnly last)
    {
        for (var date = first; date <= last; date = date.AddDays(1))
            if (date.DayOfWeek is not (DayOfWeek.Saturday or DayOfWeek.Sunday)) await team.SetDayAsync("Ana Ruiz", date, DayStatus.Confirmed);
    }

    private static IEnumerable<string> Runs(JsonElement person, string list) =>
        person.GetProperty(list).EnumerateArray().Select(r =>
            $"{r.GetProperty("first").GetString()} {r.GetProperty("last").GetString()} {r.GetProperty("days").GetInt32()} {r.GetProperty("status").GetString()}");
}
