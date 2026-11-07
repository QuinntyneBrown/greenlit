using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Domain.Enums;

namespace Greenlit.Api.Tests.Requests;

/// <summary>
/// GET /api/requests/mine (L2-020). Design: docs/detailed-designs/requests/my-requests.
/// November 2026: the 16th is a Monday.
/// </summary>
public class MyRequestsTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public MyRequestsTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Signed_out_callers_get_401()
    {
        var response = await _factory.CreateClient().GetAsync("/api/requests/mine");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task A_caller_on_no_team_gets_404()
    {
        var lone = await TestTeam.LoneUserAsync(_factory);

        var response = await _factory.ClientFor(lone).GetAsync("/api/requests/mine");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task A_pending_request_is_upcoming_with_its_range_days_note_and_overlap()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Dev Patel");
        await team.SetDayAsync("Dev Patel", new DateOnly(2026, 11, 18), DayStatus.Requested);
        await team.SetDayAsync("Dev Patel", new DateOnly(2026, 11, 19), DayStatus.Confirmed);
        var sent = await team.ClientFor("Ana Ruiz").PostAsJsonAsync("/api/requests",
            new { firstDay = "2026-11-16", lastDay = "2026-11-20", note = "Visiting family in Seville" });
        sent.StatusCode.Should().Be(HttpStatusCode.Created);

        var mine = await MineAsync(team, "Ana Ruiz");

        mine.GetProperty("managerName").GetString().Should().Be("Maya Chen");
        mine.GetProperty("past").GetArrayLength().Should().Be(0);
        var row = mine.GetProperty("upcoming").EnumerateArray().Should().ContainSingle().Subject;
        row.GetProperty("status").GetString().Should().Be("Pending");
        row.GetProperty("firstDay").GetString().Should().Be("2026-11-16");
        row.GetProperty("lastDay").GetString().Should().Be("2026-11-20");
        row.GetProperty("days").GetInt32().Should().Be(5);
        row.GetProperty("note").GetString().Should().Be("Visiting family in Seville");
        row.GetProperty("sentUtc").ValueKind.Should().Be(JsonValueKind.String);
        var overlap = row.GetProperty("overlaps").EnumerateArray().Should().ContainSingle().Subject;
        overlap.GetProperty("memberName").GetString().Should().Be("Dev Patel");
        overlap.GetProperty("firstDay").GetString().Should().Be("2026-11-18");
        overlap.GetProperty("lastDay").GetString().Should().Be("2026-11-19");
    }

    [Fact]
    public async Task Decided_and_cancelled_requests_are_past_newest_first_with_their_dates_and_reason()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddRequestAsync("Ana Ruiz", new DateOnly(2026, 10, 5), new DateOnly(2026, 10, 6), RequestStatus.Cancelled,
            "Short trip", sent: new DateTimeOffset(2026, 9, 20, 9, 0, 0, TimeSpan.Zero), decided: new DateTimeOffset(2026, 9, 25, 9, 0, 0, TimeSpan.Zero));
        await team.AddRequestAsync("Ana Ruiz", new DateOnly(2026, 12, 21), new DateOnly(2026, 12, 22), RequestStatus.Declined,
            "Christmas", sent: new DateTimeOffset(2026, 10, 30, 9, 0, 0, TimeSpan.Zero), decided: new DateTimeOffset(2026, 11, 2, 9, 0, 0, TimeSpan.Zero),
            declineReason: "Three people are already out.", dayStatus: DayStatus.Tentative);

        var mine = await MineAsync(team, "Ana Ruiz");

        mine.GetProperty("upcoming").GetArrayLength().Should().Be(0);
        var past = mine.GetProperty("past").EnumerateArray().ToList();
        past.Select(r => r.GetProperty("status").GetString()).Should().Equal("Declined", "Cancelled");
        past[0].GetProperty("declineReason").GetString().Should().Be("Three people are already out.");
        past[1].GetProperty("days").GetInt32().Should().Be(2);
        past[1].GetProperty("decidedUtc").ValueKind.Should().Be(JsonValueKind.String);
    }

    [Fact]
    public async Task A_member_never_sees_a_teammates_requests()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Cleo Park");
        await team.AddRequestAsync("Cleo Park", new DateOnly(2026, 11, 12), new DateOnly(2026, 11, 13), RequestStatus.Pending, dayStatus: DayStatus.Requested);
        var other = await TestTeam.CreateAsync(_factory, "Other Boss");
        await other.AddRequestAsync("Other Boss", new DateOnly(2026, 11, 2), new DateOnly(2026, 11, 3), RequestStatus.Pending, dayStatus: DayStatus.Requested);

        var mine = await MineAsync(team, "Ana Ruiz");

        mine.GetProperty("upcoming").GetArrayLength().Should().Be(0);
        mine.GetProperty("past").GetArrayLength().Should().Be(0);
    }

    private static async Task<JsonElement> MineAsync(TestTeam team, string member)
    {
        var response = await team.ClientFor(member).GetAsync("/api/requests/mine");
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
    }
}
