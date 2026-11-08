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
/// PUT /api/teams/default: the team sign-in opens (L2-054 AC4, AC8; ADR-014). Design: docs/detailed-designs/teams/switch-team.
/// </summary>
public class SetDefaultTeamTests : IClassFixture<GreenlitApiFactory>
{
    private const string Password = "correct-horse-battery";
    private readonly GreenlitApiFactory _factory;

    public SetDefaultTeamTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Making_a_team_the_default_moves_the_mark_and_sign_in_opens_it_next_time()
    {
        // L2-054 AC4. Given a manager whose default is Design team, when they make Product team the default,
        // then it is the only default, the active team does not change, and the next sign-in opens Product team.
        var design = await TestTeam.CreateAsync(_factory, "Maya Chen");
        var product = await design.AddTeamAsync("Product team");
        await design.SetDefaultTeamAsync(design.Team.Id);
        await design.SetPasswordAsync("Maya Chen", Password);
        var client = design.SessionFor("Maya Chen");

        var response = await client.PutAsJsonAsync("/api/teams/default", new { teamId = product.Team.Id });

        response.StatusCode.Should().Be(HttpStatusCode.NoContent, await response.Content.ReadAsStringAsync());
        var mine = await client.GetFromJsonAsync<JsonElement>("/api/teams/mine");
        mine.EnumerateArray().Select(t => (t.GetProperty("name").GetString(), t.GetProperty("active").GetBoolean(), t.GetProperty("isDefault").GetBoolean()))
            .Should().Equal(("Design team", true, false), ("Product team", false, true));
        var signIn = await _factory.CreateClient().PostAsJsonAsync("/api/auth/sign-in", new { email = design.EmailOf("Maya Chen"), password = Password });
        (await signIn.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("teamId").GetGuid().Should().Be(product.Team.Id);
    }

    [Fact]
    public async Task Another_managers_team_cannot_become_the_default()
    {
        // L2-054 AC8: 404 team_not_found and the default stays.
        var design = await TestTeam.CreateAsync(_factory, "Maya Chen");
        await design.SetDefaultTeamAsync(design.Team.Id);
        var other = await TestTeam.CreateAsync(_factory, "Omar Diaz", teamName: "Secret team");

        var response = await design.SessionFor("Maya Chen").PutAsJsonAsync("/api/teams/default", new { teamId = other.Team.Id });

        await ShouldBeTeamNotFoundAsync(response);
        (await DefaultTeamOfAsync(design.Manager.Id)).Should().Be(design.Team.Id);
    }

    [Fact]
    public async Task A_member_cannot_make_their_team_a_default()
    {
        // L2-054 AC8: a member manages no team.
        var design = await TestTeam.CreateAsync(_factory, "Maya Chen");
        var ana = await design.AddMemberAsync("Ana Ruiz");

        var response = await design.SessionFor("Ana Ruiz").PutAsJsonAsync("/api/teams/default", new { teamId = design.Team.Id });

        await ShouldBeTeamNotFoundAsync(response);
        (await DefaultTeamOfAsync(ana.UserId!.Value)).Should().BeNull();
    }

    [Fact]
    public async Task A_request_without_a_team_is_invalid()
    {
        var design = await TestTeam.CreateAsync(_factory, "Maya Chen");

        var response = await design.SessionFor("Maya Chen").PutAsJsonAsync("/api/teams/default", new { });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors").TryGetProperty("TeamId", out _).Should().BeTrue();
    }

    private static async Task ShouldBeTeamNotFoundAsync(HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.Should().Be(HttpStatusCode.NotFound, body);
        JsonDocument.Parse(body).RootElement.GetProperty("code").GetString().Should().Be("team_not_found");
        body.Should().NotContain("Secret team");
    }

    private async Task<Guid?> DefaultTeamOfAsync(Guid userId)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Users.AsNoTracking().Where(u => u.Id == userId).Select(u => u.DefaultTeamId).SingleAsync();
    }
}
