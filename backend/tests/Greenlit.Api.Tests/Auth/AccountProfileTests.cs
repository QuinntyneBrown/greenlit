using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Greenlit.Infrastructure.Persistence;

namespace Greenlit.Api.Tests.Auth;

/// <summary>
/// GET /api/account and PUT /api/account/profile (L2-005 AC5, AC6).
/// Design: docs/detailed-designs/identity-and-access/manage-account.
/// </summary>
public class AccountProfileTests : IClassFixture<GreenlitApiFactory>
{
    private const string Password = "correct-horse-battery";
    private readonly GreenlitApiFactory _factory;

    public AccountProfileTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task The_account_names_the_caller()
    {
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");

        var response = await team.ClientFor("Maya Chen").GetAsync("/api/account");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var me = await response.Content.ReadFromJsonAsync<JsonElement>();
        me.GetProperty("displayName").GetString().Should().Be("Maya Chen");
        me.GetProperty("email").GetString().Should().Be(team.EmailOf("Maya Chen"));
    }

    [Fact]
    public async Task Saving_a_new_name_changes_the_account_and_the_sheet_row()
    {
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");
        await team.AddMemberAsync("Ana Ruiz");
        var client = team.ClientFor("Ana Ruiz");

        var response = await client.PutAsJsonAsync("/api/account/profile", new { displayName = "Ana Ruiz-Vega", email = team.EmailOf("Ana Ruiz") });

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        var saved = await response.Content.ReadFromJsonAsync<JsonElement>();
        saved.GetProperty("displayName").GetString().Should().Be("Ana Ruiz-Vega");
        var me = await (await client.GetAsync("/api/account")).Content.ReadFromJsonAsync<JsonElement>();
        me.GetProperty("displayName").GetString().Should().Be("Ana Ruiz-Vega");
        (await RowNameAsync(team.MemberIdOf("Ana Ruiz"))).Should().Be("Ana Ruiz-Vega");
    }

    [Fact]
    public async Task A_new_email_is_the_one_to_sign_in_with()
    {
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");
        await team.AddMemberAsync("Ana Ruiz");
        await team.SetPasswordAsync("Ana Ruiz", Password);
        var fresh = $"{Guid.NewGuid():N}@Example.com";

        var response = await team.ClientFor("Ana Ruiz").PutAsJsonAsync("/api/account/profile", new { displayName = "Ana Ruiz", email = $"  {fresh}  " });

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        (await SignInAsync(fresh, Password)).StatusCode.Should().Be(HttpStatusCode.OK);
        (await SignInAsync(team.EmailOf("Ana Ruiz"), Password)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task An_email_another_account_uses_is_refused_and_nothing_changes()
    {
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");
        await team.AddMemberAsync("Ana Ruiz");

        var response = await team.ClientFor("Ana Ruiz").PutAsJsonAsync("/api/account/profile",
            new { displayName = "Someone Else", email = team.EmailOf("Maya Chen").ToUpperInvariant() });

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("code").GetString().Should().Be("email_taken");
        var me = await (await team.ClientFor("Ana Ruiz").GetAsync("/api/account")).Content.ReadFromJsonAsync<JsonElement>();
        me.GetProperty("displayName").GetString().Should().Be("Ana Ruiz");
        me.GetProperty("email").GetString().Should().Be(team.EmailOf("Ana Ruiz"));
    }

    [Fact]
    public async Task Keeping_your_own_email_is_not_a_clash()
    {
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");

        var response = await team.ClientFor("Maya Chen").PutAsJsonAsync("/api/account/profile",
            new { displayName = "Maya C.", email = team.EmailOf("Maya Chen").ToUpperInvariant() });

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
    }

    [Theory]
    [InlineData("", "a@b.co", "DisplayName")]
    [InlineData("   ", "a@b.co", "DisplayName")]
    [InlineData("Ana", "not-an-email", "Email")]
    [InlineData("Ana", "", "Email")]
    public async Task A_missing_name_or_a_malformed_email_is_refused(string name, string email, string field)
    {
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");

        var response = await team.ClientFor("Maya Chen").PutAsJsonAsync("/api/account/profile", new { displayName = name, email });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("errors").TryGetProperty(field, out _).Should().BeTrue();
    }

    [Fact]
    public async Task Without_a_session_the_account_is_unauthorized()
    {
        var client = _factory.CreateClient();

        (await client.GetAsync("/api/account")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await client.PutAsJsonAsync("/api/account/profile", new { displayName = "x", email = "x@y.zz" })).StatusCode
            .Should().Be(HttpStatusCode.Unauthorized);
    }

    private async Task<string> RowNameAsync(Guid memberId)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return (await db.TeamMembers.AsNoTracking().SingleAsync(m => m.Id == memberId)).Name;
    }

    private Task<HttpResponseMessage> SignInAsync(string email, string password) =>
        _factory.CreateClient().PostAsJsonAsync("/api/auth/sign-in", new { email, password });
}
