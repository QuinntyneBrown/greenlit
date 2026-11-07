using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Greenlit.Api.Tests.Auth;

/// <summary>
/// POST /api/auth/google (L2-051). Design: docs/detailed-designs/identity-and-access/sign-in-with-google.
/// Google is stood in for by the fake accounts reader (ADR-012); every test makes up its own Google account.
/// </summary>
public class GoogleSignInTests : IClassFixture<GreenlitApiFactory>
{
    private const string Password = "correct-horse-battery";
    private readonly GreenlitApiFactory _factory;

    public GoogleSignInTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task A_google_account_with_the_email_of_an_existing_account_signs_that_person_in()
    {
        // L2-051 AC3: the Google email belongs to a Greenlit account.
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");
        var subject = NewSubject();

        var response = await SignInAsync(FakeGoogle.Token(subject, team.EmailOf("Maya Chen"), "Maya Chen"));

        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.Should().Be(HttpStatusCode.OK, $"body: {body}");
        var session = JsonDocument.Parse(body).RootElement;
        session.GetProperty("displayName").GetString().Should().Be("Maya Chen");
        session.GetProperty("role").GetString().Should().Be("Manager");
        session.GetProperty("userId").GetGuid().Should().Be(team.Manager.Id);
        session.GetProperty("teamId").GetGuid().Should().Be(team.Team.Id);
        session.GetProperty("newAccount").GetBoolean().Should().BeFalse();
        var token = new JwtSecurityTokenHandler().ReadJwtToken(session.GetProperty("accessToken").GetString());
        token.Subject.Should().Be(team.Manager.Id.ToString());
        token.Claims.Should().Contain(c => c.Type == "team_id" && c.Value == team.Team.Id.ToString());
        token.Claims.Should().Contain(c => c.Type == "team_member_id" && c.Value == team.ManagerRow.Id.ToString());
    }

    [Fact]
    public async Task The_first_google_sign_in_links_the_account_so_a_changed_email_still_finds_it()
    {
        // L2-051 AC3: the next time that Google account is used it signs the same person in, whatever their email now is.
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");
        var subject = NewSubject();
        (await SignInAsync(FakeGoogle.Token(subject, team.EmailOf("Maya Chen"), "Maya Chen"))).StatusCode.Should().Be(HttpStatusCode.OK);
        await _factory.WriteAsync(db => db.Users.Single(u => u.Id == team.Manager.Id).Email = $"{Guid.NewGuid():N}@renamed.example.com");

        var response = await SignInAsync(FakeGoogle.Token(subject, team.EmailOf("Maya Chen"), "Maya Chen"));

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        var session = await response.Content.ReadFromJsonAsync<JsonElement>();
        session.GetProperty("userId").GetGuid().Should().Be(team.Manager.Id);
        (await UsersWithEmailAsync(team.EmailOf("Maya Chen"))).Should().Be(0, "linking by subject must not create a second account for the old email");
    }

    [Fact]
    public async Task The_email_matches_whatever_its_case_and_surrounding_spaces()
    {
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");

        var response = await SignInAsync(FakeGoogle.Token(NewSubject(), $"  {team.EmailOf("Maya Chen").ToUpperInvariant()} ", "Maya Chen"));

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("userId").GetGuid().Should().Be(team.Manager.Id);
    }

