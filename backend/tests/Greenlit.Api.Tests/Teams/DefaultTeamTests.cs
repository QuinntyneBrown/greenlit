using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Greenlit.Api.Tests.Teams;

/// <summary>
/// The default team and what sign-in opens (L2-054 AC1, AC12; ADR-014). Design: docs/detailed-designs/teams/switch-team.
/// </summary>
public class DefaultTeamTests : IClassFixture<FrozenClockApiFactory>
{
    private const string Password = "correct-horse-battery";
    private readonly FrozenClockApiFactory _factory;

    public DefaultTeamTests(FrozenClockApiFactory factory) => _factory = factory;

    [Fact]
    public async Task A_persons_first_team_becomes_their_default()
    {
        // L2-054 AC1. Given a person on no team, when they create a team, then it is their default.
        var noor = await TestAccount.CreateAsync(_factory, "Noor Haddad");

        var response = await _factory.ClientFor(noor).PostAsJsonAsync("/api/teams", new
        {
            name = "Design team", timeZone = "Europe/London", holidayCountry = "none", members = Array.Empty<object>(),
        });

        response.StatusCode.Should().Be(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        var teamId = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("teamId").GetGuid();
        (await DefaultTeamOfAsync(noor.Id)).Should().Be(teamId);
    }

    [Fact]
    public async Task Signing_in_opens_the_default_team_with_the_managers_row_on_it()
    {
        // L2-054 AC1. Given a manager of Design team and Product team whose default is Product team,
        // when they sign in, then the session names Product team and their own row on it.
        var design = await TestTeam.CreateAsync(_factory, "Maya Chen");
        var product = await design.AddTeamAsync("Product team");
        await design.SetDefaultTeamAsync(product.Team.Id);
        await design.SetPasswordAsync("Maya Chen", Password);

        var session = await SignInAsync(design.EmailOf("Maya Chen"));

        session.GetProperty("teamId").GetGuid().Should().Be(product.Team.Id);
        var token = new JwtSecurityTokenHandler().ReadJwtToken(session.GetProperty("accessToken").GetString());
        token.Claims.Should().Contain(c => c.Type == "team_id" && c.Value == product.Team.Id.ToString());
        token.Claims.Should().Contain(c => c.Type == "team_member_id" && c.Value == product.ManagerRow.Id.ToString());
    }

    [Fact]
    public async Task Without_a_stored_default_sign_in_opens_the_earliest_created_team()
    {
        // L2-054 AC1, AC12. Given a manager of two teams and no stored default (data from before ADR-014),
        // when they sign in, then the session names the team created first.
        var design = await TestTeam.CreateAsync(_factory, "Maya Chen");
        await design.AddTeamAsync("Product team");
        await design.SetPasswordAsync("Maya Chen", Password);

        var session = await SignInAsync(design.EmailOf("Maya Chen"));

        session.GetProperty("teamId").GetGuid().Should().Be(design.Team.Id);
    }

    [Fact]
    public async Task A_default_the_manager_no_longer_manages_falls_back_to_their_earliest_team()
    {
        // L2-054 AC12. Given a stored default that is another manager's team, when the manager signs in,
        // then the session names the earliest created team they still manage, and nothing of the other team.
        var other = await TestTeam.CreateAsync(_factory, "Omar Diaz", teamName: "Other team");
        var design = await TestTeam.CreateAsync(_factory, "Maya Chen");
        await design.AddTeamAsync("Product team");
        await design.SetDefaultTeamAsync(other.Team.Id);
        await design.SetPasswordAsync("Maya Chen", Password);

        var session = await SignInAsync(design.EmailOf("Maya Chen"));

        session.GetProperty("teamId").GetGuid().Should().Be(design.Team.Id);
    }

    [Fact]
    public async Task A_member_still_signs_in_to_the_one_team_they_are_on()
    {
        // L2-054 AC12: a person who manages no team opens the team they are a member of, as before.
        var design = await TestTeam.CreateAsync(_factory, "Maya Chen");
        await design.AddTeamAsync("Product team");
        await design.AddMemberAsync("Ana Ruiz");
        await design.SetPasswordAsync("Ana Ruiz", Password);

        var session = await SignInAsync(design.EmailOf("Ana Ruiz"));

        session.GetProperty("teamId").GetGuid().Should().Be(design.Team.Id);
    }

    [Fact]
    public async Task A_member_of_two_teams_signs_in_to_the_team_they_joined_first()
    {
        // L2-056 AC4 (ADR-015). Given Sam, a member of Product team and of Chen family who joined Chen family first
        // (his stored default), when he signs in, then Chen family opens, with his row on it.
        var product = await TestTeam.CreateAsync(_factory, "Omar Diaz", teamName: "Product team");
        await product.AddMemberAsync("Sam Chen");
        await product.SetPasswordAsync("Sam Chen", Password);
        var family = await TestTeam.CreateAsync(_factory, "Maya Chen", teamName: "Chen family");
        var row = await family.AddExistingMemberAsync(product, "Sam Chen");
        await _factory.WriteAsync(db => db.Users.Single(u => u.Id == row.UserId).DefaultTeamId = family.Team.Id);

        var session = await SignInAsync(product.EmailOf("Sam Chen"));

        session.GetProperty("teamId").GetGuid().Should().Be(family.Team.Id);
        session.GetProperty("role").GetString().Should().Be("Member");
    }

    [Fact]
    public async Task Without_a_stored_default_a_member_of_two_teams_opens_the_earliest_created()
    {
        // L2-056 AC4: the fallback for data with no stored default.
        var product = await TestTeam.CreateAsync(_factory, "Omar Diaz", teamName: "Product team");
        await product.AddMemberAsync("Sam Chen");
        await product.SetPasswordAsync("Sam Chen", Password);
        var family = await TestTeam.CreateAsync(_factory, "Maya Chen", teamName: "Chen family");
        await _factory.WriteAsync(db => db.Teams.Single(t => t.Id == family.Team.Id).CreatedUtc = product.Team.CreatedUtc.AddMinutes(5));
        await family.AddExistingMemberAsync(product, "Sam Chen");

        var session = await SignInAsync(product.EmailOf("Sam Chen"));

        session.GetProperty("teamId").GetGuid().Should().Be(product.Team.Id);
    }

    [Fact]
    public async Task A_person_removed_from_their_default_team_still_signs_in_to_the_other()
    {
        // L2-058 AC9, L2-011 AC2: the account and the other membership stay.
        var product = await TestTeam.CreateAsync(_factory, "Omar Diaz", teamName: "Product team");
        await product.AddMemberAsync("Sam Chen");
        await product.SetPasswordAsync("Sam Chen", Password);
        var family = await TestTeam.CreateAsync(_factory, "Maya Chen", teamName: "Chen family");
        var row = await family.AddExistingMemberAsync(product, "Sam Chen");
        await _factory.WriteAsync(db => db.Users.Single(u => u.Id == row.UserId).DefaultTeamId = family.Team.Id);
        var removal = await family.ClientFor("Maya Chen").DeleteAsync($"/api/team/members/{row.Id}");
        removal.IsSuccessStatusCode.Should().BeTrue(await removal.Content.ReadAsStringAsync());

        var session = await SignInAsync(product.EmailOf("Sam Chen"));

        session.GetProperty("teamId").GetGuid().Should().Be(product.Team.Id);
    }

    [Fact]
    public async Task A_manager_who_is_also_a_member_elsewhere_signs_in_to_the_team_they_manage_as_manager()
    {
        // L2-054 AC1, L2-055 AC4: a managed team wins over a member team, and the role is Manager there.
        var design = await TestTeam.CreateAsync(_factory, "Maya Chen");
        await design.SetPasswordAsync("Maya Chen", Password);
        var earlier = await TestTeam.CreateAsync(_factory, "Omar Diaz", teamName: "Old team");
        await _factory.WriteAsync(db => db.Teams.Single(t => t.Id == earlier.Team.Id).CreatedUtc = design.Team.CreatedUtc.AddMinutes(-5));
        await earlier.AddExistingMemberAsync(design, "Maya Chen");

        var session = await SignInAsync(design.EmailOf("Maya Chen"));

        session.GetProperty("teamId").GetGuid().Should().Be(design.Team.Id);
        session.GetProperty("role").GetString().Should().Be("Manager");
    }

    private async Task<JsonElement> SignInAsync(string email)
    {
        var response = await _factory.CreateClient().PostAsJsonAsync("/api/auth/sign-in", new { email, password = Password });
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    private async Task<Guid?> DefaultTeamOfAsync(Guid userId)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Users.AsNoTracking().Where(u => u.Id == userId).Select(u => u.DefaultTeamId).SingleAsync();
    }
}
