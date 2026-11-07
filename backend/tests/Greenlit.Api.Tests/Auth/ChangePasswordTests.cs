using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.Auth;

/// <summary>
/// PUT /api/account/password (L2-005 AC2, AC3, AC7).
/// Design: docs/detailed-designs/identity-and-access/manage-account.
/// </summary>
public class ChangePasswordTests : IClassFixture<GreenlitApiFactory>
{
    private const string OldPassword = "correct-horse-battery";
    private const string NewPassword = "brand-new-secret-1";
    private readonly GreenlitApiFactory _factory;

    public ChangePasswordTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task The_right_current_password_sets_the_new_one()
    {
        var (team, client) = await SignedInAsync();

        var response = await ChangeAsync(client, OldPassword, NewPassword, NewPassword);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent, await response.Content.ReadAsStringAsync());
        (await SignInAsync(team.EmailOf("Ana Ruiz"), NewPassword)).StatusCode.Should().Be(HttpStatusCode.OK);
        (await SignInAsync(team.EmailOf("Ana Ruiz"), OldPassword)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task A_wrong_current_password_is_refused_and_nothing_changes()
    {
        var (team, client) = await SignedInAsync();

        var response = await ChangeAsync(client, "not-my-password", NewPassword, NewPassword);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("code").GetString().Should().Be("current_password_wrong");
        (await SignInAsync(team.EmailOf("Ana Ruiz"), OldPassword)).StatusCode.Should().Be(HttpStatusCode.OK);
        (await SignInAsync(team.EmailOf("Ana Ruiz"), NewPassword)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task A_short_password_and_a_different_confirmation_are_both_refused()
    {
        var (team, client) = await SignedInAsync();

        var response = await ChangeAsync(client, OldPassword, "short", "different");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var errors = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors");
        errors.GetProperty("NewPassword")[0].GetString().Should().Be("New password must be at least 10 characters");
        errors.GetProperty("ConfirmPassword")[0].GetString().Should().Be("Passwords don't match");
        (await SignInAsync(team.EmailOf("Ana Ruiz"), OldPassword)).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Without_a_session_it_is_unauthorized()
    {
        var response = await ChangeAsync(_factory.CreateClient(), OldPassword, NewPassword, NewPassword);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private async Task<(TestTeam Team, HttpClient Client)> SignedInAsync()
    {
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");
        await team.AddMemberAsync("Ana Ruiz");
        await team.SetPasswordAsync("Ana Ruiz", OldPassword);
        return (team, team.ClientFor("Ana Ruiz"));
    }

    private static Task<HttpResponseMessage> ChangeAsync(HttpClient client, string current, string next, string confirm) =>
        client.PutAsJsonAsync("/api/account/password", new { currentPassword = current, newPassword = next, confirmPassword = confirm });

    private Task<HttpResponseMessage> SignInAsync(string email, string password) =>
        _factory.CreateClient().PostAsJsonAsync("/api/auth/sign-in", new { email, password });
}
