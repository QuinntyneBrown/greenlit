using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.Requests;

/// <summary>
/// POST /api/requests/{id}/decline (L2-025 AC2). Design: docs/detailed-designs/requests/decline-request.
/// November 2026: the 16th is a Monday.
/// </summary>
public class DeclineRequestTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public DeclineRequestTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Signed_out_callers_get_401()
    {
        var response = await _factory.CreateClient().PostAsJsonAsync($"/api/requests/{Guid.NewGuid()}/decline", new { reason = "No" });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task The_manager_declines_with_a_reason_and_the_days_return_to_tentative()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var id = await RequestAsync(team);

        var response = await DeclineAsync(team, "Maya Chen", id, "Dev is already out that week.");

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        var result = await Json(response);
        result.GetProperty("requestId").GetGuid().Should().Be(id);
        result.GetProperty("memberName").GetString().Should().Be("Ana Ruiz");
        result.GetProperty("firstDay").GetString().Should().Be("2026-11-16");
        result.GetProperty("lastDay").GetString().Should().Be("2026-11-20");
        result.GetProperty("days").GetInt32().Should().Be(5);
        result.GetProperty("reason").GetString().Should().Be("Dev is already out that week.");
        (await team.RequestsOfAsync("Ana Ruiz")).Should().ContainSingle()
            .Which.Status.Should().Be("Declined");
        var month = await MonthAsync(team);
        foreach (var date in new[] { "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20" })
            KindOf(month, "Ana Ruiz", date).Should().Be("Tentative");
    }

    [Fact]
    public async Task The_ledger_lists_the_declined_request_with_its_reason_and_decision_date()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var id = await RequestAsync(team);
        await DeclineAsync(team, "Maya Chen", id, "Dev is already out that week.");

        var listed = await Json(await team.ClientFor("Maya Chen").GetAsync("/api/requests?status=Declined"));

        var row = listed.EnumerateArray().Should().ContainSingle().Subject;
        row.GetProperty("status").GetString().Should().Be("Declined");
        row.GetProperty("declineReason").GetString().Should().Be("Dev is already out that week.");
        row.GetProperty("decidedUtc").ValueKind.Should().Be(JsonValueKind.String);
        (await Json(await team.ClientFor("Maya Chen").GetAsync("/api/requests"))).GetArrayLength().Should().Be(0);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task A_blank_reason_declines_without_one(string? reason)
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var id = await RequestAsync(team);

        var response = await DeclineAsync(team, "Maya Chen", id, reason);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await Json(response)).GetProperty("reason").ValueKind.Should().Be(JsonValueKind.Null);
        var listed = await Json(await team.ClientFor("Maya Chen").GetAsync("/api/requests?status=Declined"));
        listed[0].GetProperty("declineReason").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task A_reason_over_500_characters_is_refused_and_nothing_changes()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var id = await RequestAsync(team);

        var response = await DeclineAsync(team, "Maya Chen", id, new string('x', 501));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await team.RequestsOfAsync("Ana Ruiz")).Single().Status.Should().Be("Pending");
        KindOf(await MonthAsync(team), "Ana Ruiz", "2026-11-16").Should().Be("Requested");
    }

    [Fact]
    public async Task A_member_cannot_decline_even_their_own_request()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var id = await RequestAsync(team);

        var response = await DeclineAsync(team, "Ana Ruiz", id, null);

        await AssertProblem(response, HttpStatusCode.Forbidden, "forbidden");
        (await team.RequestsOfAsync("Ana Ruiz")).Single().Status.Should().Be("Pending");
    }

    [Fact]
    public async Task An_unknown_request_and_another_teams_request_are_the_same_404()
    {
        var team = await TestTeam.CreateAsync(_factory);
        var other = await TestTeam.CreateAsync(_factory, "Olu Bello", teamName: "Other team");
        await other.AddMemberAsync("Ola Ito");
        var theirs = await RequestAsync(other, "Ola Ito");

        await AssertProblem(await DeclineAsync(team, "Maya Chen", theirs, "No"), HttpStatusCode.NotFound, "request_not_found");
        await AssertProblem(await DeclineAsync(team, "Maya Chen", Guid.NewGuid(), "No"), HttpStatusCode.NotFound, "request_not_found");
        (await other.RequestsOfAsync("Ola Ito")).Single().Status.Should().Be("Pending");
    }

    [Fact]
    public async Task A_caller_on_no_team_gets_404()
    {
        var lone = await TestTeam.LoneUserAsync(_factory);

        var response = await _factory.ClientFor(lone).PostAsJsonAsync($"/api/requests/{Guid.NewGuid()}/decline", new { reason = "No" });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task A_request_that_is_not_pending_cannot_be_declined()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var approved = await RequestAsync(team);
        await team.ClientFor("Maya Chen").PostAsJsonAsync("/api/requests/approve", new { ids = new[] { approved } });

        await AssertProblem(await DeclineAsync(team, "Maya Chen", approved, "Too late"), HttpStatusCode.Conflict, "request_not_pending");

        var declined = await RequestAsync(team, "Ana Ruiz", "2026-11-23", "2026-11-24");
        await DeclineAsync(team, "Maya Chen", declined, null);
        await AssertProblem(await DeclineAsync(team, "Maya Chen", declined, "Again"), HttpStatusCode.Conflict, "request_not_pending");
        KindOf(await MonthAsync(team), "Ana Ruiz", "2026-11-17").Should().Be("Confirmed");
    }

    private static async Task<Guid> RequestAsync(TestTeam team, string member = "Ana Ruiz", string first = "2026-11-16", string last = "2026-11-20")
    {
        var sent = await team.ClientFor(member).PostAsJsonAsync("/api/requests", new { firstDay = first, lastDay = last });
        sent.StatusCode.Should().Be(HttpStatusCode.Created, await sent.Content.ReadAsStringAsync());
        return (await Json(sent)).GetProperty("id").GetGuid();
    }

    private static Task<HttpResponseMessage> DeclineAsync(TestTeam team, string caller, Guid id, string? reason) =>
        team.ClientFor(caller).PostAsJsonAsync($"/api/requests/{id}/decline", new { reason });

    private static Task<JsonElement> MonthAsync(TestTeam team) =>
        Sheet.MonthMembersTests.GetMonthAsync(team.ClientFor("Maya Chen"), "2026-11");

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private static async Task AssertProblem(HttpResponseMessage response, HttpStatusCode status, string code)
    {
        response.StatusCode.Should().Be(status);
        (await Json(response)).GetProperty("code").GetString().Should().Be(code);
    }

    private static string? KindOf(JsonElement month, string member, string date) =>
        month.GetProperty("members").EnumerateArray()
            .Single(m => m.GetProperty("name").GetString() == member)
            .GetProperty("cells").EnumerateArray()
            .Single(c => c.GetProperty("date").GetString() == date)
            .GetProperty("kind").GetString();
}
