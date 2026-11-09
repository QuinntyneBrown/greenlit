using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Microsoft.EntityFrameworkCore;

namespace Greenlit.Api.Tests.TeamSettings;

/// <summary>
/// GET /api/team/settings/team (L2-009 AC1, AC3). Design: docs/detailed-designs/teams/team-settings.
/// Unlike the allowance defaults, the Team section is readable by every member of the team.
/// </summary>
public class TeamSectionReadTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public TeamSectionReadTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task The_manager_reads_the_name_time_zone_and_one_row_per_member()
    {
        var team = await TestTeam.CreateAsync(_factory, timeZone: "Europe/Dublin", teamName: "Design team");
        var ana = await team.AddMemberAsync("Ana Ruiz");
        await _factory.WriteAsync(db => db.TeamMembers.Where(m => m.Id == ana.Id).ExecuteUpdateAsync(s => s.SetProperty(m => m.YearlyDays, 27)));

        var section = await GetAsync(team.ClientFor("Maya Chen"));

        section.GetProperty("name").GetString().Should().Be("Design team");
        section.GetProperty("timeZone").GetString().Should().Be("Europe/Dublin");
        section.GetProperty("canEdit").GetBoolean().Should().BeTrue();
        var members = section.GetProperty("members").EnumerateArray().ToList();
        members.Select(m => m.GetProperty("name").GetString()).Should().Equal("Maya Chen", "Ana Ruiz");
        members[0].GetProperty("role").GetString().Should().Be("Manager");
        members[1].GetProperty("role").GetString().Should().Be("Member");
        members[1].GetProperty("id").GetGuid().Should().Be(ana.Id);
        members[1].GetProperty("yearlyDays").GetInt32().Should().Be(27);
    }

    [Fact]
    public async Task A_member_reads_the_same_section_but_cannot_edit_it()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var response = await team.ClientFor("Ana Ruiz").GetAsync("/api/team/settings/team");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var section = await response.Content.ReadFromJsonAsync<JsonElement>();
        section.GetProperty("canEdit").GetBoolean().Should().BeFalse();
        section.GetProperty("members").GetArrayLength().Should().Be(2);
    }

    [Fact]
    public async Task A_member_reads_effective_yearly_days_while_the_manager_can_still_edit_the_default()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Ben Okafor");
        await team.SetDefaultsAsync(28);
        await team.SetYearlyDaysAsync("Ben Okafor", 22);

        var memberSection = await GetAsync(team.ClientFor("Ana Ruiz"));
        var memberRows = memberSection.GetProperty("members").EnumerateArray().ToList();
        memberRows.Select(m => m.GetProperty("yearlyDays").GetInt32()).Should().Equal(28, 28, 22);

        var managerSection = await GetAsync(team.ClientFor("Maya Chen"));
        var managerRows = managerSection.GetProperty("members").EnumerateArray().ToList();
        managerRows[1].GetProperty("yearlyDays").ValueKind.Should().Be(JsonValueKind.Null);
        managerRows[2].GetProperty("yearlyDays").GetInt32().Should().Be(22);
    }

    [Fact]
    public async Task A_caller_sees_only_their_own_team()
    {
        var ours = await TestTeam.CreateAsync(_factory);
        var theirs = await TestTeam.CreateAsync(_factory, "Other Manager", teamName: "Other team");
        await theirs.AddMemberAsync("Zed Other");

        var section = await GetAsync(ours.ClientFor("Maya Chen"));

        section.GetProperty("name").GetString().Should().Be("Design team");
        section.GetProperty("members").EnumerateArray().Select(m => m.GetProperty("name").GetString())
            .Should().Equal("Maya Chen");
    }

    [Fact]
    public async Task Signed_out_callers_get_401()
    {
        (await _factory.CreateClient().GetAsync("/api/team/settings/team")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private static async Task<JsonElement> GetAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/team/settings/team");
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }
}
