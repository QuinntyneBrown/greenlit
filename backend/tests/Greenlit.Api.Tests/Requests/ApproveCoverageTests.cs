using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Domain.Enums;

namespace Greenlit.Api.Tests.Requests;

/// <summary>
/// Approving a request that leaves too few people in (L2-042 AC2). The approval always stands; the answer
/// names the first working day of the request below the team's coverage minimum.
/// Design: docs/detailed-designs/requests/approve-request. November 2026: the 16th is a Monday.
/// </summary>
public class ApproveCoverageTests : IClassFixture<GreenlitApiFactory>
{
    private static readonly string[] Cast = ["Ana Ruiz", "Ben Okafor", "Cleo Park", "Dev Patel", "Elif Yılmaz", "Finn Murphy"];

    private readonly GreenlitApiFactory _factory;

    public ApproveCoverageTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Approving_a_request_that_leaves_three_people_in_against_a_minimum_of_four_names_the_day()
    {
        // The mocks' week: seven people, minimum 4; Ana is out 16-20 Nov, Dev 18-19 (requested), Ben and Cleo
        // 18 (confirmed) and Elif has a tentative day that does not count. 18 Nov has 3 in.
        var team = await SevenPeopleAsync(minimum: 4);
        await team.SetDayAsync("Ben Okafor", new DateOnly(2026, 11, 18), DayStatus.Confirmed);
        await team.SetDayAsync("Cleo Park", new DateOnly(2026, 11, 18), DayStatus.Confirmed);
        await team.SetDayAsync("Elif Yılmaz", new DateOnly(2026, 11, 18), DayStatus.Tentative);
        await RequestAsync(team, "Dev Patel", "2026-11-18", "2026-11-19");
        var ana = await RequestAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-20");

        var response = await ApproveAsync(team, ana);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var result = (await Json(response))[0];
        result.GetProperty("coverageMinimum").GetInt32().Should().Be(4);
        result.GetProperty("firstShortDate").GetString().Should().Be("2026-11-18");
        result.GetProperty("inOnShortDate").GetInt32().Should().Be(3);
        (await team.RequestsOfAsync("Ana Ruiz")).Single().Status.Should().Be("Approved");
    }

    [Fact]
    public async Task Approving_a_request_that_keeps_enough_people_in_reports_no_short_day()
    {
        var team = await SevenPeopleAsync(minimum: 4);
        var ana = await RequestAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-20");

        var result = (await Json(await ApproveAsync(team, ana)))[0];

        result.GetProperty("coverageMinimum").GetInt32().Should().Be(4);
        result.GetProperty("firstShortDate").ValueKind.Should().Be(JsonValueKind.Null);
        result.GetProperty("inOnShortDate").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task A_team_with_no_minimum_is_never_short()
    {
        var team = await SevenPeopleAsync(minimum: 0);
        foreach (var name in Cast) await RequestAsync(team, name, "2026-11-16", "2026-11-16");
        var ids = (await IdsOfPendingAsync(team));

        var results = await Json(await ApproveAsync(team, ids.ToArray()));

        results.EnumerateArray().Should().OnlyContain(r => r.GetProperty("firstShortDate").ValueKind == JsonValueKind.Null);
        results[0].GetProperty("coverageMinimum").GetInt32().Should().Be(0);
    }

    [Fact]
    public async Task A_holiday_in_the_range_is_not_a_working_day_so_it_is_never_the_short_day()
    {
        // Two people, minimum 2: Ana is out Mon 16 (a holiday, so everyone is off anyway) and Tue 17.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.SetCoverageMinimumAsync(2);
        await team.AddHolidayAsync(new DateOnly(2026, 11, 16), "Company day");
        var ana = await RequestAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-17");

        var result = (await Json(await ApproveAsync(team, ana)))[0];

        result.GetProperty("firstShortDate").GetString().Should().Be("2026-11-17");
        result.GetProperty("inOnShortDate").GetInt32().Should().Be(1);
    }

    [Fact]
    public async Task Several_requests_are_checked_against_the_team_after_all_of_them_are_approved()
    {
        // Minimum 5 of seven: Ana alone leaves 6 in on 16 Nov, but Ana and Ben together leave 5, Cleo too leaves 4.
        var team = await SevenPeopleAsync(minimum: 5);
        var ana = await RequestAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-16");
        var ben = await RequestAsync(team, "Ben Okafor", "2026-11-16", "2026-11-16");
        var cleo = await RequestAsync(team, "Cleo Park", "2026-11-16", "2026-11-16");

        var results = await Json(await ApproveAsync(team, ana, ben, cleo));

        foreach (var result in results.EnumerateArray())
        {
            result.GetProperty("firstShortDate").GetString().Should().Be("2026-11-16");
            result.GetProperty("inOnShortDate").GetInt32().Should().Be(4);
        }
    }

    // ---- helpers ----

    private async Task<TestTeam> SevenPeopleAsync(int minimum)
    {
        var team = await TestTeam.CreateAsync(_factory);
        foreach (var name in Cast) await team.AddMemberAsync(name);
        await team.SetCoverageMinimumAsync(minimum);
        return team;
    }

    private static async Task<Guid> RequestAsync(TestTeam team, string member, string first, string last)
    {
        var response = await team.ClientFor(member).PostAsJsonAsync("/api/requests", new { firstDay = first, lastDay = last });
        response.StatusCode.Should().Be(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        return (await Json(response)).GetProperty("id").GetGuid();
    }

    private static async Task<List<Guid>> IdsOfPendingAsync(TestTeam team) =>
        (await Json(await team.ClientFor("Maya Chen").GetAsync("/api/requests")))
            .EnumerateArray().Select(r => r.GetProperty("id").GetGuid()).ToList();

    private static Task<HttpResponseMessage> ApproveAsync(TestTeam team, params Guid[] ids) =>
        team.ClientFor("Maya Chen").PostAsJsonAsync("/api/requests/approve", new { ids });

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
}
