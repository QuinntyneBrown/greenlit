using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.CoverageMinimum;

/// <summary>
/// PUT /api/team/settings/coverage (L2-041). Design: docs/detailed-designs/teams/coverage-minimum.
/// A team of three: Maya (manager), Ana and Ben.
/// </summary>
public class SaveCoverageTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public SaveCoverageTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task A_new_team_has_no_minimum_and_settings_report_the_team_size()
    {
        var team = await ThreeAsync();

        var settings = await SettingsAsync(team.ClientFor("Maya Chen"));

        settings.GetProperty("coverageMinimum").GetInt32().Should().Be(0);
        settings.GetProperty("teamSize").GetInt32().Should().Be(3);
    }

    [Fact]
    public async Task The_manager_saves_the_minimum_and_reads_it_back()
    {
        var team = await ThreeAsync();
        var maya = team.ClientFor("Maya Chen");

        var saved = await maya.PutAsJsonAsync("/api/team/settings/coverage", new { minimum = 2 });

        saved.StatusCode.Should().Be(HttpStatusCode.OK, await saved.Content.ReadAsStringAsync());
        (await saved.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("coverageMinimum").GetInt32().Should().Be(2);
        (await SettingsAsync(maya)).GetProperty("coverageMinimum").GetInt32().Should().Be(2);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(4)]
    public async Task A_minimum_outside_zero_to_the_team_size_is_refused_and_nothing_is_saved(int minimum)
    {
        var team = await ThreeAsync();
        var maya = team.ClientFor("Maya Chen");
        await maya.PutAsJsonAsync("/api/team/settings/coverage", new { minimum = 1 });

        var response = await maya.PutAsJsonAsync("/api/team/settings/coverage", new { minimum });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("errors").GetProperty("Minimum")[0].GetString().Should().Be("Choose between 0 and 3 people.");
        (await SettingsAsync(maya)).GetProperty("coverageMinimum").GetInt32().Should().Be(1);
    }

    [Fact]
    public async Task The_whole_team_may_be_the_minimum_and_zero_clears_it()
    {
        var team = await ThreeAsync();
        var maya = team.ClientFor("Maya Chen");

        (await maya.PutAsJsonAsync("/api/team/settings/coverage", new { minimum = 3 })).StatusCode.Should().Be(HttpStatusCode.OK);
        (await maya.PutAsJsonAsync("/api/team/settings/coverage", new { minimum = 0 })).StatusCode.Should().Be(HttpStatusCode.OK);

        (await SettingsAsync(maya)).GetProperty("coverageMinimum").GetInt32().Should().Be(0);
    }

    [Fact]
    public async Task A_missing_minimum_is_refused()
    {
        var team = await ThreeAsync();

        var response = await team.ClientFor("Maya Chen").PutAsJsonAsync("/api/team/settings/coverage", new { });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Only_the_manager_saves_the_minimum()
    {
        var team = await ThreeAsync();

        var response = await team.ClientFor("Ana Ruiz").PutAsJsonAsync("/api/team/settings/coverage", new { minimum = 2 });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await SettingsAsync(team.ClientFor("Maya Chen"))).GetProperty("coverageMinimum").GetInt32().Should().Be(0);
    }

    [Fact]
    public async Task Changing_the_minimum_changes_only_the_callers_team()
    {
        var ours = await ThreeAsync();
        var theirs = await TestTeam.CreateAsync(_factory, "Other Manager", teamName: "Other team");

        await ours.ClientFor("Maya Chen").PutAsJsonAsync("/api/team/settings/coverage", new { minimum = 2 });

        (await SettingsAsync(theirs.ClientFor("Other Manager"))).GetProperty("coverageMinimum").GetInt32().Should().Be(0);
    }

    private async Task<TestTeam> ThreeAsync()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Ben Okafor");
        return team;
    }

    private static async Task<JsonElement> SettingsAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/team/settings");
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }
}
