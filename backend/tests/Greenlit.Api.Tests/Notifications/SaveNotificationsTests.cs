using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.Notifications;

/// <summary>
/// PUT /api/team/settings/notifications (L2-043). Design: docs/detailed-designs/teams/notification-settings.
/// </summary>
public class SaveNotificationsTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public SaveNotificationsTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task A_new_team_has_both_switches_on()
    {
        var team = await TestTeam.CreateAsync(_factory);

        var settings = await SettingsAsync(team.ClientFor("Maya Chen"));

        settings.GetProperty("notifyNewRequests").GetBoolean().Should().BeTrue();
        settings.GetProperty("notifyDecisions").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task The_manager_saves_each_switch_and_reads_it_back()
    {
        var team = await TestTeam.CreateAsync(_factory);
        var maya = team.ClientFor("Maya Chen");

        var saved = await maya.PutAsJsonAsync("/api/team/settings/notifications", new { newRequests = false, decisions = true });

        saved.StatusCode.Should().Be(HttpStatusCode.OK, await saved.Content.ReadAsStringAsync());
        var body = await saved.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("notifyNewRequests").GetBoolean().Should().BeFalse();
        body.GetProperty("notifyDecisions").GetBoolean().Should().BeTrue();
        var settings = await SettingsAsync(maya);
        settings.GetProperty("notifyNewRequests").GetBoolean().Should().BeFalse();
        settings.GetProperty("notifyDecisions").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task A_missing_switch_is_refused_and_nothing_is_saved()
    {
        var team = await TestTeam.CreateAsync(_factory);
        var maya = team.ClientFor("Maya Chen");

        var response = await maya.PutAsJsonAsync("/api/team/settings/notifications", new { newRequests = false });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await SettingsAsync(maya)).GetProperty("notifyNewRequests").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task Only_the_manager_saves_the_switches()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var response = await team.ClientFor("Ana Ruiz").PutAsJsonAsync("/api/team/settings/notifications", new { newRequests = false, decisions = false });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await SettingsAsync(team.ClientFor("Maya Chen"))).GetProperty("notifyNewRequests").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task Changing_the_switches_changes_only_the_callers_team()
    {
        var ours = await TestTeam.CreateAsync(_factory);
        var theirs = await TestTeam.CreateAsync(_factory, "Other Manager", teamName: "Other team");

        await ours.ClientFor("Maya Chen").PutAsJsonAsync("/api/team/settings/notifications", new { newRequests = false, decisions = false });

        var settings = await SettingsAsync(theirs.ClientFor("Other Manager"));
        settings.GetProperty("notifyNewRequests").GetBoolean().Should().BeTrue();
        settings.GetProperty("notifyDecisions").GetBoolean().Should().BeTrue();
    }

    private static async Task<JsonElement> SettingsAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/team/settings");
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }
}
