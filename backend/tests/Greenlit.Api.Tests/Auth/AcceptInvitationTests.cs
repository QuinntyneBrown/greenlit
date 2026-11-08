using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Domain.Enums;
using Greenlit.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace Greenlit.Api.Tests.Auth;

/// <summary>
/// GET /api/invitations/{token} and POST /api/invitations/{token}/accept (L2-004).
/// Design: docs/detailed-designs/identity-and-access/accept-invitation.
/// The clock reads Friday 6 November 2026; an invitation sent in these tests expires on 13 November 2026.
/// </summary>
public class AcceptInvitationTests : IClassFixture<FrozenClockApiFactory>
{
    private const string Password = "new-secret-1234";
    private readonly FrozenClockApiFactory _factory;

    public AcceptInvitationTests(FrozenClockApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Opening_a_valid_link_names_the_team_the_manager_and_the_address_it_was_sent_to()
    {
        // L2-004 AC1, AC2.
        var invite = await InviteAsync("Finn Murphy", "finn@northwind.studio");

        var response = await _factory.CreateClient().GetAsync($"/api/invitations/{invite.Token}");

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("teamName").GetString().Should().Be("Design team");
        body.GetProperty("managerName").GetString().Should().Be("Maya Chen");
        body.GetProperty("memberName").GetString().Should().Be("Finn Murphy");
        body.GetProperty("email").GetString().Should().Be("finn@northwind.studio");
    }

    [Fact]
    public async Task Opening_a_link_changes_nothing()
    {
        var invite = await InviteAsync("Finn Murphy", "open.finn@northwind.studio");

        await _factory.CreateClient().GetAsync($"/api/invitations/{invite.Token}");
        await _factory.CreateClient().GetAsync($"/api/invitations/{invite.Token}");

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Invitations.Single(i => i.Email == "open.finn@northwind.studio").AcceptedUtc.Should().BeNull();
        db.Users.Any(u => u.Email == "open.finn@northwind.studio").Should().BeFalse();
    }

    [Fact]
    public async Task An_unknown_link_is_404_and_names_no_one()
    {
        // L2-004 AC6: nothing about teams or people leaks for a token that matches nothing.
        var response = await _factory.CreateClient().GetAsync("/api/invitations/not-a-real-token");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("code").GetString().Should().Be("invitation_not_found");
        body.TryGetProperty("managerName", out _).Should().BeFalse();
    }

    [Fact]
    public async Task A_link_older_than_seven_days_is_410_and_names_the_manager()
    {
        // L2-004 AC4.
        var invite = await InviteAsync("Finn Murphy", "old.finn@northwind.studio");
        await _factory.WriteAsync(db =>
            db.Invitations.Single(i => i.Email == "old.finn@northwind.studio").ExpiresUtc = FrozenClockApiFactory.Now.AddMinutes(-1));

        var response = await _factory.CreateClient().GetAsync($"/api/invitations/{invite.Token}");

        await ExpectExpiredAsync(response);
    }

    [Fact]
    public async Task A_link_sent_exactly_seven_days_ago_has_just_expired_and_one_a_second_younger_works()
    {
        var invite = await InviteAsync("Finn Murphy", "edge.finn@northwind.studio");
        await _factory.WriteAsync(db =>
            db.Invitations.Single(i => i.Email == "edge.finn@northwind.studio").ExpiresUtc = FrozenClockApiFactory.Now.AddSeconds(1));
        (await _factory.CreateClient().GetAsync($"/api/invitations/{invite.Token}")).StatusCode.Should().Be(HttpStatusCode.OK);

        await _factory.WriteAsync(db =>
            db.Invitations.Single(i => i.Email == "edge.finn@northwind.studio").ExpiresUtc = FrozenClockApiFactory.Now);

        await ExpectExpiredAsync(await _factory.CreateClient().GetAsync($"/api/invitations/{invite.Token}"));
    }

    [Fact]
    public async Task A_link_that_was_replaced_by_a_newer_invitation_is_410()
    {
        // L2-004 AC6; re-inviting retires the earlier links (ADR-006).
        var first = await InviteAsync("Finn Murphy", "replaced.finn@northwind.studio");
        var again = await first.Team.ClientFor("Maya Chen")
            .PostAsJsonAsync("/api/team/members", new { name = "Finn Murphy", email = "replaced.finn@northwind.studio", role = "Member" });
        again.EnsureSuccessStatusCode();
        var second = RecordingEmailSender.TokenIn(_factory.Emails.To("replaced.finn@northwind.studio").Last());

        await ExpectExpiredAsync(await _factory.CreateClient().GetAsync($"/api/invitations/{first.Token}"));
        (await _factory.CreateClient().GetAsync($"/api/invitations/{second}")).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Joining_creates_the_account_signs_the_person_in_and_keeps_the_days_on_their_row()
    {
        // L2-004 AC5, AC9.
        var invite = await InviteAsync("Finn Murphy", "join.finn@northwind.studio");
        var finnRow = invite.MemberId;
        await _factory.WriteAsync(db =>
        {
            db.TimeOffDays.Add(new Greenlit.Domain.Entities.TimeOffDay
            {
                Id = Guid.NewGuid(), TeamMemberId = finnRow, Date = new DateOnly(2026, 11, 16),
                Status = DayStatus.Tentative, UpdatedUtc = FrozenClockApiFactory.Now,
            });
        });

        var response = await AcceptAsync(invite.Token, "Finn Murphy", Password);

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        var session = await response.Content.ReadFromJsonAsync<JsonElement>();
        session.GetProperty("displayName").GetString().Should().Be("Finn Murphy");
        session.GetProperty("role").GetString().Should().Be("Member");
        session.GetProperty("teamId").GetGuid().Should().Be(invite.Team.Team.Id);

        // The returned token works: the person sees the team's month, their own row marked, the day kept.
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", session.GetProperty("accessToken").GetString());
        var month = await client.GetFromJsonAsync<JsonElement>("/api/sheet?month=2026-11");
        var rows = month.GetProperty("members").EnumerateArray().ToList();
        rows.Select(r => r.GetProperty("name").GetString()).Should().BeEquivalentTo(["Maya Chen", "Finn Murphy"]);
        var me = rows.Single(r => r.GetProperty("isYou").GetBoolean());
        me.GetProperty("name").GetString().Should().Be("Finn Murphy");
        me.GetProperty("cells").EnumerateArray()
            .Should().Contain(c => c.GetProperty("date").GetString() == "2026-11-16" && c.GetProperty("kind").GetString() == "Tentative");

        // The password works for a later sign-in.
        var signIn = await _factory.CreateClient().PostAsJsonAsync("/api/auth/sign-in", new { email = "join.finn@northwind.studio", password = Password });
        signIn.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task The_team_a_person_joins_first_is_their_default()
    {
        // L2-056 AC4 (ADR-015): a person who manages nothing opens the team they joined first.
        var invite = await InviteAsync("Gus Lee", "first.gus@northwind.studio");

        var response = await AcceptAsync(invite.Token, "Gus Lee", Password);

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var teamId = db.TeamMembers.Single(m => m.Id == invite.MemberId).TeamId;
        db.Users.Single(u => u.Email == "first.gus@northwind.studio").DefaultTeamId.Should().Be(teamId);
    }

    [Fact]
    public async Task The_account_takes_the_role_the_manager_chose_and_the_name_the_person_gave()
    {
        var invite = await InviteAsync("Finn M", "role.finn@northwind.studio", role: "Manager");

        var response = await AcceptAsync(invite.Token, "  Finn Murphy ", Password);

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        // The row and the account keep the role chosen (L2-004 AC9); the session carries the role on the team, and the
        // team's manager is still Maya, so Finn's session is a member's (L2-054 AC7, ADR-015).
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("role").GetString().Should().Be("Member");
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var user = db.Users.Single(u => u.Email == "role.finn@northwind.studio");
        user.DisplayName.Should().Be("Finn Murphy");
        user.Role.Should().Be(UserRole.Manager);
        user.PasswordHash.Should().NotBe(Password).And.NotBeEmpty();
        var row = db.TeamMembers.Single(m => m.Id == invite.MemberId);
        row.UserId.Should().Be(user.Id);
        row.Name.Should().Be("Finn Murphy");
        db.Invitations.Single(i => i.Email == "role.finn@northwind.studio").AcceptedUtc.Should().Be(FrozenClockApiFactory.Now);
    }

    [Fact]
    public async Task A_password_shorter_than_ten_characters_is_refused_and_nothing_is_created()
    {
        // L2-004 AC3.
        var invite = await InviteAsync("Finn Murphy", "short.finn@northwind.studio");

        var response = await AcceptAsync(invite.Token, "Finn Murphy", "short");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var errors = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors");
        errors.GetProperty("Password")[0].GetString().Should().Be("Password must be at least 10 characters");
        await ExpectNothingCreatedAsync("short.finn@northwind.studio", invite);
    }

    [Fact]
    public async Task An_empty_name_is_refused_and_nothing_is_created()
    {
        // L2-004 AC8.
        var invite = await InviteAsync("Finn Murphy", "noname.finn@northwind.studio");

        var response = await AcceptAsync(invite.Token, "   ", Password);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var errors = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors");
        errors.GetProperty("Name")[0].GetString().Should().Be("Enter your name.");
        await ExpectNothingCreatedAsync("noname.finn@northwind.studio", invite);
    }

    [Fact]
    public async Task A_link_works_once()
    {
        // L2-004 AC6.
        var invite = await InviteAsync("Finn Murphy", "once.finn@northwind.studio");
        (await AcceptAsync(invite.Token, "Finn Murphy", Password)).StatusCode.Should().Be(HttpStatusCode.OK);

        var second = await AcceptAsync(invite.Token, "Someone Else", "another-secret-9876");

        await ExpectExpiredAsync(second);
        await ExpectExpiredAsync(await _factory.CreateClient().GetAsync($"/api/invitations/{invite.Token}"));
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Users.Count(u => u.Email == "once.finn@northwind.studio").Should().Be(1);
        db.Users.Single(u => u.Email == "once.finn@northwind.studio").DisplayName.Should().Be("Finn Murphy");
    }

    [Fact]
    public async Task An_expired_link_cannot_be_accepted()
    {
        // L2-004 AC4: expiry holds on submit too.
        var invite = await InviteAsync("Finn Murphy", "late.finn@northwind.studio");
        await _factory.WriteAsync(db =>
            db.Invitations.Single(i => i.Email == "late.finn@northwind.studio").ExpiresUtc = FrozenClockApiFactory.Now.AddMinutes(-1));

        var response = await AcceptAsync(invite.Token, "Finn Murphy", Password);

        await ExpectExpiredAsync(response);
        await using var scope = _factory.Services.CreateAsyncScope();
        scope.ServiceProvider.GetRequiredService<AppDbContext>().Users.Any(u => u.Email == "late.finn@northwind.studio").Should().BeFalse();
    }

    [Fact]
    public async Task An_unknown_link_cannot_be_accepted()
    {
        var response = await AcceptAsync("not-a-real-token", "Finn Murphy", Password);

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString().Should().Be("invitation_not_found");
    }

    [Fact]
    public async Task An_address_that_already_has_an_account_is_refused_with_a_code_and_the_link_still_works()
    {
        // L2-004 AC8.
        var invite = await InviteAsync("Finn Murphy", "dupe.finn@northwind.studio");
        await _factory.WriteAsync(db => db.Users.Add(new Greenlit.Domain.Entities.User
        {
            Id = Guid.NewGuid(), Email = "Dupe.Finn@northwind.studio", DisplayName = "Finn Elsewhere",
            PasswordHash = "not-used", Role = UserRole.Member, CreatedUtc = FrozenClockApiFactory.Now,
        }));

        var response = await AcceptAsync(invite.Token, "Finn Murphy", Password);

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString().Should().Be("account_exists");
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Users.Count(u => u.Email.ToLower() == "dupe.finn@northwind.studio").Should().Be(1);
        db.TeamMembers.Single(m => m.Id == invite.MemberId).UserId.Should().BeNull();
        db.Invitations.Single(i => i.Email == "dupe.finn@northwind.studio").AcceptedUtc.Should().BeNull();
    }

    [Fact]
    public async Task Two_people_cannot_join_through_one_link_at_once()
    {
        var invite = await InviteAsync("Finn Murphy", "race.finn@northwind.studio");

        var responses = await Task.WhenAll(
            AcceptAsync(invite.Token, "Finn Murphy", Password),
            AcceptAsync(invite.Token, "Finn Murphy", Password));

        responses.Count(r => r.StatusCode == HttpStatusCode.OK).Should().Be(1);
        await using var scope = _factory.Services.CreateAsyncScope();
        scope.ServiceProvider.GetRequiredService<AppDbContext>().Users.Count(u => u.Email == "race.finn@northwind.studio").Should().Be(1);
    }

    private async Task ExpectNothingCreatedAsync(string email, Invited invite)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Users.Any(u => u.Email == email).Should().BeFalse();
        db.TeamMembers.Single(m => m.Id == invite.MemberId).UserId.Should().BeNull();
        db.Invitations.Single(i => i.Email == email).AcceptedUtc.Should().BeNull();
    }

    private static async Task ExpectExpiredAsync(HttpResponseMessage response)
    {
        response.StatusCode.Should().Be(HttpStatusCode.Gone);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("code").GetString().Should().Be("invitation_expired");
        body.GetProperty("managerName").GetString().Should().Be("Maya Chen");
    }

    private sealed record Invited(TestTeam Team, string Token, Guid MemberId);

    /// <summary>A manager invites a person through the real endpoint; the token is read from the recorded email.</summary>
    private async Task<Invited> InviteAsync(string name, string email, string role = "Member")
    {
        var team = await TestTeam.CreateAsync(_factory);
        var response = await team.ClientFor("Maya Chen").PostAsJsonAsync("/api/team/members", new { name, email, role });
        response.EnsureSuccessStatusCode();
        var member = await response.Content.ReadFromJsonAsync<JsonElement>();
        return new Invited(team, RecordingEmailSender.TokenIn(_factory.Emails.To(email).Single()), member.GetProperty("id").GetGuid());
    }

    private Task<HttpResponseMessage> AcceptAsync(string token, string? name, string? password) =>
        _factory.CreateClient().PostAsJsonAsync($"/api/invitations/{token}/accept", new { name, password });
}
