using System.Net;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Domain.Enums;

namespace Greenlit.Api.Tests.Year;

/// <summary>
/// GET /api/year: the team's twelve months, member by member (L2-031), scoped to the caller's team.
/// Design: docs/detailed-designs/allowances/year-overview. "Today" is Friday 6 November 2026.
/// </summary>
public class YearGridTests : IClassFixture<FrozenClockApiFactory>
{
    private readonly FrozenClockApiFactory _factory;

    public YearGridTests(FrozenClockApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Signed_out_callers_get_401()
    {
        var response = await _factory.CreateClient().GetAsync("/api/year?year=2026");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task The_manager_sees_the_team_in_its_order_with_twelve_months_each()
    {
        // L2-031 AC1: one row per member and a column per month, January to December.
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Ben Okafor", withAccount: false);

        var year = await YearAsync(team.ClientFor("Maya Chen"), 2026);

        year.GetProperty("year").GetInt32().Should().Be(2026);
        year.GetProperty("isManager").GetBoolean().Should().BeTrue();
        Names(year).Should().Equal("Maya Chen", "Ana Ruiz", "Ben Okafor");
        foreach (var member in year.GetProperty("members").EnumerateArray())
            member.GetProperty("months").EnumerateArray().Select(m => m.GetProperty("month").GetInt32())
                .Should().Equal(Enumerable.Range(1, 12));
    }

    [Fact]
    public async Task A_member_sees_their_own_row_first_marked_you()
    {
        // L2-031 AC4: a signed-in member's own row comes first and is marked "You".
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Ben Okafor");

        var year = await YearAsync(team.ClientFor("Ben Okafor"), 2026);

        year.GetProperty("isManager").GetBoolean().Should().BeFalse();
        Names(year).Should().Equal("Ben Okafor", "Maya Chen", "Ana Ruiz");
        year.GetProperty("members").EnumerateArray().Select(m => m.GetProperty("isYou").GetBoolean())
            .Should().Equal(true, false, false);
    }

    [Fact]
    public async Task Each_member_carries_initials_for_the_avatar()
    {
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");
        await team.AddMemberAsync("Elif Yılmaz");

        var year = await YearAsync(team.ClientFor("Maya Chen"), 2026);

        year.GetProperty("members").EnumerateArray().Select(m => m.GetProperty("initials").GetString())
            .Should().Equal("MC", "EY");
    }

    [Fact]
    public async Task A_month_counts_the_confirmed_days_and_draws_one_status_per_day()
    {
        // L2-031 AC2: the cell is named by the confirmed days; the slivers show every day's colour.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        foreach (var day in new[] { 4, 5 }) await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 11, day), DayStatus.Confirmed);
        await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 11, 16), DayStatus.Requested);
        await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 11, 23), DayStatus.Tentative);

        var november = Month(Member(await YearAsync(team.ClientFor("Maya Chen"), 2026), "Ana Ruiz"), 11);

        november.GetProperty("confirmed").GetInt32().Should().Be(2);
        var days = november.GetProperty("days").EnumerateArray().Select(d => d.GetString()).ToList();
        days.Should().HaveCount(30);
        days[0].Should().Be("off"); // Sunday 1 Nov
        days[1].Should().Be("empty"); // Monday 2 Nov
        days[3].Should().Be("confirmed");
        days[4].Should().Be("confirmed");
        days[15].Should().Be("requested");
        days[22].Should().Be("tentative");
        days[6].Should().Be("off"); // Saturday 7 Nov
    }

    [Fact]
    public async Task Holidays_are_off_and_never_counted()
    {
        // A holiday is red for the whole team and counts in no cell, even on a day set before it was a holiday.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ben Okafor");
        await team.AddHolidayAsync(new DateOnly(2026, 12, 25), "Christmas Day");
        await team.SetDayAsync("Ben Okafor", new DateOnly(2026, 12, 25), DayStatus.Confirmed);
        await team.SetDayAsync("Ben Okafor", new DateOnly(2026, 12, 24), DayStatus.Confirmed);

        var december = Month(Member(await YearAsync(team.ClientFor("Maya Chen"), 2026), "Ben Okafor"), 12);

        december.GetProperty("confirmed").GetInt32().Should().Be(1);
        december.GetProperty("days")[24].GetString().Should().Be("off");
        december.GetProperty("days")[23].GetString().Should().Be("confirmed");
    }

    [Fact]
    public async Task Days_of_another_year_are_left_out()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Cleo Park");
        await team.SetDayAsync("Cleo Park", new DateOnly(2025, 12, 31), DayStatus.Confirmed);
        await team.SetDayAsync("Cleo Park", new DateOnly(2027, 1, 4), DayStatus.Confirmed);

        var cleo = Member(await YearAsync(team.ClientFor("Maya Chen"), 2026), "Cleo Park");

        cleo.GetProperty("months").EnumerateArray().Sum(m => m.GetProperty("confirmed").GetInt32()).Should().Be(0);
    }

    [Fact]
    public async Task The_year_shows_only_the_callers_team()
    {
        var ours = await TestTeam.CreateAsync(_factory, "Maya Chen");
        var theirs = await TestTeam.CreateAsync(_factory, "Other Manager", teamName: "Other team");
        await theirs.AddMemberAsync("Someone Else");

        var year = await YearAsync(ours.ClientFor("Maya Chen"), 2026);

        Names(year).Should().Equal("Maya Chen");
    }

    [Theory]
    [InlineData("")]
    [InlineData("&year=twenty")]
    [InlineData("&year=1999")]
    [InlineData("&year=2101")]
    public async Task A_missing_or_malformed_year_is_a_validation_problem(string query)
    {
        var team = await TestTeam.CreateAsync(_factory);

        var response = await team.ClientFor("Maya Chen").GetAsync($"/api/year?x=1{query}");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        response.Content.Headers.ContentType!.MediaType.Should().Be("application/problem+json");
    }

    [Fact]
    public async Task A_signed_in_user_without_a_team_gets_404()
    {
        var lonely = await TestTeam.LoneUserAsync(_factory);

        var response = await _factory.ClientFor(lonely).GetAsync("/api/year?year=2026");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    internal static async Task<JsonElement> YearAsync(HttpClient client, int year)
    {
        var response = await client.GetAsync($"/api/year?year={year}");
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.Should().Be(HttpStatusCode.OK, $"body: {body}");
        return JsonDocument.Parse(body).RootElement;
    }

    internal static JsonElement Member(JsonElement year, string name) =>
        year.GetProperty("members").EnumerateArray().Single(m => m.GetProperty("name").GetString() == name);

    internal static JsonElement Month(JsonElement member, int month) =>
        member.GetProperty("months").EnumerateArray().Single(m => m.GetProperty("month").GetInt32() == month);

    private static IEnumerable<string?> Names(JsonElement year) =>
        year.GetProperty("members").EnumerateArray().Select(m => m.GetProperty("name").GetString());
}
