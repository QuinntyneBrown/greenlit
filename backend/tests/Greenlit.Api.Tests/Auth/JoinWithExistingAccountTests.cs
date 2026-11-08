using System.IdentityModel.Tokens.Jwt;
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

// Acceptance Test
// Traces to: L2-058 AC2, AC3, AC4, AC5, AC6, AC7; L2-004 AC8; L2-056 AC3
// Description: an invitation to an email that already has an account attaches a membership to that account, signed
//              out with its password or signed in as it; a different signed-in account is refused and nothing changes.

/// <summary>
/// Joining a team with the account one already has (L2-058, ADR-015, docs/detailed-designs/identity-and-access/accept-invitation):
/// GET /api/invitations/{token} says whether the address has an account; POST .../sign-in and POST .../join attach it.
/// The examples: Omar Diaz manages Product team with Sam Chen; Maya Chen invites Sam to Chen family.
/// </summary>
public class JoinWithExistingAccountTests : IClassFixture<FrozenClockApiFactory>
{
    private const string Password = "sams-own-password-1";
    private readonly FrozenClockApiFactory _factory;

    public JoinWithExistingAccountTests(FrozenClockApiFactory factory) => _factory = factory;

    [Fact]
    public async Task The_invitation_says_whether_its_address_already_has_an_account()
    {
        var (_, _, token) = await SamInvitedToChenFamilyAsync();
        var other = await TestTeam.CreateAsync(_factory, teamName: "Other team");
        var response = await other.ClientFor("Maya Chen").PostAsJsonAsync("/api/team/members", new { name = "New Person", email = "nobody.yet@chenhome.net", role = "Member" });
        response.EnsureSuccessStatusCode();
        var freshToken = RecordingEmailSender.TokenIn(_factory.Emails.To("nobody.yet@chenhome.net").Single());

        (await SummaryAsync(token)).GetProperty("accountExists").GetBoolean().Should().BeTrue();
        (await SummaryAsync(freshToken)).GetProperty("accountExists").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task Signed_out_the_accounts_password_joins_the_team_with_one_identity()
    {
        // L2-058 AC2. Given Sam signed out, when he signs in and joins with his password, then the invitation is used up,
        // his account is on Chen family's row (which keeps its days), his session names Chen family as a member, and
        // his Product team membership is unchanged; no second account exists.
        var (product, family, token) = await SamInvitedToChenFamilyAsync();
        var sam = product.UserOf("Sam Chen");
        var row = family.RowOf("Sam");
        await family.SetDayAsync("Sam", new DateOnly(2026, 11, 23), DayStatus.Tentative);

        var response = await _factory.CreateClient().PostAsJsonAsync($"/api/invitations/{token}/sign-in", new { password = Password });

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        var session = await response.Content.ReadFromJsonAsync<JsonElement>();
        session.GetProperty("userId").GetGuid().Should().Be(sam.Id);
        session.GetProperty("teamId").GetGuid().Should().Be(family.Team.Id);
        session.GetProperty("role").GetString().Should().Be("Member");
        var claims = new JwtSecurityTokenHandler().ReadJwtToken(session.GetProperty("accessToken").GetString()).Claims;
        claims.Single(c => c.Type == "team_member_id").Value.Should().Be(row.Id.ToString());
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.Users.CountAsync(u => u.Email == sam.Email)).Should().Be(1);
        var joined = await db.TeamMembers.SingleAsync(m => m.Id == row.Id);
        joined.UserId.Should().Be(sam.Id);
        joined.Name.Should().Be("Sam Chen");
        (await db.TimeOffDays.CountAsync(d => d.TeamMemberId == row.Id)).Should().Be(1);
        (await db.Invitations.SingleAsync(i => i.TeamMemberId == row.Id)).AcceptedUtc.Should().Be(FrozenClockApiFactory.Now);
        (await db.TeamMembers.SingleAsync(m => m.Id == product.RowOf("Sam Chen").Id)).RemovedUtc.Should().BeNull();
    }

