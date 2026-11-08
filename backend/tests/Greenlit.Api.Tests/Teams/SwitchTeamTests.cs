using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.Teams;

/// <summary>
/// POST /api/teams/{id}/switch: a new session for another team the caller belongs to (L2-054 AC3, AC8, AC10;
/// L2-056 AC3; ADR-014, ADR-015).
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
    public async Task A_member_switches_to_another_team_they_belong_to_and_gets_a_members_session()
    {
        // L2-056 AC3, L2-054 AC8 (ADR-015). Given Sam, a member of Product team and Chen family, when he switches to
        // Chen family, then the session names it and his row on it, carries the Member role, and the sheet is Chen
        // family's as a member sees it.
        var product = await TestTeam.CreateAsync(_factory, "Omar Diaz", teamName: "Product team");
        await product.AddMemberAsync("Sam Chen");
        var family = await TestTeam.CreateAsync(_factory, "Maya Chen", teamName: "Chen family");
        var row = await family.AddExistingMemberAsync(product, "Sam Chen");

        var response = await product.SessionFor("Sam Chen").PostAsync($"/api/teams/{family.Team.Id}/switch", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        var token = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("accessToken").GetString()!;
        var claims = new JwtSecurityTokenHandler().ReadJwtToken(token).Claims.ToList();
        claims.Single(c => c.Type == "team_id").Value.Should().Be(family.Team.Id.ToString());
        claims.Single(c => c.Type == "team_member_id").Value.Should().Be(row.Id.ToString());
        claims.Single(c => c.Type == "role").Value.Should().Be("Member");
        var month = await MonthAsync(BearerClient(token));
        month.GetProperty("isManager").GetBoolean().Should().BeFalse();
        month.GetProperty("members").EnumerateArray().Select(m => m.GetProperty("name").GetString()).Should().Equal("Sam Chen", "Maya Chen"); // a member's own row comes first (L2-012)
    }

    [Fact]
    public async Task A_manager_switching_to_a_team_they_are_only_a_member_of_gets_the_members_role_there()
    {
        // L2-055 AC4 (ADR-015): the role claim is the role on the active team, so manager-only calls are refused
        // there, and switching back gives the Manager role again.
        var design = await TestTeam.CreateAsync(_factory, "Maya Chen");
        var other = await TestTeam.CreateAsync(_factory, "Omar Diaz", teamName: "Product team");
        await other.AddExistingMemberAsync(design, "Maya Chen");

        var asMember = BearerClient(await SwitchTokenAsync(design.SessionFor("Maya Chen"), other.Team.Id));
        RoleOf(await SwitchTokenAsync(design.SessionFor("Maya Chen"), other.Team.Id)).Should().Be("Member");
        (await MonthAsync(asMember)).GetProperty("isManager").GetBoolean().Should().BeFalse();
        (await asMember.GetAsync("/api/team/settings")).StatusCode.Should().Be(HttpStatusCode.Forbidden);

        var back = await SwitchTokenAsync(asMember, design.Team.Id);
        RoleOf(back).Should().Be("Manager");
        (await MonthAsync(BearerClient(back))).GetProperty("isManager").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task A_member_cannot_switch_to_a_team_they_do_not_belong_to_or_were_removed_from()
    {
        // L2-054 AC8, L2-055 AC5, L2-058 AC9: no live row, no switch.
        var design = await TestTeam.CreateAsync(_factory, "Maya Chen");
        var product = await design.AddTeamAsync("Product team");
        await design.AddMemberAsync("Ana Ruiz");
        var family = await TestTeam.CreateAsync(_factory, "Leo Park", teamName: "Park family");
        var removed = await family.AddExistingMemberAsync(design, "Ana Ruiz");
        await _factory.WriteAsync(db => db.TeamMembers.Single(m => m.Id == removed.Id).RemovedUtc = DateTimeOffset.UtcNow);

        await ShouldBeTeamNotFoundAsync(await design.SessionFor("Ana Ruiz").PostAsync($"/api/teams/{product.Team.Id}/switch", null));
        await ShouldBeTeamNotFoundAsync(await design.SessionFor("Ana Ruiz").PostAsync($"/api/teams/{family.Team.Id}/switch", null));
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

    private HttpClient BearerClient(string token)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return client;
    }

    private static async Task<string> SwitchTokenAsync(HttpClient client, Guid teamId)
    {
        var response = await client.PostAsync($"/api/teams/{teamId}/switch", null);
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("accessToken").GetString()!;
    }

    private static string RoleOf(string token) =>
        new JwtSecurityTokenHandler().ReadJwtToken(token).Claims.Single(c => c.Type == "role").Value;

    private static async Task<JsonElement> MonthAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/sheet?month=2026-11");
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }
}
