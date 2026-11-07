using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Domain.Enums;
using Greenlit.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Greenlit.Api.Tests.Auth;

/// <summary>
/// POST /api/invitations/{token}/accept-google (L2-052). Design: docs/detailed-designs/identity-and-access/sign-in-with-google.
/// Google is stood in for by the fake accounts reader (ADR-012). The clock reads Friday 6 November 2026.
/// </summary>
public class JoinWithGoogleTests : IClassFixture<FrozenClockApiFactory>
{
    private readonly FrozenClockApiFactory _factory;

    public JoinWithGoogleTests(FrozenClockApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Joining_with_the_invited_google_account_creates_the_account_links_the_row_and_signs_the_person_in()
    {
        // L2-052 AC3: Google's name, no password, the manager's role, the row's days kept.
        var email = Email("join");
        var invite = await InviteAsync("Finn M", email);
        await _factory.WriteAsync(db => db.TimeOffDays.Add(new Greenlit.Domain.Entities.TimeOffDay
        {
            Id = Guid.NewGuid(), TeamMemberId = invite.MemberId, Date = new DateOnly(2026, 11, 16),
            Status = DayStatus.Tentative, UpdatedUtc = FrozenClockApiFactory.Now,
        }));
        var subject = NewSubject();

        var response = await JoinAsync(invite.Token, FakeGoogle.Token(subject, email, "Finn Murphy"));

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        var session = await response.Content.ReadFromJsonAsync<JsonElement>();
        session.GetProperty("displayName").GetString().Should().Be("Finn Murphy");
        session.GetProperty("role").GetString().Should().Be("Member");
        session.GetProperty("teamId").GetGuid().Should().Be(invite.Team.Team.Id);

        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", session.GetProperty("accessToken").GetString());
        var month = await client.GetFromJsonAsync<JsonElement>("/api/sheet?month=2026-11");
        var me = month.GetProperty("members").EnumerateArray().Single(r => r.GetProperty("isYou").GetBoolean());
        me.GetProperty("name").GetString().Should().Be("Finn Murphy");
        me.GetProperty("cells").EnumerateArray()
            .Should().Contain(c => c.GetProperty("date").GetString() == "2026-11-16" && c.GetProperty("kind").GetString() == "Tentative");

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = await db.Users.SingleAsync(u => u.Email == email);
        user.PasswordHash.Should().BeEmpty();
        user.GoogleSubject.Should().Be(subject);
        (await db.TeamMembers.SingleAsync(m => m.Id == invite.MemberId)).UserId.Should().Be(user.Id);
        (await db.Invitations.SingleAsync(i => i.Email == email)).AcceptedUtc.Should().NotBeNull();
    }

    [Fact]
    public async Task The_same_google_account_then_signs_in_from_the_sign_in_page()
    {
        var email = Email("again");
        var invite = await InviteAsync("Finn Murphy", email);
        var subject = NewSubject();
        (await JoinAsync(invite.Token, FakeGoogle.Token(subject, email, "Finn Murphy"))).StatusCode.Should().Be(HttpStatusCode.OK);

        var response = await _factory.CreateClient().PostAsJsonAsync("/api/auth/google",
            new { accessToken = FakeGoogle.Token(subject, email, "Finn Murphy") });

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        var session = await response.Content.ReadFromJsonAsync<JsonElement>();
        session.GetProperty("teamId").GetGuid().Should().Be(invite.Team.Team.Id);
        session.GetProperty("newAccount").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task The_google_email_matches_the_invitation_whatever_its_case()
    {
        var email = Email("case");
        var invite = await InviteAsync("Finn Murphy", email);

        var response = await JoinAsync(invite.Token, FakeGoogle.Token(NewSubject(), $" {email.ToUpperInvariant()} ", "Finn Murphy"));

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task A_google_account_with_another_email_is_refused_and_the_invitation_stays_open()
    {
        // L2-052 AC4.
        var email = Email("mismatch");
        var invite = await InviteAsync("Finn Murphy", email);

        var response = await JoinAsync(invite.Token, FakeGoogle.Token(NewSubject(), Email("someone-else"), "Someone Else"));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        response.Content.Headers.ContentType!.MediaType.Should().Be("application/problem+json");
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString().Should().Be("google_email_mismatch");
        await ExpectOpenAndUnjoinedAsync(invite.Token, email);
    }

    [Fact]
    public async Task A_google_account_whose_email_is_not_verified_is_refused()
    {
        // L2-052 AC5.
        var email = Email("unverified");
        var invite = await InviteAsync("Finn Murphy", email);

        var response = await JoinAsync(invite.Token, FakeGoogle.Token(NewSubject(), email, "Finn Murphy", emailVerified: false));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString().Should().Be("google_email_unverified");
        await ExpectOpenAndUnjoinedAsync(invite.Token, email);
    }

    [Fact]
    public async Task A_token_google_does_not_vouch_for_is_refused()
    {
        var email = Email("foreign");
        var invite = await InviteAsync("Finn Murphy", email);

        var response = await JoinAsync(invite.Token, "not-a-token-google-issued");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString().Should().Be("google_token_invalid");
        await ExpectOpenAndUnjoinedAsync(invite.Token, email);
    }

    [Fact]
    public async Task An_address_that_already_has_an_account_is_refused_with_a_code()
    {
        // L2-052 AC6.
        var email = Email("exists");
        var invite = await InviteAsync("Finn Murphy", email);
        await _factory.WriteAsync(db => db.Users.Add(new Greenlit.Domain.Entities.User
        {
            Id = Guid.NewGuid(), Email = email, DisplayName = "Finn Murphy", PasswordHash = "x", Role = UserRole.Member, CreatedUtc = FrozenClockApiFactory.Now,
        }));

        var response = await JoinAsync(invite.Token, FakeGoogle.Token(NewSubject(), email, "Finn Murphy"));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString().Should().Be("account_exists");
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.Users.CountAsync(u => u.Email == email)).Should().Be(1);
        (await db.Invitations.SingleAsync(i => i.Email == email)).AcceptedUtc.Should().BeNull();
    }

    [Fact]
    public async Task A_used_or_expired_or_unknown_link_cannot_be_joined()
    {
        // L2-052 AC7.
        var used = await InviteAsync("Finn Murphy", Email("used"));
        (await JoinAsync(used.Token, FakeGoogle.Token(NewSubject(), Email("used"), "Finn Murphy"))).StatusCode.Should().Be(HttpStatusCode.OK);
        var late = await InviteAsync("Finn Murphy", Email("late"));
        await _factory.WriteAsync(db => db.Invitations.Single(i => i.Email == Email("late")).ExpiresUtc = FrozenClockApiFactory.Now.AddMinutes(-1));

        var second = await JoinAsync(used.Token, FakeGoogle.Token(NewSubject(), Email("used"), "Finn Murphy"));
        var expired = await JoinAsync(late.Token, FakeGoogle.Token(NewSubject(), Email("late"), "Finn Murphy"));
        var unknown = await JoinAsync("not-a-real-token", FakeGoogle.Token(NewSubject(), Email("unknown"), "Finn Murphy"));

        foreach (var response in new[] { second, expired })
        {
            response.StatusCode.Should().Be(HttpStatusCode.Gone);
            var body = await response.Content.ReadFromJsonAsync<JsonElement>();
            body.GetProperty("code").GetString().Should().Be("invitation_expired");
            body.GetProperty("managerName").GetString().Should().Be("Maya Chen");
        }
        unknown.StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await unknown.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString().Should().Be("invitation_not_found");
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.Users.CountAsync(u => u.Email == Email("used"))).Should().Be(1);
        (await db.Users.AnyAsync(u => u.Email == Email("late"))).Should().BeFalse();
    }

    [Fact]
    public async Task An_empty_token_is_a_validation_error()
    {
        var invite = await InviteAsync("Finn Murphy", Email("empty"));

        var response = await JoinAsync(invite.Token, "");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("errors").GetProperty("AccessToken")[0].GetString().Should().Be("Enter a Google access token.");
    }

    private async Task ExpectOpenAndUnjoinedAsync(string token, string email)
    {
        (await _factory.CreateClient().GetAsync($"/api/invitations/{token}")).StatusCode.Should().Be(HttpStatusCode.OK);
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.Users.AnyAsync(u => u.Email == email)).Should().BeFalse();
        (await db.Invitations.SingleAsync(i => i.Email == email)).AcceptedUtc.Should().BeNull();
    }

    private sealed record Invited(TestTeam Team, string Token, Guid MemberId);

    /// <summary>A manager invites a person through the real endpoint; the token is read from the recorded email.</summary>
    private async Task<Invited> InviteAsync(string name, string email)
    {
        var team = await TestTeam.CreateAsync(_factory);
        var response = await team.ClientFor("Maya Chen").PostAsJsonAsync("/api/team/members", new { name, email, role = "Member" });
        response.EnsureSuccessStatusCode();
        var member = await response.Content.ReadFromJsonAsync<JsonElement>();
        return new Invited(team, RecordingEmailSender.TokenIn(_factory.Emails.To(email).Single()), member.GetProperty("id").GetGuid());
    }

    private Task<HttpResponseMessage> JoinAsync(string token, string accessToken) =>
        _factory.CreateClient().PostAsJsonAsync($"/api/invitations/{token}/accept-google", new { accessToken });

    /// <summary>Addresses of their own, so this class never meets the password tests' invitations in the shared fixture.</summary>
    private static string Email(string tag) => $"google.{tag}.finn@northwind.studio";

    private static string NewSubject() => $"g-{Guid.NewGuid():N}";
}
