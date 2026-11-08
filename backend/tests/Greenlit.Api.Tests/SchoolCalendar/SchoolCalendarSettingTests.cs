using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.SchoolCalendar;

// Acceptance Test
// Traces to: L2-059 AC2; L2-009 AC8
// Description: the school calendar is a team setting, off by default, that only the team's manager changes.

/// <summary>PUT /api/team/settings/school-calendar (docs/detailed-designs/teams/school-calendar, ADR-015).</summary>
public class SchoolCalendarSettingTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public SchoolCalendarSettingTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task A_new_team_has_the_school_calendar_off_and_every_member_can_read_it()
    {
        var family = await TestTeam.CreateAsync(_factory, "Maya Chen", teamName: "Chen family");
        await family.AddMemberAsync("Sam Chen");

        (await _factory.GetJsonAsync(family.SessionFor("Maya Chen"), "/api/team/settings")).GetProperty("schoolCalendar").GetBoolean().Should().BeFalse();
        (await _factory.GetJsonAsync(family.SessionFor("Sam Chen"), "/api/team/settings/team")).GetProperty("schoolCalendar").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task The_manager_turns_it_on_and_off()
    {
        var family = await TestTeam.CreateAsync(_factory, "Maya Chen", teamName: "Chen family");
        var maya = family.SessionFor("Maya Chen");

        var on = await maya.PutAsJsonAsync("/api/team/settings/school-calendar", new { schoolCalendar = true });

        on.StatusCode.Should().Be(HttpStatusCode.OK, await on.Content.ReadAsStringAsync());
        (await on.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("schoolCalendar").GetBoolean().Should().BeTrue();
        (await _factory.GetJsonAsync(maya, "/api/team/settings/team")).GetProperty("schoolCalendar").GetBoolean().Should().BeTrue();

        var off = await maya.PutAsJsonAsync("/api/team/settings/school-calendar", new { schoolCalendar = false });
        (await off.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("schoolCalendar").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task A_member_cannot_change_it()
    {
        // L2-059 AC2.
        var family = await TestTeam.CreateAsync(_factory, "Maya Chen", teamName: "Chen family");
        await family.AddMemberAsync("Sam Chen");

        var response = await family.SessionFor("Sam Chen").PutAsJsonAsync("/api/team/settings/school-calendar", new { schoolCalendar = true });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await _factory.GetJsonAsync(family.SessionFor("Maya Chen"), "/api/team/settings")).GetProperty("schoolCalendar").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task A_request_without_a_value_is_invalid()
    {
        var family = await TestTeam.CreateAsync(_factory, "Maya Chen", teamName: "Chen family");

        var response = await family.SessionFor("Maya Chen").PutAsJsonAsync("/api/team/settings/school-calendar", new { });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }
}
