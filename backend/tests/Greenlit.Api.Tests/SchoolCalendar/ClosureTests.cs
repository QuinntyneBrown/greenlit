using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.SchoolCalendar;

// Acceptance Test
// Traces to: L2-061 AC1, AC2, AC4, AC5, AC6; L2-059 AC1, AC4, AC5
// Description: the manager adds, edits and deletes school closures on one child or all children; members read them;
//              a closure is on the month for children only and counts in no figure; turning the setting off hides them.

/// <summary>/api/team/closures (docs/detailed-designs/teams/school-calendar, ADR-015).</summary>
public class ClosureTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public ClosureTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task The_manager_adds_a_closure_for_all_children_and_everyone_on_the_team_reads_it()
    {
        // L2-061 AC1, AC5.
        var (family, _, _) = await FamilyAsync();

        var response = await family.SessionFor("Maya Chen").PostAsJsonAsync("/api/team/closures",
            new { label = " PA day ", firstDay = "2026-11-20", lastDay = "2026-11-20", memberId = (Guid?)null });

        response.StatusCode.Should().Be(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        var closure = await response.Content.ReadFromJsonAsync<JsonElement>();
        closure.GetProperty("label").GetString().Should().Be("PA day");
        closure.GetProperty("memberId").ValueKind.Should().Be(JsonValueKind.Null);
        closure.GetProperty("imported").GetBoolean().Should().BeFalse();
        var asSam = await _factory.GetJsonAsync(family.SessionFor("Sam Chen"), "/api/team/closures");
        asSam.EnumerateArray().Select(c => c.GetProperty("label").GetString()).Should().Equal("PA day");
    }

    [Fact]
    public async Task A_closure_is_on_the_month_and_counts_in_no_figure()
    {
        // L2-061 AC4, AC5 (L2-014): the Out row and days left are as they were.
        var (family, leo, _) = await FamilyAsync();
        var maya = family.SessionFor("Maya Chen");
        var before = await MonthAsync(maya);

        await AddAsync(maya, "Parent-teacher day", "2026-11-26", "2026-11-26", leo);
        var month = await MonthAsync(maya);

        var closures = month.GetProperty("closures").EnumerateArray().ToList();
        closures.Should().ContainSingle();
        closures[0].GetProperty("memberId").GetGuid().Should().Be(leo);
        Coverage(month, "2026-11-26").Should().Be(Coverage(before, "2026-11-26"));
        DaysLeft(month, "Sam Chen").Should().Be(DaysLeft(before, "Sam Chen"));
    }

    [Fact]
    public async Task An_empty_label_a_reversed_range_or_an_overlong_range_is_refused()
    {
        // L2-061 AC2.
        var (family, _, _) = await FamilyAsync();
        var maya = family.SessionFor("Maya Chen");

        var bad = await maya.PostAsJsonAsync("/api/team/closures", new { label = " ", firstDay = "2026-11-20", lastDay = "2026-11-19" });
        bad.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var body = await bad.Content.ReadAsStringAsync();
        var errors = JsonDocument.Parse(body).RootElement.GetProperty("errors");
        errors.TryGetProperty("LastDay", out _).Should().BeTrue(body);
        errors.GetProperty("Label")[0].GetString().Should().Be("Enter a name for the closure.");
        errors.GetProperty("LastDay")[0].GetString().Should().Be("The last day can't be before the first.");

        var tooLong = await maya.PostAsJsonAsync("/api/team/closures", new { label = "Year off", firstDay = "2026-01-01", lastDay = "2027-01-05" });
        tooLong.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task A_closure_is_for_a_child_of_this_team_with_the_school_calendar_on()
    {
        // L2-061 AC1, L2-060 AC8.
        var (family, _, sam) = await FamilyAsync();
        var maya = family.SessionFor("Maya Chen");

        await ShouldBeChildNotAllowedAsync(await maya.PostAsJsonAsync("/api/team/closures",
            new { label = "PA day", firstDay = "2026-11-20", lastDay = "2026-11-20", memberId = sam }));

        (await maya.PutAsJsonAsync("/api/team/settings/school-calendar", new { schoolCalendar = false })).EnsureSuccessStatusCode();
        await ShouldBeChildNotAllowedAsync(await maya.PostAsJsonAsync("/api/team/closures",
            new { label = "PA day", firstDay = "2026-11-20", lastDay = "2026-11-20" }));
    }

    [Fact]
    public async Task A_member_reads_closures_but_cannot_change_them()
    {
        // L2-061 AC5, L2-060 AC7.
        var (family, _, _) = await FamilyAsync();
        var id = await AddAsync(family.SessionFor("Maya Chen"), "PA day", "2026-11-20", "2026-11-20", null);
        var sam = family.SessionFor("Sam Chen");

        (await sam.PostAsJsonAsync("/api/team/closures", new { label = "x", firstDay = "2026-11-20", lastDay = "2026-11-20" })).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await sam.PutAsJsonAsync($"/api/team/closures/{id}", new { label = "x", firstDay = "2026-11-20", lastDay = "2026-11-20" })).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await sam.DeleteAsync($"/api/team/closures/{id}")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task The_manager_edits_and_deletes_a_closure()
    {
        // L2-061 AC6.
        var (family, leo, _) = await FamilyAsync();
        var maya = family.SessionFor("Maya Chen");
        var id = await AddAsync(maya, "PA day", "2026-11-20", "2026-11-20", null);

        var edited = await maya.PutAsJsonAsync($"/api/team/closures/{id}",
            new { label = "Fall break", firstDay = "2026-11-23", lastDay = "2026-11-24", memberId = leo });

        edited.StatusCode.Should().Be(HttpStatusCode.OK, await edited.Content.ReadAsStringAsync());
        var closure = await edited.Content.ReadFromJsonAsync<JsonElement>();
        closure.GetProperty("label").GetString().Should().Be("Fall break");
        closure.GetProperty("lastDay").GetString().Should().Be("2026-11-24");
        closure.GetProperty("memberId").GetGuid().Should().Be(leo);

        (await maya.DeleteAsync($"/api/team/closures/{id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await _factory.GetJsonAsync(maya, "/api/team/closures")).GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task Another_teams_closure_is_not_found()
    {
        var (family, _, _) = await FamilyAsync();
        var id = await AddAsync(family.SessionFor("Maya Chen"), "PA day", "2026-11-20", "2026-11-20", null);
        var (other, _, _) = await FamilyAsync();

        (await other.SessionFor("Maya Chen").DeleteAsync($"/api/team/closures/{id}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Turning_the_school_calendar_off_hides_closures_and_on_again_shows_them()
    {
        // L2-059 AC4, AC5.
        var (family, _, _) = await FamilyAsync();
        var maya = family.SessionFor("Maya Chen");
        await AddAsync(maya, "PA day", "2026-11-20", "2026-11-20", null);

        (await maya.PutAsJsonAsync("/api/team/settings/school-calendar", new { schoolCalendar = false })).EnsureSuccessStatusCode();
        (await _factory.GetJsonAsync(maya, "/api/team/closures")).GetArrayLength().Should().Be(0);
        (await MonthAsync(maya)).GetProperty("closures").GetArrayLength().Should().Be(0);

        (await maya.PutAsJsonAsync("/api/team/settings/school-calendar", new { schoolCalendar = true })).EnsureSuccessStatusCode();
        (await MonthAsync(maya)).GetProperty("closures").GetArrayLength().Should().Be(1);
    }

    /// <summary>Chen family with the school calendar on: Maya manages, Sam is a member, Leo is a child with no email.</summary>
    private async Task<(TestTeam Family, Guid Leo, Guid Sam)> FamilyAsync()
    {
        var family = await TestTeam.CreateAsync(_factory, "Maya Chen", teamName: "Chen family");
        await _factory.WriteAsync(db => db.Teams.Single(t => t.Id == family.Team.Id).SchoolCalendar = true);
        var sam = await family.AddMemberAsync("Sam Chen");
        var leo = await family.AddMemberAsync("Leo Chen", withAccount: false);
        await _factory.WriteAsync(db => db.TeamMembers.Single(m => m.Id == leo.Id).IsChild = true);
        return (family, leo.Id, sam.Id);
    }

    private static async Task<Guid> AddAsync(HttpClient client, string label, string first, string last, Guid? memberId)
    {
        var response = await client.PostAsJsonAsync("/api/team/closures", new { label, firstDay = first, lastDay = last, memberId });
        response.StatusCode.Should().Be(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        return (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("id").GetGuid();
    }

    private static async Task ShouldBeChildNotAllowedAsync(HttpResponseMessage response)
    {
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest, await response.Content.ReadAsStringAsync());
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString().Should().Be("child_not_allowed");
    }

    private Task<JsonElement> MonthAsync(HttpClient client) => _factory.GetJsonAsync(client, "/api/sheet?month=2026-11");

    private static int Coverage(JsonElement month, string date) =>
        month.GetProperty("coverage").EnumerateArray().Single(c => c.GetProperty("date").GetString() == date).GetProperty("out").GetInt32();

    private static int DaysLeft(JsonElement month, string name) =>
        month.GetProperty("members").EnumerateArray().Single(m => m.GetProperty("name").GetString() == name).GetProperty("daysLeft").GetInt32();
}
