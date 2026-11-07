using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace Greenlit.Api.Tests.Teams;

/// <summary>
/// POST /api/team/members (L2-010). Design: docs/detailed-designs/teams/invite-member.
/// The clock reads Friday 6 November 2026, so a link sent in these tests expires on 13 November 2026.
/// </summary>
public class InviteMemberTests : IClassFixture<FrozenClockApiFactory>
{
    private readonly FrozenClockApiFactory _factory;

    public InviteMemberTests(FrozenClockApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Inviting_a_person_puts_a_row_on_the_calendar_and_emails_a_seven_day_link()
    {
        // L2-010 AC3: the member is added as a row, an invitation email is sent.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var response = await InviteAsync(team.ClientFor("Maya Chen"), "Finn Murphy", "finn@northwind.studio");

        response.StatusCode.Should().Be(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        var invited = (await response.Content.ReadFromJsonAsync<JsonElement>());
        invited.GetProperty("name").GetString().Should().Be("Finn Murphy");
        invited.GetProperty("email").GetString().Should().Be("finn@northwind.studio");

        var month = await MonthAsync(team.ClientFor("Maya Chen"));
        month.GetProperty("members").EnumerateArray().Select(m => m.GetProperty("name").GetString())
            .Should().Equal("Maya Chen", "Ana Ruiz", "Finn Murphy");

        var email = _factory.Emails.To("finn@northwind.studio").Should().ContainSingle().Subject;
        email.Subject.Should().Contain("Design team");
        email.Body.Should().Contain("Maya Chen").And.Contain("seven days");
    }

    [Fact]
    public async Task The_link_is_single_use_for_seven_days_and_only_its_hash_is_stored()
    {
        // L2-010 AC3 ("works for seven days"); ADR-006.
        var team = await TestTeam.CreateAsync(_factory);

        await InviteAsync(team.ClientFor("Maya Chen"), "Finn Murphy", "finn.murphy@northwind.studio");

        var token = RecordingEmailSender.TokenIn(_factory.Emails.To("finn.murphy@northwind.studio").Single());
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var invitation = db.Invitations.Single(i => i.TeamMemberId == db.TeamMembers.Single(m => m.TeamId == team.Team.Id && m.Name == "Finn Murphy").Id);
        invitation.Email.Should().Be("finn.murphy@northwind.studio");
        invitation.SentUtc.Should().Be(FrozenClockApiFactory.Now);
        invitation.ExpiresUtc.Should().Be(FrozenClockApiFactory.Now.AddDays(7));
        invitation.AcceptedUtc.Should().BeNull();
        invitation.TokenHash.Should().Be(Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token))));
        invitation.TokenHash.Should().NotContain(token);
    }

    [Fact]
    public async Task Signed_out_callers_get_401()
    {
        var response = await InviteAsync(_factory.CreateClient(), "Finn Murphy", "signed.out@northwind.studio");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        _factory.Emails.To("signed.out@northwind.studio").Should().BeEmpty();
    }

    [Fact]
    public async Task A_member_cannot_invite_anyone()
    {
        // Only the manager owns membership (AGENTS.md: team data rules).
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var response = await InviteAsync(team.ClientFor("Ana Ruiz"), "Finn Murphy", "by.member@northwind.studio");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        _factory.Emails.To("by.member@northwind.studio").Should().BeEmpty();
        (await MonthAsync(team.ClientFor("Maya Chen"))).GetProperty("members").GetArrayLength().Should().Be(2);
    }

    [Fact]
    public async Task A_manager_without_a_team_cannot_invite_anyone()
    {
        var noor = await TestAccount.CreateAsync(_factory);
        await _factory.WriteAsync(db => db.Users.Single(u => u.Id == noor.Id).Role = Greenlit.Domain.Enums.UserRole.Manager);
        noor.Role = Greenlit.Domain.Enums.UserRole.Manager;

        var response = await InviteAsync(_factory.ClientFor(noor), "Finn Murphy", "no.team@northwind.studio");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await Problem(response)).GetProperty("code").GetString().Should().Be("forbidden");
    }

    [Fact]
    public async Task An_invitation_joins_the_callers_own_team_only()
    {
        var design = await TestTeam.CreateAsync(_factory, "Maya Chen", teamName: "Design team");
        var sales = await TestTeam.CreateAsync(_factory, "Sam Lee", teamName: "Sales team");

        await InviteAsync(sales.ClientFor("Sam Lee"), "Finn Murphy", "sales.finn@northwind.studio");

        (await MonthAsync(sales.ClientFor("Sam Lee"))).GetProperty("members").EnumerateArray()
            .Select(m => m.GetProperty("name").GetString()).Should().Equal("Sam Lee", "Finn Murphy");
        (await MonthAsync(design.ClientFor("Maya Chen"))).GetProperty("members").EnumerateArray()
            .Select(m => m.GetProperty("name").GetString()).Should().Equal("Maya Chen");
        _factory.Emails.To("sales.finn@northwind.studio").Single().Subject.Should().Contain("Sales team");
    }

    [Fact]
    public async Task The_chosen_role_is_kept_on_the_row()
    {
        var team = await TestTeam.CreateAsync(_factory);

        var response = await InviteAsync(team.ClientFor("Maya Chen"), "Finn Murphy", "role.finn@northwind.studio", role: "Manager");

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("role").GetString().Should().Be("Manager");
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.TeamMembers.Single(m => m.TeamId == team.Team.Id && m.Name == "Finn Murphy").Role
            .Should().Be(Greenlit.Domain.Enums.UserRole.Manager);
    }

    [Fact]
    public async Task An_empty_name_and_an_invalid_email_are_refused_and_nothing_is_sent()
    {
        // L2-010 AC2.
        var team = await TestTeam.CreateAsync(_factory);

        var response = await InviteAsync(team.ClientFor("Maya Chen"), "  ", "finn@northwind");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var errors = (await Problem(response)).GetProperty("errors");
        errors.GetProperty("Name")[0].GetString().Should().Be("Enter a name.");
        errors.GetProperty("Email")[0].GetString().Should().Be("Enter a valid email address, like name@company.com.");
        (await MonthAsync(team.ClientFor("Maya Chen"))).GetProperty("members").GetArrayLength().Should().Be(1);
        _factory.Emails.To("finn@northwind").Should().BeEmpty();
    }

    [Fact]
    public async Task A_role_other_than_member_or_manager_is_refused()
    {
        var team = await TestTeam.CreateAsync(_factory);

        var response = await InviteAsync(team.ClientFor("Maya Chen"), "Finn Murphy", "norole@northwind.studio", role: "Admin");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        _factory.Emails.To("norole@northwind.studio").Should().BeEmpty();
    }

    [Fact]
    public async Task When_the_email_cannot_be_sent_nothing_is_added_to_the_team()
    {
        // L2-010 AC4.
        var team = await TestTeam.CreateAsync(_factory);
        _factory.Emails.Failing = true;
        try
        {
            var response = await InviteAsync(team.ClientFor("Maya Chen"), "Finn Murphy", "unsent.finn@northwind.studio");
            response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
        }
        finally
        {
            _factory.Emails.Failing = false;
        }

        (await MonthAsync(team.ClientFor("Maya Chen"))).GetProperty("members").GetArrayLength().Should().Be(1);
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.TeamMembers.Any(m => m.TeamId == team.Team.Id && m.Name == "Finn Murphy").Should().BeFalse();
        db.Invitations.Any(i => i.Email == "unsent.finn@northwind.studio").Should().BeFalse();
    }

    [Fact]
    public async Task Inviting_a_pending_address_again_sends_a_new_link_and_retires_the_old_one()
    {
        var team = await TestTeam.CreateAsync(_factory);
        var maya = team.ClientFor("Maya Chen");
        await InviteAsync(maya, "Finn Murphy", "again.finn@northwind.studio");

        var again = await InviteAsync(maya, "Finn M.", "AGAIN.finn@northwind.studio");

        again.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await again.Content.ReadFromJsonAsync<JsonElement>();
        body.GetProperty("resent").GetBoolean().Should().BeTrue();
        body.GetProperty("name").GetString().Should().Be("Finn Murphy");
        (await MonthAsync(maya)).GetProperty("members").GetArrayLength().Should().Be(2);
        var emails = _factory.Emails.To("again.finn@northwind.studio");
        emails.Should().HaveCount(2);
        var (first, second) = (RecordingEmailSender.TokenIn(emails[0]), RecordingEmailSender.TokenIn(emails[1]));
        second.Should().NotBe(first);
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var invitations = db.Invitations.Where(i => i.Email == "again.finn@northwind.studio").ToList();
        invitations.Should().HaveCount(2);
        invitations.Single(i => i.TokenHash == Hash(first)).RetiredUtc.Should().NotBeNull();
        invitations.Single(i => i.TokenHash == Hash(second)).RetiredUtc.Should().BeNull();
        invitations.Single(i => i.TokenHash == Hash(second)).ExpiresUtc.Should().Be(FrozenClockApiFactory.Now.AddDays(7));
    }

    [Fact]
    public async Task A_failed_resend_keeps_the_old_link_working()
    {
        var team = await TestTeam.CreateAsync(_factory);
        var maya = team.ClientFor("Maya Chen");
        await InviteAsync(maya, "Finn Murphy", "keep.finn@northwind.studio");
        _factory.Emails.Failing = true;
        try
        {
            (await InviteAsync(maya, "Finn Murphy", "keep.finn@northwind.studio")).StatusCode
                .Should().Be(HttpStatusCode.InternalServerError);
        }
        finally
        {
            _factory.Emails.Failing = false;
        }

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Invitations.Single(i => i.Email == "keep.finn@northwind.studio").RetiredUtc.Should().BeNull();
    }

    [Fact]
    public async Task An_address_that_has_already_joined_is_refused_with_a_code()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await _factory.WriteAsync(db => db.TeamMembers.Single(m => m.Id == team.MemberIdOf("Ana Ruiz")).Email = team.EmailOf("Ana Ruiz"));

        var response = await InviteAsync(team.ClientFor("Maya Chen"), "Ana R.", team.EmailOf("Ana Ruiz"));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await Problem(response)).GetProperty("code").GetString().Should().Be("member_exists");
        _factory.Emails.To(team.EmailOf("Ana Ruiz")).Should().BeEmpty();
    }

    [Fact]
    public async Task The_same_address_can_be_invited_to_a_different_team()
    {
        // The duplicate check is scoped to the caller's team and reveals nothing about others.
        var design = await TestTeam.CreateAsync(_factory, "Maya Chen", teamName: "Design team");
        var sales = await TestTeam.CreateAsync(_factory, "Sam Lee", teamName: "Sales team");
        await InviteAsync(design.ClientFor("Maya Chen"), "Finn Murphy", "both.finn@northwind.studio");

        var response = await InviteAsync(sales.ClientFor("Sam Lee"), "Finn Murphy", "both.finn@northwind.studio");

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    private static string Hash(string token) => Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));

    private static async Task<JsonElement> Problem(HttpResponseMessage response) =>
        await response.Content.ReadFromJsonAsync<JsonElement>();

    private static Task<HttpResponseMessage> InviteAsync(HttpClient client, string? name, string? email, string role = "Member") =>
        client.PostAsJsonAsync("/api/team/members", new { name, email, role });

    private static async Task<JsonElement> MonthAsync(HttpClient client) =>
        await client.GetFromJsonAsync<JsonElement>("/api/sheet?month=2026-11");
}
