using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.Notifications;

/// <summary>
/// The Decisions switch (L2-043 AC3): approving or declining emails the member only when it is on,
/// and the answer says whether anyone was emailed, so the toast never claims an email that was not sent.
/// </summary>
public class DecisionEmailSwitchTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public DecisionEmailSwitchTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task With_decisions_off_approving_sends_no_email_and_reports_it()
    {
        var (team, id) = await PendingAsync(decisions: false);

        var response = await team.ClientFor("Maya Chen").PostAsJsonAsync("/api/requests/approve", new { ids = new[] { id } });

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        (await Json(response))[0].GetProperty("emailed").GetBoolean().Should().BeFalse();
        _factory.Emails.To(team.EmailOf("Ana Ruiz")).Should().BeEmpty();
        (await team.RequestsOfAsync("Ana Ruiz")).Single().Status.Should().Be("Approved");
    }

    [Fact]
    public async Task With_decisions_off_declining_sends_no_email_and_reports_it()
    {
        var (team, id) = await PendingAsync(decisions: false);

        var response = await team.ClientFor("Maya Chen").PostAsJsonAsync($"/api/requests/{id}/decline", new { reason = "Too busy" });

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        (await Json(response)).GetProperty("emailed").GetBoolean().Should().BeFalse();
        _factory.Emails.To(team.EmailOf("Ana Ruiz")).Should().BeEmpty();
        (await team.RequestsOfAsync("Ana Ruiz")).Single().Status.Should().Be("Declined");
    }

    [Fact]
    public async Task With_decisions_on_declining_emails_the_member_with_the_reason()
    {
        var (team, id) = await PendingAsync(decisions: true);

        var response = await team.ClientFor("Maya Chen").PostAsJsonAsync($"/api/requests/{id}/decline", new { reason = "Too busy" });

        (await Json(response)).GetProperty("emailed").GetBoolean().Should().BeTrue();
        _factory.Emails.To(team.EmailOf("Ana Ruiz")).Should().ContainSingle().Which.Body.Should().Contain("Too busy");
    }

    [Fact]
    public async Task The_new_requests_switch_does_not_gate_decision_emails()
    {
        var (team, id) = await PendingAsync(decisions: true, newRequests: false);

        var response = await team.ClientFor("Maya Chen").PostAsJsonAsync("/api/requests/approve", new { ids = new[] { id } });

        (await Json(response))[0].GetProperty("emailed").GetBoolean().Should().BeTrue();
        _factory.Emails.To(team.EmailOf("Ana Ruiz")).Should().ContainSingle();
    }

    private async Task<(TestTeam Team, Guid Id)> PendingAsync(bool decisions, bool newRequests = true)
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var saved = await team.ClientFor("Maya Chen")
            .PutAsJsonAsync("/api/team/settings/notifications", new { newRequests, decisions });
        saved.StatusCode.Should().Be(HttpStatusCode.OK);
        var sent = await team.ClientFor("Ana Ruiz").PostAsJsonAsync("/api/requests", new { firstDay = "2026-11-16", lastDay = "2026-11-20" });
        sent.StatusCode.Should().Be(HttpStatusCode.Created);
        return (team, (await Json(sent)).GetProperty("id").GetGuid());
    }

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
}
