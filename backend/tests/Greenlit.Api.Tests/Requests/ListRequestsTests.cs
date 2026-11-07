using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.Requests;

/// <summary>
/// GET /api/requests?status=: the requests the manager decides on (L2-024 "from the list").
/// Design: docs/detailed-designs/requests/approve-request. The tabs and overlaps are journey 9.
/// </summary>
public class ListRequestsTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public ListRequestsTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Signed_out_callers_get_401()
    {
        (await _factory.CreateClient().GetAsync("/api/requests")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task A_member_gets_403()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var response = await team.ClientFor("Ana Ruiz").GetAsync("/api/requests");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task The_manager_sees_the_pending_requests_of_their_own_team_oldest_first()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Cleo Park");
        var other = await TestTeam.CreateAsync(_factory, "Olu Bello", teamName: "Other team");
        await other.AddMemberAsync("Ola Ito");
        await SendAsync(team, "Cleo Park", "2026-11-12", "2026-11-13", "Long weekend away");
        await SendAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-20", "Visiting family in Seville");
        await SendAsync(other, "Ola Ito", "2026-11-16", "2026-11-20", "Not yours");

        var response = await team.ClientFor("Maya Chen").GetAsync("/api/requests");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var list = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        list.EnumerateArray().Select(r => r.GetProperty("memberName").GetString()).Should().Equal("Cleo Park", "Ana Ruiz");
        var ana = list[1];
        ana.GetProperty("firstDay").GetString().Should().Be("2026-11-16");
        ana.GetProperty("lastDay").GetString().Should().Be("2026-11-20");
        ana.GetProperty("days").GetInt32().Should().Be(5);
        ana.GetProperty("note").GetString().Should().Be("Visiting family in Seville");
        ana.GetProperty("status").GetString().Should().Be("Pending");
        ana.GetProperty("id").GetGuid().Should().NotBeEmpty();
        ana.GetProperty("sentUtc").GetDateTimeOffset().Should().BeCloseTo(DateTimeOffset.UtcNow, TimeSpan.FromMinutes(5));
        ana.GetProperty("memberId").GetGuid().Should().Be(team.MemberIdOf("Ana Ruiz"));
    }

    [Fact]
    public async Task A_request_that_was_approved_leaves_the_pending_list_and_joins_the_approved_one()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var id = (await Json(await SendAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-20", null))).GetProperty("id").GetGuid();
        (await team.ClientFor("Maya Chen").PostAsJsonAsync("/api/requests/approve", new { ids = new[] { id } }))
            .StatusCode.Should().Be(HttpStatusCode.OK);

        var pending = await Json(await team.ClientFor("Maya Chen").GetAsync("/api/requests?status=Pending"));
        var approved = await Json(await team.ClientFor("Maya Chen").GetAsync("/api/requests?status=Approved"));

        pending.GetArrayLength().Should().Be(0);
        approved.EnumerateArray().Select(r => r.GetProperty("id").GetGuid()).Should().Equal(id);
        approved[0].GetProperty("status").GetString().Should().Be("Approved");
    }

    [Fact]
    public async Task An_unknown_status_is_a_validation_error()
    {
        var team = await TestTeam.CreateAsync(_factory);

        var response = await team.ClientFor("Maya Chen").GetAsync("/api/requests?status=Sleeping");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    private static Task<HttpResponseMessage> SendAsync(TestTeam team, string member, string first, string last, string? note) =>
        team.ClientFor(member).PostAsJsonAsync("/api/requests", new { firstDay = first, lastDay = last, note });

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
}
