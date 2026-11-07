using System.Net;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.Auth;

/// <summary>
/// POST /api/auth/sign-out (L2-006 AC4). Design: docs/detailed-designs/identity-and-access/sign-out.
/// </summary>
public class SignOutTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public SignOutTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task A_signed_in_person_signs_out_with_no_content()
    {
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");
        var client = team.ClientFor("Maya Chen");

        var response = await client.PostAsync("/api/auth/sign-out", null);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Signing_out_does_not_change_anything_the_person_saved()
    {
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");
        await team.SetDayAsync("Maya Chen", new DateOnly(2026, 11, 16), Greenlit.Domain.Enums.DayStatus.Confirmed);
        var client = team.ClientFor("Maya Chen");

        await client.PostAsync("/api/auth/sign-out", null);

        var sheet = await client.GetStringAsync("/api/sheet?month=2026-11");
        sheet.Should().Contain("2026-11-16");
    }

    [Fact]
    public async Task Without_a_session_it_is_unauthorized()
    {
        var response = await _factory.CreateClient().PostAsync("/api/auth/sign-out", null);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }
}
