using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.Teams;

/// <summary>
/// GET /api/teams/mine: the teams the caller belongs to, each saying whether they manage it (L2-054 AC2, AC6, AC8;
/// L2-055, L2-056 AC1; ADR-015). Design: docs/detailed-designs/teams/switch-team.
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
            new MyTeam(design.Team.Id, "Design team", Active: false, IsDefault: true, Manages: true),
            new MyTeam(product.Team.Id, "Product team", Active: true, IsDefault: false, Manages: true));
    }

    [Fact]
    public async Task A_manager_of_one_team_sees_it_as_both_active_and_default()
    {
        // L2-054 AC6, AC1: one team is the default without any setup.
        var design = await TestTeam.CreateAsync(_factory, "Maya Chen");

        var teams = await MineAsync(design.SessionFor("Maya Chen"));

        teams.Should().Equal(new MyTeam(design.Team.Id, "Design team", Active: true, IsDefault: true, Manages: true));
    }

    [Fact]
    public async Task A_member_sees_their_team_as_one_they_do_not_manage()
    {
        // L2-054 AC8, L2-056 AC1 (ADR-015): a member, even one whose row says Manager, sees their own team only,
        // marked as not managed, and nothing of anyone else's.
        var design = await TestTeam.CreateAsync(_factory, "Maya Chen");
        var ana = await design.AddMemberAsync("Ana Ruiz");
        await _factory.WriteAsync(db => db.TeamMembers.Single(m => m.Id == ana.Id).Role = Greenlit.Domain.Enums.UserRole.Manager);
        await TestTeam.CreateAsync(_factory, "Omar Diaz", teamName: "Other team");

        (await MineAsync(design.SessionFor("Ana Ruiz"))).Should().Equal(
            new MyTeam(design.Team.Id, "Design team", Active: true, IsDefault: true, Manages: false));
    }

    [Fact]
    public async Task A_member_of_two_teams_sees_both_oldest_first_with_the_team_they_joined_first_as_default()
    {
        // L2-055, L2-056 AC1, AC4. Given Sam, a member of Product team and of Chen family who joined Chen family
        // first, signed in on Product team, then both are listed oldest first and Chen family is the default.
        var product = await TestTeam.CreateAsync(_factory, "Omar Diaz", teamName: "Product team");
        await product.AddMemberAsync("Sam Chen");
        var family = await TestTeam.CreateAsync(_factory, "Maya Chen", teamName: "Chen family");
        await _factory.WriteAsync(db => db.Teams.Single(t => t.Id == family.Team.Id).CreatedUtc = product.Team.CreatedUtc.AddMinutes(5));
        await family.AddExistingMemberAsync(product, "Sam Chen");
        var sam = product.UserOf("Sam Chen");
        await _factory.WriteAsync(db => db.Users.Single(u => u.Id == sam.Id).DefaultTeamId = family.Team.Id);

        (await MineAsync(product.SessionFor("Sam Chen"))).Should().Equal(
            new MyTeam(product.Team.Id, "Product team", Active: true, IsDefault: false, Manages: false),
            new MyTeam(family.Team.Id, "Chen family", Active: false, IsDefault: true, Manages: false));
    }

    [Fact]
    public async Task A_manager_who_is_a_member_elsewhere_sees_both_with_only_their_own_team_managed()
    {
        // L2-055 AC4, L2-054 AC1: the managed team is the default; the member team is listed but not managed.
        var design = await TestTeam.CreateAsync(_factory, "Maya Chen");
        var other = await TestTeam.CreateAsync(_factory, "Omar Diaz", teamName: "Product team");
        await _factory.WriteAsync(db => db.Teams.Single(t => t.Id == other.Team.Id).CreatedUtc = design.Team.CreatedUtc.AddMinutes(5));
        await other.AddExistingMemberAsync(design, "Maya Chen");

        (await MineAsync(design.SessionFor("Maya Chen"))).Should().Equal(
            new MyTeam(design.Team.Id, "Design team", Active: true, IsDefault: true, Manages: true),
            new MyTeam(other.Team.Id, "Product team", Active: false, IsDefault: false, Manages: false));
    }

    [Fact]
    public async Task A_team_the_person_was_removed_from_is_not_listed()
    {
        // L2-058 AC9: removal from one team leaves the other membership.
        var product = await TestTeam.CreateAsync(_factory, "Omar Diaz", teamName: "Product team");
        await product.AddMemberAsync("Sam Chen");
        var family = await TestTeam.CreateAsync(_factory, "Maya Chen", teamName: "Chen family");
        var row = await family.AddExistingMemberAsync(product, "Sam Chen");
        await _factory.WriteAsync(db => db.TeamMembers.Single(m => m.Id == row.Id).RemovedUtc = DateTimeOffset.UtcNow);

        (await MineAsync(product.SessionFor("Sam Chen"))).Select(t => t.Name).Should().Equal("Product team");
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

    private sealed record MyTeam(Guid Id, string Name, bool Active, bool IsDefault, bool Manages);
}
