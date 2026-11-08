using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.Teams;

/// <summary>
/// GET /api/teams/mine: the teams the caller manages (L2-054 AC2, AC6, AC7, AC8). Design: docs/detailed-designs/teams/switch-team.
/// </summary>
public class MyTeamsTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public MyTeamsTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task A_manager_sees_each_team_they_manage_oldest_first_with_the_active_and_default_marked()
    {
        // L2-054 AC2. Given a manager of Design team (default) and Product team, signed in on Product team,
        // when they read their teams, then both are listed oldest first, Product team active and Design team default.
        var design = await TestTeam.CreateAsync(_factory, "Maya Chen");
        var product = await design.AddTeamAsync("Product team");
        await design.SetDefaultTeamAsync(design.Team.Id);
        await TestTeam.CreateAsync(_factory, "Omar Diaz", teamName: "Other team");

        var teams = await MineAsync(product.SessionFor("Maya Chen"));

        teams.Should().Equal(
            new MyTeam(design.Team.Id, "Design team", Active: false, IsDefault: true),
            new MyTeam(product.Team.Id, "Product team", Active: true, IsDefault: false));
    }

    [Fact]
    public async Task A_manager_of_one_team_sees_it_as_both_active_and_default()
    {
        // L2-054 AC6, AC1: one team is the default without any setup.
        var design = await TestTeam.CreateAsync(_factory, "Maya Chen");

        var teams = await MineAsync(design.SessionFor("Maya Chen"));

        teams.Should().Equal(new MyTeam(design.Team.Id, "Design team", Active: true, IsDefault: true));
    }

    [Fact]
    public async Task A_member_manages_no_team_so_the_list_is_empty()
    {
        // L2-054 AC7, AC8: a member, even one whose row says Manager, sees no team of anyone else's.
        var design = await TestTeam.CreateAsync(_factory, "Maya Chen");
        var ana = await design.AddMemberAsync("Ana Ruiz");
        await _factory.WriteAsync(db => db.TeamMembers.Single(m => m.Id == ana.Id).Role = Greenlit.Domain.Enums.UserRole.Manager);

        (await MineAsync(design.SessionFor("Ana Ruiz"))).Should().BeEmpty();
    }

    [Fact]
    public async Task A_person_on_no_team_gets_an_empty_list()
    {
        var noor = await TestAccount.CreateAsync(_factory);

        (await MineAsync(_factory.ClientFor(noor))).Should().BeEmpty();
    }

    [Fact]
    public async Task Without_a_session_the_request_is_unauthorized()
    {
        var response = await _factory.CreateClient().GetAsync("/api/teams/mine");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private static async Task<List<MyTeam>> MineAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/teams/mine");
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return (await response.Content.ReadFromJsonAsync<List<MyTeam>>(new JsonSerializerOptions(JsonSerializerDefaults.Web)))!;
    }

    private sealed record MyTeam(Guid Id, string Name, bool Active, bool IsDefault);
}
