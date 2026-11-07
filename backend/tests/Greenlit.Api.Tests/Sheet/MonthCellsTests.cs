using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Domain.Enums;

namespace Greenlit.Api.Tests.Sheet;

/// <summary>
/// GET /api/sheet: what each cell of the month holds (L2-013) and the Out row's
/// counts (L2-014 AC2). November 2026 starts on a Sunday and has 30 days.
/// </summary>
public class MonthCellsTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public MonthCellsTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Every_member_has_one_cell_per_day_of_the_month()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var month = await MonthMembersTests.GetMonthAsync(team.ClientFor("Maya Chen"), "2026-11");

        foreach (var member in month.GetProperty("members").EnumerateArray())
        {
            var dates = member.GetProperty("cells").EnumerateArray().Select(c => c.GetProperty("date").GetString()).ToList();
            dates.Should().HaveCount(30);
            dates.First().Should().Be("2026-11-01");
            dates.Last().Should().Be("2026-11-30");
        }
    }

    [Fact]
    public async Task Weekdays_are_working_and_weekends_are_not()
    {
        // L2-013 AC1 and AC2 (weekends).
        var team = await TestTeam.CreateAsync(_factory);

        var month = await MonthMembersTests.GetMonthAsync(team.ClientFor("Maya Chen"), "2026-11");

        Kind(month, "Maya Chen", "2026-11-01").Should().Be("NotWorking"); // Sunday
        Kind(month, "Maya Chen", "2026-11-02").Should().Be("Working");    // Monday
        Kind(month, "Maya Chen", "2026-11-07").Should().Be("NotWorking"); // Saturday
    }

    [Fact]
    public async Task A_team_holiday_is_red_for_everyone_and_carries_its_name()
    {
        // L2-013 AC3.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddHolidayAsync(new DateOnly(2026, 12, 25), "Christmas Day");

        var month = await MonthMembersTests.GetMonthAsync(team.ClientFor("Maya Chen"), "2026-12");

        foreach (var name in new[] { "Maya Chen", "Ana Ruiz" })
        {
            var cell = Cell(month, name, "2026-12-25");
            cell.GetProperty("kind").GetString().Should().Be("Holiday");
            cell.GetProperty("holidayName").GetString().Should().Be("Christmas Day");
        }
    }

    [Fact]
    public async Task Stored_days_show_their_status()
    {
        // L2-013 AC4 and AC5: a pending request's days are requested, an approved one's confirmed.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 11, 4), DayStatus.Confirmed);
        await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 11, 16), DayStatus.Requested);
        await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 11, 23), DayStatus.Tentative);
        await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 12, 1), DayStatus.Confirmed);

        var month = await MonthMembersTests.GetMonthAsync(team.ClientFor("Ana Ruiz"), "2026-11");

        Kind(month, "Ana Ruiz", "2026-11-04").Should().Be("Confirmed");
        Kind(month, "Ana Ruiz", "2026-11-16").Should().Be("Requested");
        Kind(month, "Ana Ruiz", "2026-11-23").Should().Be("Tentative");
        Kind(month, "Ana Ruiz", "2026-11-05").Should().Be("Working");
    }

    [Fact]
    public async Task The_out_row_counts_requested_and_confirmed_as_out_and_the_rest_as_in()
    {
        // L2-014 AC2: out = requested or confirmed; tentative people are still in.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Ben Okafor");
        await team.AddMemberAsync("Cleo Park");
        await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 11, 18), DayStatus.Requested);
        await team.SetDayAsync("Ben Okafor", new DateOnly(2026, 11, 18), DayStatus.Confirmed);
        await team.SetDayAsync("Cleo Park", new DateOnly(2026, 11, 18), DayStatus.Tentative);

        var month = await MonthMembersTests.GetMonthAsync(team.ClientFor("Maya Chen"), "2026-11");

        var day = Coverage(month, "2026-11-18");
        day.GetProperty("out").GetInt32().Should().Be(2);
        day.GetProperty("in").GetInt32().Should().Be(2);
        day.GetProperty("belowMinimum").GetBoolean().Should().BeFalse();

        var quiet = Coverage(month, "2026-11-17");
        quiet.GetProperty("out").GetInt32().Should().Be(0);
        quiet.GetProperty("in").GetInt32().Should().Be(4);
    }

    [Fact]
    public async Task Days_nobody_works_have_no_out_count()
    {
        // The mock leaves the Out cell blank under weekends and holidays.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddHolidayAsync(new DateOnly(2026, 11, 26), "Team offsite");

        var month = await MonthMembersTests.GetMonthAsync(team.ClientFor("Maya Chen"), "2026-11");

        var dates = month.GetProperty("coverage").EnumerateArray().Select(c => c.GetProperty("date").GetString()).ToList();
        dates.Should().NotContain(["2026-11-01", "2026-11-07", "2026-11-26"]);
        dates.Should().Contain("2026-11-02");
        month.GetProperty("coverageMinimum").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task Weekends_follow_the_teams_time_zone_calendar_not_the_servers()
    {
        // A date is a calendar date in the team's zone; 1 Nov 2026 is a Sunday everywhere.
        var team = await TestTeam.CreateAsync(_factory, timeZone: "Pacific/Kiritimati");

        var month = await MonthMembersTests.GetMonthAsync(team.ClientFor("Maya Chen"), "2026-11");

        Kind(month, "Maya Chen", "2026-11-01").Should().Be("NotWorking");
        Kind(month, "Maya Chen", "2026-11-02").Should().Be("Working");
    }

    private static JsonElement Cell(JsonElement month, string member, string date) =>
        month.GetProperty("members").EnumerateArray()
            .Single(m => m.GetProperty("name").GetString() == member)
            .GetProperty("cells").EnumerateArray()
            .Single(c => c.GetProperty("date").GetString() == date);

    private static string? Kind(JsonElement month, string member, string date) =>
        Cell(month, member, date).GetProperty("kind").GetString();

    private static JsonElement Coverage(JsonElement month, string date) =>
        month.GetProperty("coverage").EnumerateArray().Single(c => c.GetProperty("date").GetString() == date);
}