    [Fact]
    public async Task A_google_account_nobody_has_becomes_a_manager_account_without_a_team()
    {
        // L2-051 AC4: a new manager account with Google's name and email and no password, on no team yet.
        var email = $"{Guid.NewGuid():N}@northwind.studio";

        var response = await SignInAsync(FakeGoogle.Token(NewSubject(), email, "Rosa Marín"));

        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.Should().Be(HttpStatusCode.OK, $"body: {body}");
        var session = JsonDocument.Parse(body).RootElement;
        session.GetProperty("displayName").GetString().Should().Be("Rosa Marín");
        session.GetProperty("role").GetString().Should().Be("Manager");
        session.GetProperty("teamId").ValueKind.Should().Be(JsonValueKind.Null);
        session.GetProperty("newAccount").GetBoolean().Should().BeTrue();
        var token = new JwtSecurityTokenHandler().ReadJwtToken(session.GetProperty("accessToken").GetString());
        token.Claims.Should().NotContain(c => c.Type == "team_id");

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await db.Users.SingleAsync(u => u.Email == email);
        user.Id.Should().Be(session.GetProperty("userId").GetGuid());
        user.PasswordHash.Should().BeEmpty("a Google-only account has no password");
        user.GoogleSubject.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task The_new_account_opens_create_team_like_any_account_without_a_team()
    {
        // L2-051 AC4 with L2-008 AC8: the session works, and the person is on no team.
        var response = await SignInAsync(FakeGoogle.Token(NewSubject(), $"{Guid.NewGuid():N}@northwind.studio", "Rosa Marín"));
        var session = await response.Content.ReadFromJsonAsync<JsonElement>();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", session.GetProperty("accessToken").GetString());

        var me = await client.GetAsync("/api/auth/me");

        me.StatusCode.Should().Be(HttpStatusCode.OK, await me.Content.ReadAsStringAsync());
        (await me.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("displayName").GetString().Should().Be("Rosa Marín");
    }

    [Fact]
    public async Task A_google_only_account_cannot_sign_in_with_a_password()
    {
        // ADR-012: an empty password hash is a mismatch, never a match.
        var email = $"{Guid.NewGuid():N}@northwind.studio";
        (await SignInAsync(FakeGoogle.Token(NewSubject(), email, "Rosa Marín"))).StatusCode.Should().Be(HttpStatusCode.OK);

        var response = await _factory.CreateClient().PostAsJsonAsync("/api/auth/sign-in", new { email, password = "" });
        var attempt = await _factory.CreateClient().PostAsJsonAsync("/api/auth/sign-in", new { email, password = "anything-at-all" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        attempt.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await attempt.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString().Should().Be("invalid_credentials");
    }

    [Fact]
    public async Task A_google_account_whose_email_is_not_verified_matches_and_creates_nothing()
    {
        // L2-051 AC5.
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");
        var newcomer = $"{Guid.NewGuid():N}@northwind.studio";

        var existing = await SignInAsync(FakeGoogle.Token(NewSubject(), team.EmailOf("Maya Chen"), "Maya Chen", emailVerified: false));
        var unknown = await SignInAsync(FakeGoogle.Token(NewSubject(), newcomer, "Rosa Marín", emailVerified: false));

        foreach (var response in new[] { existing, unknown })
        {
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
            response.Content.Headers.ContentType!.MediaType.Should().Be("application/problem+json");
            (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString().Should().Be("google_email_unverified");
        }
        (await UsersWithEmailAsync(newcomer)).Should().Be(0);
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.Users.SingleAsync(u => u.Id == team.Manager.Id)).GoogleSubject.Should().BeNull("an unverified email never links");
    }

    [Fact]
    public async Task A_token_google_does_not_vouch_for_is_refused_and_creates_nothing()
    {
        // L2-051 AC6 on the API's side: a token that is not ours, or that Google rejects.
        var response = await SignInAsync("not-a-token-google-issued");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString().Should().Be("google_token_invalid");
    }

    [Fact]
    public async Task An_empty_token_is_a_validation_error()
    {
        var response = await _factory.CreateClient().PostAsJsonAsync("/api/auth/google", new { accessToken = "" });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("errors").GetProperty("AccessToken")[0].GetString().Should().Be("Enter a Google access token.");
    }

    [Fact]
    public async Task A_removed_member_is_refused_with_google_as_with_a_password()
    {
        // L2-051 AC7.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Finn Murphy");
        await team.SetPasswordAsync("Finn Murphy", Password);
        var subject = NewSubject();
        (await SignInAsync(FakeGoogle.Token(subject, team.EmailOf("Finn Murphy"), "Finn Murphy"))).StatusCode.Should().Be(HttpStatusCode.OK);
        await team.ClientFor("Maya Chen").DeleteAsync($"/api/team/members/{team.MemberIdOf("Finn Murphy")}");

        var response = await SignInAsync(FakeGoogle.Token(subject, team.EmailOf("Finn Murphy"), "Finn Murphy"));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString().Should().Be("member_removed");
    }

    private Task<HttpResponseMessage> SignInAsync(string accessToken) =>
        _factory.CreateClient().PostAsJsonAsync("/api/auth/google", new { accessToken });

    private async Task<int> UsersWithEmailAsync(string email)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await db.Users.CountAsync(u => u.Email == email);
    }

    private static string NewSubject() => $"g-{Guid.NewGuid():N}";
}
