using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Domain.Enums;
using Greenlit.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Greenlit.Api.Tests.SchoolCalendar;

// Acceptance Test
// Traces to: L2-060 AC1, AC2, AC3, AC4, AC6, AC7, AC8; L2-059 AC1, AC3, AC4, AC5
// Description: while the school calendar is on, the manager marks members as children and adds children by name;
//              a child has no allowance; a login-less child's days are confirmed; turning it off hides and keeps.

/// <summary>Child members (docs/detailed-designs/teams/school-calendar, ADR-015). The clock is the real one.</summary>
public class ChildMemberTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public ChildMemberTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task The_manager_marks_a_member_as_a_child_in_the_team_section()
    {
        // L2-060 AC1, L2-059 AC3.
        var family = await FamilyAsync(schoolCalendar: true);
        var leo = await family.AddMemberAsync("Leo Chen", withAccount: false);

        var saved = await SaveTeamAsync(family, (leo.Id, true));

        saved.StatusCode.Should().Be(HttpStatusCode.OK, await saved.Content.ReadAsStringAsync());
        var section = await _factory.GetJsonAsync(family.SessionFor("Maya Chen"), "/api/team/settings/team");
        section.GetProperty("members").EnumerateArray().Single(m => m.GetProperty("name").GetString() == "Leo Chen")
            .GetProperty("isChild").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task A_child_mark_is_refused_while_the_school_calendar_is_off_or_on_the_managers_row()
    {
        // L2-060 AC8.
        var off = await FamilyAsync(schoolCalendar: false);
        var leo = await off.AddMemberAsync("Leo Chen", withAccount: false);
        await ShouldBeChildNotAllowedAsync(await SaveTeamAsync(off, (leo.Id, true)));

        var on = await FamilyAsync(schoolCalendar: true);
        await ShouldBeChildNotAllowedAsync(await SaveTeamAsync(on, (on.ManagerRow.Id, true)));
    }

    [Fact]
    public async Task Add_a_child_by_name_adds_a_row_with_no_invitation()
    {
        // L2-060 AC2, AC5.
        var family = await FamilyAsync(schoolCalendar: true);
        var before = _factory.Emails.Sent.Count;

        var response = await family.SessionFor("Maya Chen").PostAsJsonAsync("/api/team/children", new { name = "  Leo Chen " });

        response.StatusCode.Should().Be(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        var child = await response.Content.ReadFromJsonAsync<JsonElement>();
        child.GetProperty("name").GetString().Should().Be("Leo Chen");
        child.GetProperty("invited").GetBoolean().Should().BeFalse();
        _factory.Emails.Sent.Count.Should().Be(before);
        var month = await MonthAsync(family.SessionFor("Maya Chen"));
        Row(month, "Leo Chen").GetProperty("isChild").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task Add_a_child_with_an_email_sends_an_invitation()
    {
        // L2-060 AC2, AC5.
        var family = await FamilyAsync(schoolCalendar: true);
        var email = $"ivy.{Guid.NewGuid():N}@chenhome.net";

        var response = await family.SessionFor("Maya Chen").PostAsJsonAsync("/api/team/children", new { name = "Ivy Chen", email });

        response.StatusCode.Should().Be(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("invited").GetBoolean().Should().BeTrue();
        _factory.Emails.To(email).Should().ContainSingle();
    }

    [Fact]
    public async Task Add_a_child_is_refused_while_off_for_a_blank_name_and_for_a_member()
    {
        // L2-060 AC2, AC7, AC8.
        var off = await FamilyAsync(schoolCalendar: false);
        await ShouldBeChildNotAllowedAsync(await off.SessionFor("Maya Chen").PostAsJsonAsync("/api/team/children", new { name = "Leo Chen" }));

        var on = await FamilyAsync(schoolCalendar: true);
        (await on.SessionFor("Maya Chen").PostAsJsonAsync("/api/team/children", new { name = " " })).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        await on.AddMemberAsync("Sam Chen");
        (await on.SessionFor("Sam Chen").PostAsJsonAsync("/api/team/children", new { name = "Leo Chen" })).StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task A_child_has_no_allowance_or_days_left_on_the_month_the_year_and_their_page()
    {
        // L2-060 AC3.
        var family = await FamilyAsync(schoolCalendar: true);
        var leo = await family.AddMemberAsync("Leo Chen", withAccount: false);
        await MarkChildAsync(leo.Id);
        var maya = family.SessionFor("Maya Chen");

        var row = Row(await MonthAsync(maya), "Leo Chen");
        row.GetProperty("daysLeft").ValueKind.Should().Be(JsonValueKind.Null);
        row.GetProperty("allowance").ValueKind.Should().Be(JsonValueKind.Null);
        Row(await MonthAsync(maya), "Maya Chen").GetProperty("allowance").ValueKind.Should().Be(JsonValueKind.Object);

        var year = await _factory.GetJsonAsync(maya, "/api/year?year=2026");
        var leoYear = year.GetProperty("members").EnumerateArray().Single(m => m.GetProperty("name").GetString() == "Leo Chen");
        leoYear.GetProperty("isChild").GetBoolean().Should().BeTrue();
        leoYear.GetProperty("allowance").ValueKind.Should().Be(JsonValueKind.Null);

        var person = await _factory.GetJsonAsync(maya, $"/api/people/{leo.Id}");
        person.GetProperty("isChild").GetBoolean().Should().BeTrue();
        person.GetProperty("allowance").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task Turning_the_school_calendar_off_hides_the_child_mark_and_keeps_it()
    {
        // L2-059 AC1, AC4, AC5.
        var family = await FamilyAsync(schoolCalendar: true);
        var leo = await family.AddMemberAsync("Leo Chen", withAccount: false);
        await MarkChildAsync(leo.Id);
        var maya = family.SessionFor("Maya Chen");

        (await maya.PutAsJsonAsync("/api/team/settings/school-calendar", new { schoolCalendar = false })).EnsureSuccessStatusCode();
        var off = Row(await MonthAsync(maya), "Leo Chen");
        off.GetProperty("isChild").GetBoolean().Should().BeFalse();
        off.GetProperty("allowance").ValueKind.Should().Be(JsonValueKind.Object);

        (await maya.PutAsJsonAsync("/api/team/settings/school-calendar", new { schoolCalendar = true })).EnsureSuccessStatusCode();
        Row(await MonthAsync(maya), "Leo Chen").GetProperty("isChild").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task Days_the_manager_marks_on_a_login_less_child_are_confirmed()
    {
        // L2-060 AC4: whichever status the manager painted.
        var family = await FamilyAsync(schoolCalendar: true);
        var leo = await family.AddMemberAsync("Leo Chen", withAccount: false);
        await MarkChildAsync(leo.Id);

        var response = await family.SessionFor("Maya Chen").PutAsJsonAsync("/api/sheet/days",
            new { memberId = leo.Id, dates = new[] { "2026-11-23", "2026-11-24" }, status = "Tentative" });

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.TimeOffDays.Where(d => d.TeamMemberId == leo.Id).Select(d => d.Status).ToListAsync())
            .Should().Equal(DayStatus.Confirmed, DayStatus.Confirmed);
    }

    [Fact]
    public async Task A_child_with_an_email_keeps_the_member_rules_for_days()
    {
        // L2-060 AC5: the manager's tentative paint stays tentative for a child who signs in.
        var family = await FamilyAsync(schoolCalendar: true);
        var ivy = await family.AddMemberAsync("Ivy Chen");
        await _factory.WriteAsync(db => db.TeamMembers.Single(m => m.Id == ivy.Id).Email = "ivy@chenhome.net");
        await MarkChildAsync(ivy.Id);

        var response = await family.SessionFor("Maya Chen").PutAsJsonAsync("/api/sheet/days",
            new { memberId = ivy.Id, dates = new[] { "2026-11-23" }, status = "Tentative" });

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.TimeOffDays.SingleAsync(d => d.TeamMemberId == ivy.Id)).Status.Should().Be(DayStatus.Tentative);
    }

    private async Task<TestTeam> FamilyAsync(bool schoolCalendar)
    {
        var family = await TestTeam.CreateAsync(_factory, "Maya Chen", teamName: "Chen family");
        await _factory.WriteAsync(db => db.Teams.Single(t => t.Id == family.Team.Id).SchoolCalendar = schoolCalendar);
        return family;
    }

    private Task MarkChildAsync(Guid memberId) =>
        _factory.WriteAsync(db => db.TeamMembers.Single(m => m.Id == memberId).IsChild = true);

    private static Task<HttpResponseMessage> SaveTeamAsync(TestTeam team, params (Guid Id, bool IsChild)[] children) =>
        team.SessionFor("Maya Chen").PutAsJsonAsync("/api/team/settings/team", new
        {
            name = team.Team.Name,
            timeZone = team.Team.TimeZone,
            members = children.Select(c => new
            {
                id = c.Id,
                role = c.Id == team.ManagerRow.Id ? "Manager" : "Member",
                yearlyDays = (int?)null,
                isChild = c.IsChild,
            }).ToArray(),
        });

    private static async Task ShouldBeChildNotAllowedAsync(HttpResponseMessage response)
    {
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest, await response.Content.ReadAsStringAsync());
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString().Should().Be("child_not_allowed");
    }

    private Task<JsonElement> MonthAsync(HttpClient client) => _factory.GetJsonAsync(client, "/api/sheet?month=2026-11");

    private static JsonElement Row(JsonElement month, string name) =>
        month.GetProperty("members").EnumerateArray().Single(m => m.GetProperty("name").GetString() == name);
}
