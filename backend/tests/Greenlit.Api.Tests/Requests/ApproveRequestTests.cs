using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.Requests;

/// <summary>
/// POST /api/requests/approve (L2-024, L2-042). Design: docs/detailed-designs/requests/approve-request.
/// November 2026: the 16th is a Monday; the 14th/15th and 21st/22nd are weekends.
/// </summary>
public class ApproveRequestTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public ApproveRequestTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Signed_out_callers_get_401()
    {
        var response = await _factory.CreateClient().PostAsJsonAsync("/api/requests/approve", new { ids = new[] { Guid.NewGuid() } });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task The_manager_approves_a_pending_request_and_its_days_turn_confirmed()
    {
        // L2-024 AC1: the request becomes approved and its days confirmed.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var id = await RequestAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-20", "Visiting family in Seville");

        var response = await ApproveAsync(team, "Maya Chen", id);

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        var results = await Json(response);
        results.GetArrayLength().Should().Be(1);
        var result = results[0];
        result.GetProperty("requestId").GetGuid().Should().Be(id);
        result.GetProperty("memberName").GetString().Should().Be("Ana Ruiz");
        result.GetProperty("firstDay").GetString().Should().Be("2026-11-16");
        result.GetProperty("lastDay").GetString().Should().Be("2026-11-20");
        result.GetProperty("days").GetInt32().Should().Be(5);
        (await team.RequestsOfAsync("Ana Ruiz")).Should().ContainSingle()
            .Which.Status.Should().Be("Approved");
        var month = await MonthAsync(team, "Maya Chen");
        foreach (var date in new[] { "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20" })
            KindOf(month, "Ana Ruiz", date).Should().Be("Confirmed");
    }

    [Fact]
    public async Task A_member_cannot_approve_even_their_own_request()
    {
        // ADR-003 and AGENTS.md: only the manager confirms.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var id = await RequestAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-20", null);

        var response = await ApproveAsync(team, "Ana Ruiz", id);

        await AssertProblem(response, HttpStatusCode.Forbidden, "forbidden");
        (await team.RequestsOfAsync("Ana Ruiz")).Single().Status.Should().Be("Pending");
        KindOf(await MonthAsync(team, "Maya Chen"), "Ana Ruiz", "2026-11-16").Should().Be("Requested");
    }

    [Fact]
    public async Task A_caller_on_no_team_gets_404()
    {
        var lone = await TestTeam.LoneUserAsync(_factory);

        var response = await _factory.ClientFor(lone).PostAsJsonAsync("/api/requests/approve", new { ids = new[] { Guid.NewGuid() } });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task An_unknown_request_and_another_teams_request_are_the_same_404()
    {
        var team = await TestTeam.CreateAsync(_factory);
        var other = await TestTeam.CreateAsync(_factory, "Olu Bello", teamName: "Other team");
        await other.AddMemberAsync("Ola Ito");
        var theirs = await RequestAsync(other, "Ola Ito", "2026-11-16", "2026-11-20", null);

        var foreign = await ApproveAsync(team, "Maya Chen", theirs);
        var unknown = await ApproveAsync(team, "Maya Chen", Guid.NewGuid());

        await AssertProblem(foreign, HttpStatusCode.NotFound, "request_not_found");
        await AssertProblem(unknown, HttpStatusCode.NotFound, "request_not_found");
        (await other.RequestsOfAsync("Ola Ito")).Single().Status.Should().Be("Pending");
    }

    [Fact]
    public async Task A_request_that_is_already_decided_cannot_be_approved_again()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var id = await RequestAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-20", null);
        (await ApproveAsync(team, "Maya Chen", id)).StatusCode.Should().Be(HttpStatusCode.OK);

        var again = await ApproveAsync(team, "Maya Chen", id);

        await AssertProblem(again, HttpStatusCode.Conflict, "request_not_pending");
    }

    [Fact]
    public async Task Approving_several_is_all_or_nothing()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Cleo Park");
        var ana = await RequestAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-20", null);

        var response = await ApproveAsync(team, "Maya Chen", ana, Guid.NewGuid());

        await AssertProblem(response, HttpStatusCode.NotFound, "request_not_found");
        (await team.RequestsOfAsync("Ana Ruiz")).Single().Status.Should().Be("Pending");
        KindOf(await MonthAsync(team, "Maya Chen"), "Ana Ruiz", "2026-11-16").Should().Be("Requested");
    }

    [Fact]
    public async Task Approving_several_confirms_each()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Cleo Park");
        var ana = await RequestAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-20", null);
        var cleo = await RequestAsync(team, "Cleo Park", "2026-11-12", "2026-11-13", null);

        var response = await ApproveAsync(team, "Maya Chen", ana, cleo);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await Json(response)).EnumerateArray().Select(r => r.GetProperty("memberName").GetString())
            .Should().BeEquivalentTo("Ana Ruiz", "Cleo Park");
        (await team.RequestsOfAsync("Cleo Park")).Single().Status.Should().Be("Approved");
        KindOf(await MonthAsync(team, "Maya Chen"), "Cleo Park", "2026-11-12").Should().Be("Confirmed");
    }

    [Theory]
    [InlineData(0)]
    [InlineData(101)]
    public async Task The_number_of_ids_must_be_between_one_and_a_hundred(int count)
    {
        var team = await TestTeam.CreateAsync(_factory);

        var response = await team.ClientFor("Maya Chen").PostAsJsonAsync(
            "/api/requests/approve", new { ids = Enumerable.Range(0, count).Select(_ => Guid.NewGuid()).ToArray() });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task A_missing_list_of_ids_is_a_validation_error()
    {
        var team = await TestTeam.CreateAsync(_factory);

        var response = await team.ClientFor("Maya Chen").PostAsJsonAsync("/api/requests/approve", new { });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    // ---- helpers ----

    /// <summary>A pending request, sent by <paramref name="member"/> through the real endpoint.</summary>
    private static async Task<Guid> RequestAsync(TestTeam team, string member, string first, string last, string? note)
    {
        var response = await team.ClientFor(member).PostAsJsonAsync("/api/requests", new { firstDay = first, lastDay = last, note });
        response.StatusCode.Should().Be(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        return (await Json(response)).GetProperty("id").GetGuid();
    }

    private static Task<HttpResponseMessage> ApproveAsync(TestTeam team, string caller, params Guid[] ids) =>
        team.ClientFor(caller).PostAsJsonAsync("/api/requests/approve", new { ids });

    private static Task<JsonElement> MonthAsync(TestTeam team, string caller, string month = "2026-11") =>
        Sheet.MonthMembersTests.GetMonthAsync(team.ClientFor(caller), month);

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
