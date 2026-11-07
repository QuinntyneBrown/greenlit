using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.Notifications;

/// <summary>
/// The new-request email (L2-043 AC2). Design: docs/detailed-designs/teams/notification-settings.
/// Emails go to the recording sender.
/// </summary>
public class NewRequestEmailTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public NewRequestEmailTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task With_new_requests_on_the_manager_is_emailed_when_a_member_sends_a_request()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var response = await SendAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-20", "Family trip");

        response.StatusCode.Should().Be(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        var email = _factory.Emails.To(team.EmailOf("Maya Chen")).Should().ContainSingle().Subject;
        email.Subject.Should().Be("Ana Ruiz asked for time off");
        email.Body.Should().Contain("Hi Maya Chen,");
        email.Body.Should().Contain("Ana Ruiz asked for 16–20 Nov (5 days).");
        email.Body.Should().Contain("Family trip");
    }

    [Fact]
    public async Task With_new_requests_off_nobody_is_emailed_and_the_request_is_still_sent()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.ClientFor("Maya Chen").PutAsJsonAsync("/api/team/settings/notifications", new { newRequests = false, decisions = true });

        var response = await SendAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-20");

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        _factory.Emails.To(team.EmailOf("Maya Chen")).Should().BeEmpty();
        (await team.RequestsOfAsync("Ana Ruiz")).Should().ContainSingle();
    }

    [Fact]
    public async Task A_refused_request_sends_nothing()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await SendAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-20");
        var before = _factory.Emails.To(team.EmailOf("Maya Chen")).Count;

        var again = await SendAsync(team, "Ana Ruiz", "2026-11-18", "2026-11-19");

        again.StatusCode.Should().Be(HttpStatusCode.Conflict);
        _factory.Emails.To(team.EmailOf("Maya Chen")).Count.Should().Be(before);
    }

    [Fact]
    public async Task An_email_that_cannot_be_sent_does_not_undo_the_request()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        _factory.Emails.Failing = true;
        HttpResponseMessage response;
        try
        {
            response = await SendAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-20");
        }
        finally
        {
            _factory.Emails.Failing = false;
        }

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        (await team.RequestsOfAsync("Ana Ruiz")).Should().ContainSingle().Which.Status.Should().Be("Pending");
        _factory.Emails.To(team.EmailOf("Maya Chen")).Should().BeEmpty();
    }

    [Fact]
    public async Task Another_teams_manager_is_not_emailed()
    {
        var ours = await TestTeam.CreateAsync(_factory);
        await ours.AddMemberAsync("Ana Ruiz");
        var theirs = await TestTeam.CreateAsync(_factory, "Other Manager", teamName: "Other team");

        await SendAsync(ours, "Ana Ruiz", "2026-11-16", "2026-11-20");

        _factory.Emails.To(theirs.EmailOf("Other Manager")).Should().BeEmpty();
    }

    private static Task<HttpResponseMessage> SendAsync(TestTeam team, string member, string first, string last, string? note = null) =>
        team.ClientFor(member).PostAsJsonAsync("/api/requests", new { firstDay = first, lastDay = last, note });
}
