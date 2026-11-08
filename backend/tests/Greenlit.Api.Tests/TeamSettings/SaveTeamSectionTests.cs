using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.TeamSettings;

/// <summary>
/// PUT /api/team/settings/team (L2-009 AC2). Design: docs/detailed-designs/teams/team-settings.
/// </summary>
public class SaveTeamSectionTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public SaveTeamSectionTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task The_manager_saves_the_name_time_zone_roles_and_yearly_days_and_reads_them_back()
    {
        var team = await TestTeam.CreateAsync(_factory);
        var ana = await team.AddMemberAsync("Ana Ruiz");
        var finn = await team.AddMemberAsync("Finn Murphy");
        var maya = team.ClientFor("Maya Chen");

        var saved = await maya.PutAsJsonAsync("/api/team/settings/team", new
        {
            name = "Product design",
            timeZone = "Europe/Paris",
            members = new object[]
            {
                new { id = team.ManagerRow.Id, role = "Manager", yearlyDays = 25 },
                new { id = ana.Id, role = "Manager", yearlyDays = (int?)null },
                new { id = finn.Id, role = "Member", yearlyDays = 22 },
            },
        });

        saved.StatusCode.Should().Be(HttpStatusCode.OK, await saved.Content.ReadAsStringAsync());
        var section = await maya.GetFromJsonAsync<JsonElement>("/api/team/settings/team");
        section.GetProperty("name").GetString().Should().Be("Product design");
        section.GetProperty("timeZone").GetString().Should().Be("Europe/Paris");
        var rows = section.GetProperty("members").EnumerateArray().ToDictionary(m => m.GetProperty("name").GetString()!);
        rows["Ana Ruiz"].GetProperty("role").GetString().Should().Be("Manager");
        rows["Finn Murphy"].GetProperty("yearlyDays").GetInt32().Should().Be(22);
        rows["Maya Chen"].GetProperty("yearlyDays").GetInt32().Should().Be(25);
    }

    [Theory]
    [InlineData("Europe/Rome")]
    [InlineData("America/Toronto")]
    public async Task The_manager_moves_the_team_to_rome_or_toronto(string timeZone)
    {
        // L2-009 AC2 with the options of L2-008 AC2.
        var team = await TestTeam.CreateAsync(_factory);
        var maya = team.ClientFor("Maya Chen");

        var saved = await maya.PutAsJsonAsync("/api/team/settings/team", new
        {
            name = "Design team",
            timeZone,
            members = new[] { new { id = team.ManagerRow.Id, role = "Manager", yearlyDays = (int?)25 } },
        });

        saved.StatusCode.Should().Be(HttpStatusCode.OK, await saved.Content.ReadAsStringAsync());
        var section = await maya.GetFromJsonAsync<JsonElement>("/api/team/settings/team");
        section.GetProperty("timeZone").GetString().Should().Be(timeZone);
    }

    [Theory]
    [InlineData("", "Europe/London", "Name")]
    [InlineData("   ", "Europe/London", "Name")]
    [InlineData("Design team", "Mars/Olympus", "TimeZone")]
    public async Task A_name_or_time_zone_that_is_not_valid_is_refused_and_nothing_is_saved(string name, string timeZone, string field)
    {
        var team = await TestTeam.CreateAsync(_factory);
        var maya = team.ClientFor("Maya Chen");

        var response = await maya.PutAsJsonAsync("/api/team/settings/team",
            new { name, timeZone, members = new[] { new { id = team.ManagerRow.Id, role = "Manager", yearlyDays = (int?)30 } } });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("errors").TryGetProperty(field, out _).Should().BeTrue();
        await AssertUnchangedAsync(maya);
    }

    [Fact]
    public async Task Negative_yearly_days_are_refused_and_nothing_is_saved()
    {
        var team = await TestTeam.CreateAsync(_factory);
        var maya = team.ClientFor("Maya Chen");

        var response = await maya.PutAsJsonAsync("/api/team/settings/team", new
        {
            name = "Renamed",
            timeZone = "Europe/London",
            members = new[] { new { id = team.ManagerRow.Id, role = "Manager", yearlyDays = (int?)-1 } },
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        await AssertUnchangedAsync(maya);
    }

    [Fact]
    public async Task The_team_keeps_its_manager()
    {
        var team = await TestTeam.CreateAsync(_factory);
        var maya = team.ClientFor("Maya Chen");

        var response = await maya.PutAsJsonAsync("/api/team/settings/team", new
        {
            name = "Renamed",
            timeZone = "Europe/London",
            members = new[] { new { id = team.ManagerRow.Id, role = "Member", yearlyDays = (int?)null } },
        });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        await AssertUnchangedAsync(maya);
    }

    [Fact]
    public async Task Only_the_manager_saves_the_section()
    {
        var team = await TestTeam.CreateAsync(_factory);
        var ana = await team.AddMemberAsync("Ana Ruiz");

        var response = await team.ClientFor("Ana Ruiz").PutAsJsonAsync("/api/team/settings/team", new
        {
            name = "Hijacked",
            timeZone = "Europe/London",
            members = new[] { new { id = ana.Id, role = "Manager", yearlyDays = (int?)99 } },
        });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        await AssertUnchangedAsync(team.ClientFor("Maya Chen"));
    }

    [Fact]
    public async Task Another_teams_member_cannot_be_changed()
    {
        var ours = await TestTeam.CreateAsync(_factory);
        var theirs = await TestTeam.CreateAsync(_factory, "Other Manager", teamName: "Other team");
        var zed = await theirs.AddMemberAsync("Zed Other");
        var maya = ours.ClientFor("Maya Chen");

        var response = await maya.PutAsJsonAsync("/api/team/settings/team", new
        {
            name = "Renamed",
            timeZone = "Europe/London",
            members = new[] { new { id = zed.Id, role = "Manager", yearlyDays = (int?)99 } },
        });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        await AssertUnchangedAsync(maya);
        var other = await theirs.ClientFor("Other Manager").GetFromJsonAsync<JsonElement>("/api/team/settings/team");
        other.GetProperty("members").EnumerateArray().Single(m => m.GetProperty("name").GetString() == "Zed Other")
            .GetProperty("yearlyDays").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task Renaming_the_team_renames_only_the_callers_team()
    {
        var ours = await TestTeam.CreateAsync(_factory);
        var theirs = await TestTeam.CreateAsync(_factory, "Other Manager", teamName: "Other team");

        await ours.ClientFor("Maya Chen").PutAsJsonAsync("/api/team/settings/team", new
        {
            name = "Renamed",
            timeZone = "Europe/London",
            members = new[] { new { id = ours.ManagerRow.Id, role = "Manager", yearlyDays = (int?)null } },
        });

        var other = await theirs.ClientFor("Other Manager").GetFromJsonAsync<JsonElement>("/api/team/settings/team");
        other.GetProperty("name").GetString().Should().Be("Other team");
    }

    private static async Task AssertUnchangedAsync(HttpClient manager)
    {
        var section = await manager.GetFromJsonAsync<JsonElement>("/api/team/settings/team");
        section.GetProperty("name").GetString().Should().Be("Design team");
        section.GetProperty("timeZone").GetString().Should().Be("Europe/London");
        section.GetProperty("members").EnumerateArray().Select(m => m.GetProperty("yearlyDays").ValueKind)
            .Should().OnlyContain(k => k == JsonValueKind.Null);
        section.GetProperty("members").EnumerateArray().Count(m => m.GetProperty("role").GetString() == "Manager")
            .Should().Be(1);
    }
}
