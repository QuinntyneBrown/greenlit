using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Domain.Enums;

namespace Greenlit.Api.Tests.Requests;

/// <summary>
/// GET /api/requests/{id}: the request and the team for the weeks around it (L2-023 AC1, AC3, AC4).
/// Design: docs/detailed-designs/requests/review-requests.
/// </summary>
public class RequestDetailTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public RequestDetailTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task The_manager_gets_the_request_and_every_member_for_its_week_with_the_out_row()
    {
        var team = await TestTeam.CreateAsync(_factory);
        foreach (var name in new[] { "Ana Ruiz", "Ben Okafor", "Dev Patel" }) await team.AddMemberAsync(name);
        var ana = await SendAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-20", "Visiting family in Seville");
        await SendAsync(team, "Dev Patel", "2026-11-18", "2026-11-19", null);

        var response = await team.ClientFor("Maya Chen").GetAsync($"/api/requests/{ana}");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var detail = await Json(response);
        var request = detail.GetProperty("request");
        request.GetProperty("memberName").GetString().Should().Be("Ana Ruiz");
        request.GetProperty("firstDay").GetString().Should().Be("2026-11-16");
        request.GetProperty("days").GetInt32().Should().Be(5);
        request.GetProperty("note").GetString().Should().Be("Visiting family in Seville");
        request.GetProperty("status").GetString().Should().Be("Pending");
        request.GetProperty("overlaps").EnumerateArray().Select(o => o.GetProperty("memberName").GetString()).Should().Equal("Dev Patel");

        var members = detail.GetProperty("members").EnumerateArray().ToList();
        members.Select(m => m.GetProperty("name").GetString()).Should().Equal("Maya Chen", "Ana Ruiz", "Ben Okafor", "Dev Patel");
        var anaRow = members[1].GetProperty("cells").EnumerateArray().ToList();
        anaRow.Select(c => c.GetProperty("date").GetString()).Should().Equal(
            "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20", "2026-11-21", "2026-11-22");
        anaRow.Select(c => c.GetProperty("kind").GetString()).Should().Equal(
            "Requested", "Requested", "Requested", "Requested", "Requested", "NotWorking", "NotWorking");
        members[3].GetProperty("cells").EnumerateArray().Select(c => c.GetProperty("kind").GetString()).Should().Equal(
            "Working", "Working", "Requested", "Requested", "Working", "NotWorking", "NotWorking");

        // The Out row: working days only, with who is out and who is in.
        var coverage = detail.GetProperty("coverage").EnumerateArray().ToList();
        coverage.Select(c => c.GetProperty("date").GetString()).Should().Equal(
            "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20");
        coverage.Select(c => (c.GetProperty("out").GetInt32(), c.GetProperty("in").GetInt32())).Should().Equal(
            (1, 3), (1, 3), (2, 2), (2, 2), (1, 3));
    }

    [Fact]
    public async Task A_request_over_several_weeks_shows_whole_weeks_from_Monday_to_Sunday_with_the_teams_holidays_red()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Elif Yılmaz");
        await team.AddHolidayAsync(new DateOnly(2026, 12, 25), "Christmas Day");
        var id = await SendAsync(team, "Elif Yılmaz", "2026-12-16", "2026-12-31", "Winter break");

        var detail = await Json(await team.ClientFor("Maya Chen").GetAsync($"/api/requests/{id}"));

        var cells = detail.GetProperty("members").EnumerateArray().Single(m => m.GetProperty("name").GetString() == "Elif Yılmaz")
            .GetProperty("cells").EnumerateArray().ToList();
        cells.Should().HaveCount(21, "14 Dec (Monday) to 3 Jan (Sunday) is three whole weeks");
        cells[0].GetProperty("date").GetString().Should().Be("2026-12-14");
        cells[^1].GetProperty("date").GetString().Should().Be("2027-01-03");
        var christmas = cells.Single(c => c.GetProperty("date").GetString() == "2026-12-25");
        christmas.GetProperty("kind").GetString().Should().Be("Holiday");
        christmas.GetProperty("holidayName").GetString().Should().Be("Christmas Day");
        detail.GetProperty("coverage").EnumerateArray().Select(c => c.GetProperty("date").GetString())
            .Should().NotContain("2026-12-25").And.NotContain("2026-12-19");
    }

    [Fact]
    public async Task A_declined_request_carries_its_reason_and_an_approved_one_its_status()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ben Okafor");
        await team.AddMemberAsync("Finn Murphy");
        var declined = await team.AddRequestAsync("Ben Okafor", new DateOnly(2026, 12, 21), new DateOnly(2026, 12, 24),
            RequestStatus.Declined, "Christmas", decided: DateTimeOffset.UtcNow, declineReason: "Three people are already out that week.",
            dayStatus: DayStatus.Tentative);
        var approved = await team.AddRequestAsync("Finn Murphy", new DateOnly(2026, 10, 19), new DateOnly(2026, 10, 23),
            RequestStatus.Approved, null, decided: DateTimeOffset.UtcNow, dayStatus: DayStatus.Confirmed);

        var a = (await Json(await team.ClientFor("Maya Chen").GetAsync($"/api/requests/{declined}"))).GetProperty("request");
        var b = (await Json(await team.ClientFor("Maya Chen").GetAsync($"/api/requests/{approved}"))).GetProperty("request");

        a.GetProperty("status").GetString().Should().Be("Declined");
        a.GetProperty("declineReason").GetString().Should().Be("Three people are already out that week.");
        a.GetProperty("overlaps").GetArrayLength().Should().Be(0);
        b.GetProperty("status").GetString().Should().Be("Approved");
        b.GetProperty("decidedUtc").ValueKind.Should().Be(JsonValueKind.String);
    }

    [Fact]
    public async Task Only_the_manager_may_open_a_request_and_only_one_on_their_own_team()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var other = await TestTeam.CreateAsync(_factory, "Olu Bello", teamName: "Other team");
        await other.AddMemberAsync("Ola Ito");
        var mine = await SendAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-20", null);
        var theirs = await SendAsync(other, "Ola Ito", "2026-11-16", "2026-11-20", null);

        (await _factory.CreateClient().GetAsync($"/api/requests/{mine}")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await team.ClientFor("Ana Ruiz").GetAsync($"/api/requests/{mine}")).StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var foreign = await team.ClientFor("Maya Chen").GetAsync($"/api/requests/{theirs}");
        var unknown = await team.ClientFor("Maya Chen").GetAsync($"/api/requests/{Guid.NewGuid()}");
        foreign.StatusCode.Should().Be(HttpStatusCode.NotFound);
        unknown.StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await Json(foreign)).GetProperty("code").GetString().Should().Be("request_not_found");
        (await Json(unknown)).GetProperty("code").GetString().Should().Be("request_not_found", "an id on another team looks like one that does not exist");
    }

    private static async Task<Guid> SendAsync(TestTeam team, string member, string first, string last, string? note)
    {
        var response = await team.ClientFor(member).PostAsJsonAsync("/api/requests", new { firstDay = first, lastDay = last, note });
        response.StatusCode.Should().Be(HttpStatusCode.Created);
        return (await Json(response)).GetProperty("id").GetGuid();
    }

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
}
