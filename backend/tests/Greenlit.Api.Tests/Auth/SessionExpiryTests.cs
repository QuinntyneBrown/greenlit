using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.Auth;

/// <summary>
/// A token past its eight hours is refused with <c>session_expired</c> (L2-007 AC1).
/// Design: docs/detailed-designs/identity-and-access/sign-out.
/// </summary>
public class SessionExpiryTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public SessionExpiryTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task An_expired_token_is_refused_with_the_code_session_expired()
    {
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");
        var client = ClientWith(GreenlitApiFactoryExtensions.TokenFor(team.Manager, DateTime.UtcNow.AddMinutes(-1)));

        var response = await client.GetAsync("/api/sheet?month=2026-11");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("code").GetString().Should().Be("session_expired");
    }

    [Fact]
    public async Task A_live_token_is_not_refused()
    {
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");

        var response = await team.ClientFor("Maya Chen").GetAsync("/api/sheet?month=2026-11");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task A_missing_or_malformed_token_is_unauthorized_without_the_expiry_code()
    {
        var anonymous = await _factory.CreateClient().GetAsync("/api/sheet?month=2026-11");
        var garbled = await ClientWith("not.a.token").GetAsync("/api/sheet?month=2026-11");

        foreach (var response in new[] { anonymous, garbled })
        {
            response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
            (await response.Content.ReadAsStringAsync()).Should().NotContain("session_expired");
        }
    }

    private HttpClient ClientWith(string token)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }
}
