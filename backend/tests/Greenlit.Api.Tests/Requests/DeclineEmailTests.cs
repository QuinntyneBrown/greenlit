using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.Requests;

/// <summary>
/// The decision email of a decline (L2-025 AC2, L2-043 AC3 until journey 25 adds the switch).
/// Design: docs/detailed-designs/requests/decline-request. Emails go to the recording sender.
/// </summary>
public class DeclineEmailTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public DeclineEmailTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task The_member_is_emailed_the_reason()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var id = await RequestAsync(team);

        var response = await DeclineAsync(team, id, "Dev is already out that week.");

        (await Json(response)).GetProperty("emailed").GetBoolean().Should().BeTrue();
        var email = _factory.Emails.To(team.EmailOf("Ana Ruiz")).Should().ContainSingle().Subject;
        email.Subject.Should().Be("Your time off request was declined");
        email.Body.Should().Contain("Hi Ana Ruiz,");
        email.Body.Should().Contain("Maya Chen declined your request for 16–20 Nov.");
        email.Body.Should().Contain("Dev is already out that week.");
        email.Body.Should().Contain("blue");
    }

    [Fact]
    public async Task Without_a_reason_the_email_still_says_it_was_declined()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var id = await RequestAsync(team);

        await DeclineAsync(team, id, null);

        var email = _factory.Emails.To(team.EmailOf("Ana Ruiz")).Should().ContainSingle().Subject;
        email.Body.Should().Contain("Maya Chen declined your request for 16–20 Nov.");
        email.Body.Should().NotContain("Reason");
    }

    [Fact]
    public async Task A_member_with_no_address_is_not_emailed_and_the_decline_stands()
    {
        var team = await TestTeam.CreateAsync(_factory);
        var row = await team.AddMemberAsync("Finn Murphy", withAccount: false);
        await _factory.WriteAsync(db => db.TimeOffRequests.Add(new Greenlit.Domain.Entities.TimeOffRequest
        {
            Id = Guid.NewGuid(),
            TeamMemberId = row.Id,
            FirstDay = new DateOnly(2026, 11, 16),
            LastDay = new DateOnly(2026, 11, 16),
            CreatedUtc = DateTimeOffset.UtcNow,
        }));
        var id = (await Json(await team.ClientFor("Maya Chen").GetAsync("/api/requests")))[0].GetProperty("id").GetGuid();
        var before = _factory.Emails.Sent.Count;

        var response = await DeclineAsync(team, id, "No");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await Json(response)).GetProperty("emailed").GetBoolean().Should().BeFalse();
        _factory.Emails.Sent.Count.Should().Be(before);
        (await team.RequestsOfAsync("Finn Murphy")).Single().Status.Should().Be("Declined");
    }

    [Fact]
    public async Task An_email_that_cannot_be_sent_does_not_undo_the_decline()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var id = await RequestAsync(team);

        _factory.Emails.Failing = true;
        HttpResponseMessage response;
        try
        {
            response = await DeclineAsync(team, id, "No");
        }
        finally
        {
            _factory.Emails.Failing = false;
        }

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await Json(response)).GetProperty("emailed").GetBoolean().Should().BeFalse();
        (await team.RequestsOfAsync("Ana Ruiz")).Single().Status.Should().Be("Declined");
        _factory.Emails.To(team.EmailOf("Ana Ruiz")).Should().BeEmpty();
    }

    [Fact]
    public async Task A_refused_decline_sends_nothing()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var id = await RequestAsync(team);
        await DeclineAsync(team, id, "No");
        var after = _factory.Emails.To(team.EmailOf("Ana Ruiz")).Count;

        var again = await DeclineAsync(team, id, "Again");

        again.StatusCode.Should().Be(HttpStatusCode.Conflict);
        _factory.Emails.To(team.EmailOf("Ana Ruiz")).Count.Should().Be(after);
    }

    private static async Task<Guid> RequestAsync(TestTeam team)
    {
        var response = await team.ClientFor("Ana Ruiz").PostAsJsonAsync("/api/requests", new { firstDay = "2026-11-16", lastDay = "2026-11-20" });
        response.StatusCode.Should().Be(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        return (await Json(response)).GetProperty("id").GetGuid();
    }

    private static Task<HttpResponseMessage> DeclineAsync(TestTeam team, Guid id, string? reason) =>
        team.ClientFor("Maya Chen").PostAsJsonAsync($"/api/requests/{id}/decline", new { reason });

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
}
