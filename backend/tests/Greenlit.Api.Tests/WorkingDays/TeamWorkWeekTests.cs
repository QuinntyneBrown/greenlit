using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Sheet;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.WorkingDays;

/// <summary>
/// PUT /api/team/settings/work-week (L2-039). Design: docs/detailed-designs/teams/working-days.
/// November 2026: Fri 6, Fri 13; Sat 7.
/// </summary>
public class TeamWorkWeekTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public TeamWorkWeekTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task A_new_team_works_Monday_to_Friday()
    {
        // L2-039 AC1: the team's working days are on, Mon-Fri for the mock team.
        var team = await TestTeam.CreateAsync(_factory);

        var settings = await SettingsAsync(team.ClientFor("Maya Chen"));

        Days(settings).Should().Equal("Mon", "Tue", "Wed", "Thu", "Fri");
    }

    [Fact]
    public async Task The_manager_saves_the_work_week_and_reads_it_back()
    {
        var team = await TestTeam.CreateAsync(_factory);
        var maya = team.ClientFor("Maya Chen");

        var saved = await maya.PutAsJsonAsync("/api/team/settings/work-week", new { days = new[] { "Mon", "Tue", "Wed", "Thu" } });

        saved.StatusCode.Should().Be(HttpStatusCode.OK, await saved.Content.ReadAsStringAsync());
        Days(await SettingsAsync(maya)).Should().Equal("Mon", "Tue", "Wed", "Thu");
    }

    [Fact]
    public async Task Days_the_team_does_not_work_are_red_on_every_row()
    {
        // L2-039 AC2: off days show red on every row.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.ClientFor("Maya Chen").PutAsJsonAsync("/api/team/settings/work-week", new { days = new[] { "Mon", "Tue", "Wed", "Thu" } });

        var month = await MonthMembersTests.GetMonthAsync(team.ClientFor("Maya Chen"), "2026-11");

        foreach (var name in new[] { "Maya Chen", "Ana Ruiz" })
        {
            Kind(month, name, "2026-11-06").Should().Be("NotWorking"); // Friday
            Kind(month, name, "2026-11-05").Should().Be("Working");    // Thursday
        }
    }

    [Fact]
    public async Task A_work_week_with_no_days_is_refused_and_nothing_is_saved()
    {
        var team = await TestTeam.CreateAsync(_factory);
        var maya = team.ClientFor("Maya Chen");

        var response = await maya.PutAsJsonAsync("/api/team/settings/work-week", new { days = Array.Empty<string>() });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("errors").GetProperty("Days")[0].GetString().Should().Be("Pick at least one working day.");
        Days(await SettingsAsync(maya)).Should().HaveCount(5);
    }

    [Fact]
    public async Task Only_the_manager_saves_the_work_week()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var response = await team.ClientFor("Ana Ruiz").PutAsJsonAsync("/api/team/settings/work-week", new { days = new[] { "Mon" } });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        Days(await SettingsAsync(team.ClientFor("Maya Chen"))).Should().HaveCount(5);
    }

    [Fact]
    public async Task Changing_the_work_week_changes_only_the_callers_team()
    {
        var ours = await TestTeam.CreateAsync(_factory);
        var theirs = await TestTeam.CreateAsync(_factory, "Other Manager", teamName: "Other team");

        await ours.ClientFor("Maya Chen").PutAsJsonAsync("/api/team/settings/work-week", new { days = new[] { "Mon" } });

        Days(await SettingsAsync(theirs.ClientFor("Other Manager"))).Should().HaveCount(5);
    }

    private static string[] Days(JsonElement settings) =>
        settings.GetProperty("workingDays").EnumerateArray().Select(d => d.GetString()!).ToArray();

    private static async Task<JsonElement> SettingsAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/team/settings");
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    private static string Kind(JsonElement month, string member, string date) =>
        month.GetProperty("members").EnumerateArray()
            .Single(m => m.GetProperty("name").GetString() == member)
            .GetProperty("cells").EnumerateArray()
            .Single(c => c.GetProperty("date").GetString() == date)
            .GetProperty("kind").GetString()!;
}
