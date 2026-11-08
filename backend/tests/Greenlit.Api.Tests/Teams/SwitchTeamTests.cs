using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.Teams;

/// <summary>
/// POST /api/teams/{id}/switch: a new session for another team the caller manages (L2-054 AC3, AC8, AC10; ADR-014).
/// Design: docs/detailed-designs/teams/switch-team.
/// </summary>
public class SwitchTeamTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public SwitchTeamTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Switching_returns_a_session_that_names_the_team_and_the_managers_row_on_it()
    {
        // L2-054 AC8. Given a manager on Design team who also manages Product team, when they switch to Product team,
        // then the new session's team_id names Product team and team_member_id their own row on it.
        var design = await TestTeam.CreateAsync(_factory, "Maya Chen");
        var product = await design.AddTeamAsync("Product team");

        var response = await design.SessionFor("Maya Chen").PostAsync($"/api/teams/{product.Team.Id}/switch", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        var session = await response.Content.ReadFromJsonAsync<JsonElement>();
        session.GetProperty("teamId").GetGuid().Should().Be(product.Team.Id);
        session.GetProperty("userId").GetGuid().Should().Be(design.Manager.Id);
        session.GetProperty("displayName").GetString().Should().Be("Maya Chen");
        session.GetProperty("role").GetString().Should().Be("Manager");
        var token = new JwtSecurityTokenHandler().ReadJwtToken(session.GetProperty("accessToken").GetString());
        token.Subject.Should().Be(design.Manager.Id.ToString());
        token.Claims.Should().Contain(c => c.Type == "team_id" && c.Value == product.Team.Id.ToString());
        token.Claims.Should().Contain(c => c.Type == "team_member_id" && c.Value == product.ManagerRow.Id.ToString());
    }

    [Fact]
    public async Task The_new_session_shows_the_new_team_only_and_the_old_one_keeps_its_team()
    {
        // L2-054 AC3, AC10. Given the switch to Product team, then the sheet and the requests show Product team only;
        // a session issued before the switch (another device) still works and still shows Design team.
        var design = await TestTeam.CreateAsync(_factory, "Maya Chen");
        await design.AddMemberAsync("Ana Ruiz");
        await design.AddRequestAsync("Ana Ruiz", new DateOnly(2026, 12, 7), new DateOnly(2026, 12, 11), Greenlit.Domain.Enums.RequestStatus.Pending);
        var product = await design.AddTeamAsync("Product team");
        await product.AddMemberAsync("Raj Mehta");
        var before = design.SessionFor("Maya Chen");

        var switched = await SwitchedClientAsync(before, product.Team.Id);

        (await MemberNamesAsync(switched)).Should().Equal("Maya Chen", "Raj Mehta");
        (await PendingCountAsync(switched)).Should().Be(0);
        (await MemberNamesAsync(before)).Should().Equal("Maya Chen", "Ana Ruiz");
        (await PendingCountAsync(before)).Should().Be(1);
    }

    [Fact]
    public async Task Another_managers_team_is_not_found_and_reveals_nothing()
    {
        // L2-054 AC8: a team the caller does not manage is a 404 team_not_found, with none of its data.
        var design = await TestTeam.CreateAsync(_factory, "Maya Chen");
        var other = await TestTeam.CreateAsync(_factory, "Omar Diaz", teamName: "Secret team");

        var response = await design.SessionFor("Maya Chen").PostAsync($"/api/teams/{other.Team.Id}/switch", null);

        await ShouldBeTeamNotFoundAsync(response);
    }

    [Fact]
    public async Task A_member_cannot_switch_to_the_team_they_are_on_or_any_other()
    {
        // L2-054 AC8: a team the caller is only a member of is not one they manage.
        var design = await TestTeam.CreateAsync(_factory, "Maya Chen");
        var product = await design.AddTeamAsync("Product team");
        await design.AddMemberAsync("Ana Ruiz");

        await ShouldBeTeamNotFoundAsync(await design.SessionFor("Ana Ruiz").PostAsync($"/api/teams/{design.Team.Id}/switch", null));
        await ShouldBeTeamNotFoundAsync(await design.SessionFor("Ana Ruiz").PostAsync($"/api/teams/{product.Team.Id}/switch", null));
    }

    [Fact]
    public async Task An_id_no_team_has_is_not_found()
    {
        var design = await TestTeam.CreateAsync(_factory, "Maya Chen");

        await ShouldBeTeamNotFoundAsync(await design.SessionFor("Maya Chen").PostAsync($"/api/teams/{Guid.NewGuid()}/switch", null));
    }

    [Fact]
    public async Task Without_a_session_the_request_is_unauthorized()
    {
        var response = await _factory.CreateClient().PostAsync($"/api/teams/{Guid.NewGuid()}/switch", null);

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private async Task<HttpClient> SwitchedClientAsync(HttpClient client, Guid teamId)
    {
        var response = await client.PostAsync($"/api/teams/{teamId}/switch", null);
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        var session = await response.Content.ReadFromJsonAsync<JsonElement>();
        var switched = _factory.CreateClient();
        switched.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", session.GetProperty("accessToken").GetString());
        return switched;
    }

    private static async Task<List<string>> MemberNamesAsync(HttpClient client)
    {
        var month = await client.GetFromJsonAsync<JsonElement>("/api/sheet?month=2026-11");
        return month.GetProperty("members").EnumerateArray().Select(m => m.GetProperty("name").GetString()!).ToList();
    }

    private static async Task<int> PendingCountAsync(HttpClient client)
    {
        var requests = await client.GetFromJsonAsync<JsonElement>("/api/requests");
        return requests.GetArrayLength();
    }

    private static async Task ShouldBeTeamNotFoundAsync(HttpResponseMessage response)
    {
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.Should().Be(HttpStatusCode.NotFound, body);
        JsonDocument.Parse(body).RootElement.GetProperty("code").GetString().Should().Be("team_not_found");
        body.Should().NotContain("Secret team").And.NotContain("accessToken");
    }
}
