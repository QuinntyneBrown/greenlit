using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Domain.Enums;

namespace Greenlit.Api.Tests.Requests;

/// <summary>
/// POST /api/requests/{id}/cancel (L2-021). Design: docs/detailed-designs/requests/my-requests.
/// November 2026: the 16th is a Monday.
/// </summary>
public class CancelRequestTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public CancelRequestTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Signed_out_callers_get_401()
    {
        var response = await _factory.CreateClient().PostAsync($"/api/requests/{Guid.NewGuid()}/cancel", null);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task A_member_cancels_their_pending_request_and_the_days_go_back_to_tentative()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var id = await RequestAsync(team, "Ana Ruiz");

        var response = await CancelAsync(team, "Ana Ruiz", id);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent, await response.Content.ReadAsStringAsync());
        (await team.RequestsOfAsync("Ana Ruiz")).Should().ContainSingle().Which.Status.Should().Be("Cancelled");
        var month = await Sheet.MonthMembersTests.GetMonthAsync(team.ClientFor("Maya Chen"), "2026-11");
        foreach (var date in new[] { "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20" })
            KindOf(month, "Ana Ruiz", date).Should().Be("Tentative");
    }

    [Fact]
    public async Task The_cancelled_request_is_listed_under_past_with_the_day_it_was_cancelled()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var id = await RequestAsync(team, "Ana Ruiz");
        await CancelAsync(team, "Ana Ruiz", id);

        var mine = JsonDocument.Parse(await team.ClientFor("Ana Ruiz").GetStringAsync("/api/requests/mine")).RootElement;

        mine.GetProperty("upcoming").GetArrayLength().Should().Be(0);
        var row = mine.GetProperty("past").EnumerateArray().Should().ContainSingle().Subject;
        row.GetProperty("status").GetString().Should().Be("Cancelled");
        row.GetProperty("days").GetInt32().Should().Be(5);
        row.GetProperty("decidedUtc").ValueKind.Should().Be(JsonValueKind.String);
    }

    [Fact]
    public async Task A_cancelled_request_leaves_the_managers_pending_ledger_and_shows_under_declined()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var id = await RequestAsync(team, "Ana Ruiz");
        await CancelAsync(team, "Ana Ruiz", id);

        var manager = team.ClientFor("Maya Chen");

        JsonDocument.Parse(await manager.GetStringAsync("/api/requests")).RootElement.GetArrayLength().Should().Be(0);
        var declined = JsonDocument.Parse(await manager.GetStringAsync("/api/requests?status=Declined")).RootElement;
        declined.EnumerateArray().Should().ContainSingle().Which.GetProperty("status").GetString().Should().Be("Cancelled");
    }

    [Fact]
    public async Task A_member_cannot_cancel_a_teammates_request_and_it_looks_like_any_unknown_id()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Cleo Park");
        var id = await RequestAsync(team, "Cleo Park");

        var response = await CancelAsync(team, "Ana Ruiz", id);

        await AssertProblem(response, HttpStatusCode.NotFound, "request_not_found");
        (await team.RequestsOfAsync("Cleo Park")).Should().ContainSingle().Which.Status.Should().Be("Pending");
    }

    [Fact]
    public async Task The_manager_cannot_cancel_a_members_request()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var id = await RequestAsync(team, "Ana Ruiz");

        var response = await CancelAsync(team, "Maya Chen", id);

        await AssertProblem(response, HttpStatusCode.NotFound, "request_not_found");
        (await team.RequestsOfAsync("Ana Ruiz")).Should().ContainSingle().Which.Status.Should().Be("Pending");
    }

    [Fact]
    public async Task Another_teams_request_and_an_unknown_id_are_the_same_404()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var other = await TestTeam.CreateAsync(_factory, "Other Boss");
        await other.AddMemberAsync("Zed Zhou");
        var foreign = await RequestAsync(other, "Zed Zhou");

        await AssertProblem(await CancelAsync(team, "Ana Ruiz", foreign), HttpStatusCode.NotFound, "request_not_found");
        await AssertProblem(await CancelAsync(team, "Ana Ruiz", Guid.NewGuid()), HttpStatusCode.NotFound, "request_not_found");
        (await other.RequestsOfAsync("Zed Zhou")).Should().ContainSingle().Which.Status.Should().Be("Pending");
    }

    [Fact]
    public async Task A_caller_on_no_team_gets_404()
    {
        var lone = await TestTeam.LoneUserAsync(_factory);

        var response = await _factory.ClientFor(lone).PostAsync($"/api/requests/{Guid.NewGuid()}/cancel", null);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Theory]
    [InlineData(RequestStatus.Approved, DayStatus.Confirmed)]
    [InlineData(RequestStatus.Declined, DayStatus.Tentative)]
    [InlineData(RequestStatus.Cancelled, DayStatus.Tentative)]
    public async Task A_request_that_is_no_longer_pending_cannot_be_cancelled_and_nothing_changes(RequestStatus status, DayStatus days)
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var id = await team.AddRequestAsync("Ana Ruiz", new DateOnly(2026, 11, 16), new DateOnly(2026, 11, 20), status,
            decided: DateTimeOffset.UtcNow, dayStatus: days);

        var response = await CancelAsync(team, "Ana Ruiz", id);

        await AssertProblem(response, HttpStatusCode.Conflict, "request_not_pending");
        (await team.RequestsOfAsync("Ana Ruiz")).Should().ContainSingle().Which.Status.Should().Be(status.ToString());
        var month = await Sheet.MonthMembersTests.GetMonthAsync(team.ClientFor("Maya Chen"), "2026-11");
        KindOf(month, "Ana Ruiz", "2026-11-17").Should().Be(days.ToString());
    }

    private static async Task<Guid> RequestAsync(TestTeam team, string member)
    {
        var sent = await team.ClientFor(member).PostAsJsonAsync("/api/requests", new { firstDay = "2026-11-16", lastDay = "2026-11-20" });
        sent.StatusCode.Should().Be(HttpStatusCode.Created, await sent.Content.ReadAsStringAsync());
        return JsonDocument.Parse(await sent.Content.ReadAsStringAsync()).RootElement.GetProperty("id").GetGuid();
    }

    private static Task<HttpResponseMessage> CancelAsync(TestTeam team, string caller, Guid id) =>
        team.ClientFor(caller).PostAsync($"/api/requests/{id}/cancel", null);

    private static async Task AssertProblem(HttpResponseMessage response, HttpStatusCode status, string code)
    {
        response.StatusCode.Should().Be(status);
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("code").GetString().Should().Be(code);
    }

    private static string? KindOf(JsonElement month, string member, string date) =>
        month.GetProperty("members").EnumerateArray()
            .Single(m => m.GetProperty("name").GetString() == member)
            .GetProperty("cells").EnumerateArray()
            .Single(c => c.GetProperty("date").GetString() == date)
            .GetProperty("kind").GetString();
}
