using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.Auth;

/// <summary>
/// POST /api/auth/sign-in (L2-001). Design: docs/detailed-designs/identity-and-access/sign-in.
/// </summary>
public class SignInTests : IClassFixture<GreenlitApiFactory>
{
    private const string Password = "correct-horse-battery";
    private readonly GreenlitApiFactory _factory;

    public SignInTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Valid_credentials_return_a_session_for_the_person_and_their_team()
    {
        // L2-001 AC4: given valid credentials, the visitor is signed in.
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");
        await team.SetPasswordAsync("Maya Chen", Password);

        var response = await SignInAsync(team.EmailOf("Maya Chen"), Password);

        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.Should().Be(HttpStatusCode.OK, $"body: {body}");
        var session = JsonDocument.Parse(body).RootElement;
        session.GetProperty("displayName").GetString().Should().Be("Maya Chen");
        session.GetProperty("role").GetString().Should().Be("Manager");
        session.GetProperty("userId").GetGuid().Should().Be(team.Manager.Id);
        session.GetProperty("teamId").GetGuid().Should().Be(team.Team.Id);
        session.GetProperty("expiresUtc").GetDateTimeOffset().Should()
            .BeCloseTo(DateTimeOffset.UtcNow.AddMinutes(15), TimeSpan.FromMinutes(1));

        var token = new JwtSecurityTokenHandler().ReadJwtToken(session.GetProperty("accessToken").GetString());
        token.Subject.Should().Be(team.Manager.Id.ToString());
        token.Claims.Should().Contain(c => c.Type == "team_id" && c.Value == team.Team.Id.ToString());
        token.Claims.Should().Contain(c => c.Type == "team_member_id" && c.Value == team.ManagerRow.Id.ToString());
        token.Claims.Should().Contain(c => c.Type == "role" && c.Value == "Manager");
    }

    [Fact]
    public async Task The_issued_token_opens_the_teams_month()
    {
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");
        await team.AddMemberAsync("Ana Ruiz");
        await team.SetPasswordAsync("Ana Ruiz", Password);

        var session = await (await SignInAsync(team.EmailOf("Ana Ruiz"), Password)).Content.ReadFromJsonAsync<JsonElement>();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", session.GetProperty("accessToken").GetString());

        var response = await client.GetAsync("/api/sheet?month=2026-11");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task The_email_matches_whatever_its_case_and_surrounding_spaces()
    {
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");
        await team.SetPasswordAsync("Maya Chen", Password);

        var response = await SignInAsync($"  {team.EmailOf("Maya Chen").ToUpperInvariant()} ", Password);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task A_wrong_password_is_invalid_credentials_without_saying_which_field()
    {
        // L2-001 AC3: an email and password that do not match an account.
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");
        await team.SetPasswordAsync("Maya Chen", Password);

        var response = await SignInAsync(team.EmailOf("Maya Chen"), "not-the-password");

        await ShouldBeInvalidCredentialsAsync(response);
    }

    [Fact]
    public async Task An_unknown_email_gets_the_same_answer_as_a_wrong_password()
    {
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");
        await team.SetPasswordAsync("Maya Chen", Password);

        var wrongPassword = await SignInAsync(team.EmailOf("Maya Chen"), "not-the-password");
        var unknownEmail = await SignInAsync("nobody@example.com", Password);

        var a = await wrongPassword.Content.ReadFromJsonAsync<JsonElement>();
        var b = await unknownEmail.Content.ReadFromJsonAsync<JsonElement>();
        unknownEmail.StatusCode.Should().Be(wrongPassword.StatusCode);
        b.GetProperty("code").GetString().Should().Be("invalid_credentials");
        b.GetProperty("detail").GetString().Should().Be(a.GetProperty("detail").GetString());
        b.GetProperty("title").GetString().Should().Be(a.GetProperty("title").GetString());
    }

    [Fact]
    public async Task An_account_without_a_password_cannot_sign_in()
    {
        // TestTeam's accounts carry a placeholder, not a hash, as the old seed did.
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");

        var response = await SignInAsync(team.EmailOf("Maya Chen"), "not-used-by-these-tests");

        await ShouldBeInvalidCredentialsAsync(response);
    }

    [Fact]
    public async Task Empty_fields_are_a_validation_problem_naming_each_field()
    {
        // L2-001 AC2: both fields empty.
        var response = await SignInAsync("", "");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        var errors = problem.GetProperty("errors");
        errors.GetProperty("Email")[0].GetString().Should().Be("Enter your email address.");
        errors.GetProperty("Password")[0].GetString().Should().Be("Enter your password.");
    }

    private Task<HttpResponseMessage> SignInAsync(string email, string password) =>
        _factory.CreateClient().PostAsJsonAsync("/api/auth/sign-in", new { email, password });

    private static async Task ShouldBeInvalidCredentialsAsync(HttpResponseMessage response)
    {
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        response.Content.Headers.ContentType!.MediaType.Should().Be("application/problem+json");
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("code").GetString().Should().Be("invalid_credentials");
        problem.GetProperty("detail").GetString().Should().Be("Email or password doesn't match.");
    }
}
