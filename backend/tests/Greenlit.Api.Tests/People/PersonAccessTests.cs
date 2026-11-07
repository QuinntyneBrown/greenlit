using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.People;

/// <summary>
/// Who may open a person's page (L2-035, L2-034 AC2). Design: docs/detailed-designs/allowances/person-page.
/// </summary>
public class PersonAccessTests : IClassFixture<FrozenClockApiFactory>
{
    private readonly FrozenClockApiFactory _factory;

    public PersonAccessTests(FrozenClockApiFactory factory) => _factory = factory;

    [Fact]
    public async Task A_member_opening_another_members_page_gets_403_own_details_only()
    {
        // L2-035 AC1
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Ben Okafor");

        var response = await team.ClientFor("Ana Ruiz").GetAsync($"/api/people/{team.MemberIdOf("Ben Okafor")}");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString().Should().Be("own_details_only");
    }

    [Fact]
    public async Task A_member_opening_the_managers_page_gets_403()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var response = await team.ClientFor("Ana Ruiz").GetAsync($"/api/people/{team.MemberIdOf("Maya Chen")}");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task A_member_opens_their_own_page_and_the_manager_opens_anyones()
    {
        // L2-033 AC4 (own page), L2-035 AC1 (managers see everyone)
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var own = await PersonFiguresTests.PersonAsync(team.ClientFor("Ana Ruiz"), team.MemberIdOf("Ana Ruiz"));
        var others = await PersonFiguresTests.PersonAsync(team.ClientFor("Maya Chen"), team.MemberIdOf("Ana Ruiz"));

        own.GetProperty("name").GetString().Should().Be("Ana Ruiz");
        own.GetProperty("isYou").GetBoolean().Should().BeTrue();
        own.GetProperty("canManage").GetBoolean().Should().BeFalse();
        others.GetProperty("isYou").GetBoolean().Should().BeFalse();
        others.GetProperty("canManage").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task An_unknown_id_is_404_person_not_found()
    {
        // L2-035 AC2
        var team = await TestTeam.CreateAsync(_factory);

        var response = await team.ClientFor("Maya Chen").GetAsync($"/api/people/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString().Should().Be("person_not_found");
    }

    [Fact]
    public async Task Someone_on_another_team_is_404_not_403_so_nothing_is_revealed()
    {
        // L2-035 AC2: team-owned data stays scoped to the caller's team.
        var ours = await TestTeam.CreateAsync(_factory);
        var theirs = await TestTeam.CreateAsync(_factory, "Zed Other", teamName: "Other team");
        await theirs.AddMemberAsync("Yan Other");

        var asManager = await ours.ClientFor("Maya Chen").GetAsync($"/api/people/{theirs.MemberIdOf("Yan Other")}");

        asManager.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Me_is_the_callers_own_page_for_a_member_and_for_the_manager()
    {
        // L2-006 AC5: "My time off" opens the caller's own person page.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var ana = await (await team.ClientFor("Ana Ruiz").GetAsync("/api/people/me")).Content.ReadFromJsonAsync<JsonElement>();
        var maya = await (await team.ClientFor("Maya Chen").GetAsync("/api/people/me")).Content.ReadFromJsonAsync<JsonElement>();

        ana.GetProperty("name").GetString().Should().Be("Ana Ruiz");
        ana.GetProperty("isYou").GetBoolean().Should().BeTrue();
        maya.GetProperty("name").GetString().Should().Be("Maya Chen");
        maya.GetProperty("canManage").GetBoolean().Should().BeTrue();
    }
}
