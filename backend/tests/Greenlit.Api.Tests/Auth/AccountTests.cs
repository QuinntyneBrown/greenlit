using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.Auth;

/// <summary>
/// GET /api/auth/me: who the account menu names (L2-006 AC1).
/// Design: docs/detailed-designs/identity-and-access/sign-out.
/// </summary>
public class AccountTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public AccountTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task The_manager_is_named_with_their_email_and_role()
    {
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");

        var response = await team.ClientFor("Maya Chen").GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var me = await response.Content.ReadFromJsonAsync<JsonElement>();
        me.GetProperty("displayName").GetString().Should().Be("Maya Chen");
        me.GetProperty("email").GetString().Should().Be(team.EmailOf("Maya Chen"));
        me.GetProperty("role").GetString().Should().Be("Manager");
    }

    [Fact]
    public async Task A_member_is_named_with_the_role_Member()
    {
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");
        await team.AddMemberAsync("Ana Ruiz");

        var me = await (await team.ClientFor("Ana Ruiz").GetAsync("/api/auth/me")).Content.ReadFromJsonAsync<JsonElement>();

        me.GetProperty("displayName").GetString().Should().Be("Ana Ruiz");
        me.GetProperty("role").GetString().Should().Be("Member");
    }

    [Fact]
    public async Task Without_a_session_it_is_unauthorized()
    {
        var response = await _factory.CreateClient().GetAsync("/api/auth/me");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
