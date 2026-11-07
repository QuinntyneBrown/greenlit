using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.Teams;

/// <summary>
/// A removed member can no longer sign in, and a session they already hold stops working (L2-011 AC2).
/// Design: docs/detailed-designs/teams/remove-member.
/// </summary>
public class RemovedMemberAccessTests : IClassFixture<GreenlitApiFactory>
{
    private const string Password = "correct-horse-battery";
    private readonly GreenlitApiFactory _factory;

    public RemovedMemberAccessTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task A_removed_member_with_the_right_password_cannot_sign_in()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Finn Murphy");
        await team.SetPasswordAsync("Finn Murphy", Password);
        (await SignInAsync(team.EmailOf("Finn Murphy"))).StatusCode.Should().Be(HttpStatusCode.OK);
        await team.ClientFor("Maya Chen").DeleteAsync($"/api/team/members/{team.MemberIdOf("Finn Murphy")}");

        var response = await SignInAsync(team.EmailOf("Finn Murphy"));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        response.Content.Headers.ContentType!.MediaType.Should().Be("application/problem+json");
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString().Should().Be("member_removed");
    }

    [Fact]
    public async Task A_removed_member_with_the_wrong_password_learns_nothing_about_the_removal()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Finn Murphy");
        await team.SetPasswordAsync("Finn Murphy", Password);
        await team.ClientFor("Maya Chen").DeleteAsync($"/api/team/members/{team.MemberIdOf("Finn Murphy")}");

        var response = await _factory.CreateClient().PostAsJsonAsync("/api/auth/sign-in",
            new { email = team.EmailOf("Finn Murphy"), password = "not-the-password" });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString().Should().Be("invalid_credentials");
    }

    [Fact]
    public async Task A_session_held_before_the_removal_is_refused_afterwards()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Finn Murphy");
        var finn = team.ClientFor("Finn Murphy");
        (await finn.GetAsync("/api/sheet?month=2026-11")).StatusCode.Should().Be(HttpStatusCode.OK);
        await team.ClientFor("Maya Chen").DeleteAsync($"/api/team/members/{team.MemberIdOf("Finn Murphy")}");

        var response = await finn.GetAsync("/api/sheet?month=2026-11");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString().Should().Be("member_removed");
    }

    [Fact]
    public async Task Everyone_else_on_the_team_keeps_working()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Finn Murphy");
        await team.ClientFor("Maya Chen").DeleteAsync($"/api/team/members/{team.MemberIdOf("Finn Murphy")}");

        (await team.ClientFor("Ana Ruiz").GetAsync("/api/sheet?month=2026-11")).StatusCode.Should().Be(HttpStatusCode.OK);
        (await team.ClientFor("Maya Chen").GetAsync("/api/sheet?month=2026-11")).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    private Task<HttpResponseMessage> SignInAsync(string email) =>
        _factory.CreateClient().PostAsJsonAsync("/api/auth/sign-in", new { email, password = Password });
}