    [Fact]
    public async Task A_wrong_password_attaches_nothing_and_keeps_the_invitation_open()
    {
        // L2-058 AC3.
        var (_, family, token) = await SamInvitedToChenFamilyAsync();

        var response = await _factory.CreateClient().PostAsJsonAsync($"/api/invitations/{token}/sign-in", new { password = "not-his-password" });

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString().Should().Be("invalid_credentials");
        await ExpectUnjoinedAsync(family.RowOf("Sam").Id);
    }

    [Fact]
    public async Task Signed_in_as_the_invited_address_join_attaches_the_account_without_a_password()
    {
        // L2-058 AC4.
        var (product, family, token) = await SamInvitedToChenFamilyAsync();

        var response = await product.SessionFor("Sam Chen").PostAsync($"/api/invitations/{token}/join", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("teamId").GetGuid().Should().Be(family.Team.Id);
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.TeamMembers.SingleAsync(m => m.Id == family.RowOf("Sam").Id)).UserId.Should().Be(product.UserOf("Sam Chen").Id);
    }

    [Fact]
    public async Task Signed_in_as_another_account_join_is_refused_and_nothing_changes()
    {
        // L2-058 AC5.
        var (product, family, token) = await SamInvitedToChenFamilyAsync();

        var response = await product.SessionFor("Omar Diaz").PostAsync($"/api/invitations/{token}/join", null);

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString().Should().Be("invitation_other_account");
        await ExpectUnjoinedAsync(family.RowOf("Sam").Id);
    }

    [Fact]
    public async Task Join_needs_a_session()
    {
        var (_, _, token) = await SamInvitedToChenFamilyAsync();

        (await _factory.CreateClient().PostAsync($"/api/invitations/{token}/join", null)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task A_used_link_cannot_be_joined_again()
    {
        // L2-058 AC6: the expired state of L2-004 AC4, AC6.
        var (product, _, token) = await SamInvitedToChenFamilyAsync();
        (await product.SessionFor("Sam Chen").PostAsync($"/api/invitations/{token}/join", null)).EnsureSuccessStatusCode();

        var again = await _factory.CreateClient().PostAsJsonAsync($"/api/invitations/{token}/sign-in", new { password = Password });

        again.StatusCode.Should().Be(HttpStatusCode.Gone);
        (await again.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString().Should().Be("invitation_expired");
    }

    [Fact]
    public async Task The_create_form_still_refuses_an_address_with_an_account()
    {
        // L2-004 AC8: the name-and-password form never makes a second identity.
        var (_, family, token) = await SamInvitedToChenFamilyAsync();

        var response = await _factory.CreateClient().PostAsJsonAsync($"/api/invitations/{token}/accept", new { name = "Sam Chen", password = "another-password-1" });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        await ExpectUnjoinedAsync(family.RowOf("Sam").Id);
    }

    /// <summary>Omar's Product team with Sam Chen (password <see cref="Password"/>); Maya's Chen family invites Sam's address.</summary>
    private async Task<(TestTeam Product, TestTeam Family, string Token)> SamInvitedToChenFamilyAsync()
    {
        var product = await TestTeam.CreateAsync(_factory, "Omar Diaz", teamName: "Product team");
        await product.AddMemberAsync("Sam Chen");
        await product.SetPasswordAsync("Sam Chen", Password);
        var family = await TestTeam.CreateAsync(_factory, "Maya Chen", teamName: "Chen family");
        var email = product.EmailOf("Sam Chen");
        var response = await family.ClientFor("Maya Chen").PostAsJsonAsync("/api/team/members", new { name = "Sam", email, role = "Member" });
        response.StatusCode.Should().Be(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        var id = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
        family.TrackRow("Sam", id);
        return (product, family, RecordingEmailSender.TokenIn(_factory.Emails.To(email).Last()));
    }

    private async Task<JsonElement> SummaryAsync(string token)
    {
        var response = await _factory.CreateClient().GetAsync($"/api/invitations/{token}");
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    private async Task ExpectUnjoinedAsync(Guid rowId)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.TeamMembers.SingleAsync(m => m.Id == rowId)).UserId.Should().BeNull();
        (await db.Invitations.SingleAsync(i => i.TeamMemberId == rowId)).AcceptedUtc.Should().BeNull();
    }
}
