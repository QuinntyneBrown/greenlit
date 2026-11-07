using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.Requests;

/// <summary>
/// POST /api/requests/{id}/reopen: Undo of an approval (L2-024 AC3).
/// Design: docs/detailed-designs/requests/approve-request. November 2026: the 16th is a Monday.
/// </summary>
public class ReopenRequestTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public ReopenRequestTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Signed_out_callers_get_401()
    {
        var response = await _factory.CreateClient().PostAsync($"/api/requests/{Guid.NewGuid()}/reopen", null);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Undoing_an_approval_puts_the_request_back_to_pending_and_its_days_to_requested()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var id = await ApprovedRequestAsync(team);

        var response = await ReopenAsync(team, "Maya Chen", id);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await team.RequestsOfAsync("Ana Ruiz")).Should().ContainSingle()
            .Which.Should().Be(new RequestRow("2026-11-16", "2026-11-20", null, "Pending", 5));
        var month = await MonthAsync(team);
        foreach (var date in new[] { "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20" })
            KindOf(month, "Ana Ruiz", date).Should().Be("Requested");
    }

    [Fact]
    public async Task A_reopened_request_can_be_approved_again()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var id = await ApprovedRequestAsync(team);
        await ReopenAsync(team, "Maya Chen", id);

        var again = await team.ClientFor("Maya Chen").PostAsJsonAsync("/api/requests/approve", new { ids = new[] { id } });

        again.StatusCode.Should().Be(HttpStatusCode.OK);
        KindOf(await MonthAsync(team), "Ana Ruiz", "2026-11-18").Should().Be("Confirmed");
    }

    [Fact]
    public async Task Undo_sends_no_second_email()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var id = await ApprovedRequestAsync(team);
        var sent = _factory.Emails.To(team.EmailOf("Ana Ruiz")).Count;

        await ReopenAsync(team, "Maya Chen", id);

        sent.Should().Be(1);
        _factory.Emails.To(team.EmailOf("Ana Ruiz")).Count.Should().Be(sent);
    }

    [Fact]
    public async Task A_day_the_manager_changed_after_approving_is_left_as_it_is()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var id = await ApprovedRequestAsync(team);
        var ana = team.MemberIdOf("Ana Ruiz");
        (await team.ClientFor("Maya Chen").PutAsJsonAsync("/api/sheet/days", new { memberId = ana, dates = new[] { "2026-11-18" }, status = (string?)null }))
            .StatusCode.Should().Be(HttpStatusCode.OK);

        var response = await ReopenAsync(team, "Maya Chen", id);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var month = await MonthAsync(team);
        KindOf(month, "Ana Ruiz", "2026-11-17").Should().Be("Requested");
        KindOf(month, "Ana Ruiz", "2026-11-18").Should().Be("Working");
    }

    [Fact]
    public async Task A_member_cannot_undo_an_approval()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var id = await ApprovedRequestAsync(team);

        var response = await ReopenAsync(team, "Ana Ruiz", id);

        await AssertProblem(response, HttpStatusCode.Forbidden, "forbidden");
        (await team.RequestsOfAsync("Ana Ruiz")).Single().Status.Should().Be("Approved");
    }

    [Fact]
    public async Task An_unknown_request_and_another_teams_request_are_the_same_404()
    {
        var team = await TestTeam.CreateAsync(_factory);
        var other = await TestTeam.CreateAsync(_factory, "Olu Bello", teamName: "Other team");
        await other.AddMemberAsync("Ola Ito");
        var theirs = await ApprovedRequestAsync(other, "Ola Ito", "Olu Bello");

        await AssertProblem(await ReopenAsync(team, "Maya Chen", theirs), HttpStatusCode.NotFound, "request_not_found");
        await AssertProblem(await ReopenAsync(team, "Maya Chen", Guid.NewGuid()), HttpStatusCode.NotFound, "request_not_found");
        (await other.RequestsOfAsync("Ola Ito")).Single().Status.Should().Be("Approved");
    }

    [Fact]
    public async Task A_request_that_is_not_approved_cannot_be_reopened()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var sent = await team.ClientFor("Ana Ruiz").PostAsJsonAsync("/api/requests", new { firstDay = "2026-11-16", lastDay = "2026-11-20" });
        var id = (await Json(sent)).GetProperty("id").GetGuid();

        var response = await ReopenAsync(team, "Maya Chen", id);

        await AssertProblem(response, HttpStatusCode.Conflict, "request_not_approved");
        KindOf(await MonthAsync(team), "Ana Ruiz", "2026-11-16").Should().Be("Requested");
    }

    private static async Task<Guid> ApprovedRequestAsync(TestTeam team, string member = "Ana Ruiz", string manager = "Maya Chen")
    {
        var sent = await team.ClientFor(member).PostAsJsonAsync("/api/requests", new { firstDay = "2026-11-16", lastDay = "2026-11-20" });
        sent.StatusCode.Should().Be(HttpStatusCode.Created);
        var id = (await Json(sent)).GetProperty("id").GetGuid();
        (await team.ClientFor(manager).PostAsJsonAsync("/api/requests/approve", new { ids = new[] { id } }))
            .StatusCode.Should().Be(HttpStatusCode.OK);
        return id;
    }

    private static Task<HttpResponseMessage> ReopenAsync(TestTeam team, string caller, Guid id) =>
        team.ClientFor(caller).PostAsync($"/api/requests/{id}/reopen", null);

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
