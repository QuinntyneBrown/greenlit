using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.SchoolCalendar;

// Acceptance Test
// Traces to: L2-062 AC1, AC2, AC3, AC4, AC5, AC6, AC7
// Description: the manager uploads a school's .ics file for one child; its all-day events become that child's
//              closures; a re-import replaces only that child's earlier import; anything unreadable changes nothing.

/// <summary>POST /api/team/children/{id}/calendar (docs/detailed-designs/teams/school-calendar, ADR-015).</summary>
public class ImportCalendarTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public ImportCalendarTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Each_all_day_event_becomes_a_closure_of_the_child()
    {
        // L2-062 AC1: titles as labels, DTEND exclusive; timed and repeating events left out.
        var (family, leo, _) = await FamilyAsync();
        var file = Ics.Calendar(
            Ics.AllDay("PA day", "2026-11-20"),
            Ics.AllDay("Winter break", "2026-12-21", "2027-01-01"),
            Ics.AllDay("Remembrance\\, assembly", "2026-11-11"),
            Ics.Timed("Concert", "2026-12-10"),
            Ics.Repeating("Library day", "2026-11-04"));

        var response = await ImportAsync(family, leo, file);

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("imported").GetInt32().Should().Be(3);
        var closures = await ClosuresAsync(family);
        closures.Select(c => (c.Label, c.FirstDay, c.LastDay, c.MemberId, c.Imported)).Should().Equal(
            ("Remembrance, assembly", "2026-11-11", "2026-11-11", leo, true),
            ("PA day", "2026-11-20", "2026-11-20", leo, true),
            ("Winter break", "2026-12-21", "2027-01-01", leo, true));
    }

    [Fact]
    public async Task A_folded_summary_line_is_read_whole()
    {
        var (family, leo, _) = await FamilyAsync();
        var file = Ics.Calendar("BEGIN:VEVENT\r\nSUMMARY:Professional\r\n  development day\r\nDTSTART;VALUE=DATE:20261116\r\nEND:VEVENT\r\n");

        (await ImportAsync(family, leo, file)).StatusCode.Should().Be(HttpStatusCode.OK);

        var closure = (await ClosuresAsync(family)).Single();
        (closure.Label, closure.FirstDay, closure.LastDay, closure.MemberId).Should().Be(("Professional development day", "2026-11-16", "2026-11-16", (Guid?)leo));
    }

    [Fact]
    public async Task A_re_import_replaces_only_that_childs_earlier_import()
    {
        // L2-062 AC2, AC3, AC4: typed closures, all-children closures and the other child's import stay.
        var (family, leo, ivy) = await FamilyAsync();
        await ImportAsync(family, leo, Ics.Calendar(Ics.AllDay("Old PA day", "2026-11-13"), Ics.AllDay("Old break", "2026-12-21")));
        await ImportAsync(family, ivy, Ics.Calendar(Ics.AllDay("Ivy's PA day", "2026-11-27")));
        await AddAsync(family, "Parent-teacher day", "2026-11-26", leo);
        await AddAsync(family, "PA day", "2026-11-20", null);

        var response = await ImportAsync(family, leo, Ics.Calendar(Ics.AllDay("New PA day", "2026-11-30")));

        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("imported").GetInt32().Should().Be(1);
        (await ClosuresAsync(family)).Select(c => c.Label).Should().Equal("PA day", "Parent-teacher day", "Ivy's PA day", "New PA day");
    }

    [Fact]
    public async Task An_imported_closure_the_manager_edited_is_kept_by_a_re_import()
    {
        // L2-062 AC3, AC6.
        var (family, leo, _) = await FamilyAsync();
        await ImportAsync(family, leo, Ics.Calendar(Ics.AllDay("PA day", "2026-11-20")));
        var id = (await ClosuresAsync(family)).Single().Id;
        (await family.SessionFor("Maya Chen").PutAsJsonAsync($"/api/team/closures/{id}",
            new { label = "PA day (no school)", firstDay = "2026-11-20", lastDay = "2026-11-20", memberId = leo })).EnsureSuccessStatusCode();

        await ImportAsync(family, leo, Ics.Calendar(Ics.AllDay("Winter break", "2026-12-21")));

        (await ClosuresAsync(family)).Select(c => (c.Label, c.Imported)).Should().Equal(("PA day (no school)", false), ("Winter break", true));
    }

    [Theory]
    [InlineData("This is a newsletter, not a calendar.")]
    [InlineData("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n")]
    public async Task A_file_that_is_not_a_readable_calendar_changes_nothing(string text)
    {
        // L2-062 AC5: not a calendar, or a calendar with no all-day event.
        var (family, leo, _) = await FamilyAsync();
        await ImportAsync(family, leo, Ics.Calendar(Ics.AllDay("PA day", "2026-11-20")));

        await ShouldBeUnreadableAsync(await ImportAsync(family, leo, text));

        (await ClosuresAsync(family)).Select(c => c.Label).Should().Equal("PA day");
    }

    [Fact]
    public async Task A_calendar_of_more_than_500_events_or_more_than_1_MB_is_refused()
    {
        // L2-062 AC5, ADR-015 limits.
        var (family, leo, _) = await FamilyAsync();
        var many = Ics.Calendar(Enumerable.Range(0, 501).Select(i => Ics.AllDay($"Day {i}", "2026-11-20")).ToArray());
        await ShouldBeUnreadableAsync(await ImportAsync(family, leo, many));

        var huge = Ics.Calendar(Ics.AllDay("PA day", "2026-11-20")) + new string(' ', 1_048_577);
        await ShouldBeUnreadableAsync(await ImportAsync(family, leo, huge));
        (await ClosuresAsync(family)).Should().BeEmpty();
    }

    [Fact]
    public async Task Only_the_manager_imports_and_only_for_a_child()
    {
        // L2-062 AC7, L2-060 AC7, AC8.
        var (family, leo, _) = await FamilyAsync();
        var file = Ics.Calendar(Ics.AllDay("PA day", "2026-11-20"));

        (await family.SessionFor("Sam Chen").PostAsync($"/api/team/children/{leo}/calendar", Ics.Upload(file))).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var notAChild = family.MemberIdOf("Sam Chen");
        var response = await ImportAsync(family, notAChild, file);
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString().Should().Be("child_not_allowed");
    }

    private async Task<(TestTeam Family, Guid Leo, Guid Ivy)> FamilyAsync()
    {
        var family = await TestTeam.CreateAsync(_factory, "Maya Chen", teamName: "Chen family");
        await _factory.WriteAsync(db => db.Teams.Single(t => t.Id == family.Team.Id).SchoolCalendar = true);
        await family.AddMemberAsync("Sam Chen");
        var leo = await family.AddMemberAsync("Leo Chen", withAccount: false);
        var ivy = await family.AddMemberAsync("Ivy Chen", withAccount: false);
        await _factory.WriteAsync(db =>
        {
            db.TeamMembers.Single(m => m.Id == leo.Id).IsChild = true;
            db.TeamMembers.Single(m => m.Id == ivy.Id).IsChild = true;
        });
        return (family, leo.Id, ivy.Id);
    }

    private static Task<HttpResponseMessage> ImportAsync(TestTeam family, Guid memberId, string text) =>
        family.SessionFor("Maya Chen").PostAsync($"/api/team/children/{memberId}/calendar", Ics.Upload(text));

    private static async Task AddAsync(TestTeam family, string label, string day, Guid? memberId) =>
        (await family.SessionFor("Maya Chen").PostAsJsonAsync("/api/team/closures", new { label, firstDay = day, lastDay = day, memberId })).EnsureSuccessStatusCode();

    private async Task<List<Closure>> ClosuresAsync(TestTeam family)
    {
        var json = await _factory.GetJsonAsync(family.SessionFor("Maya Chen"), "/api/team/closures");
        return json.EnumerateArray().Select(c => new Closure(
            c.GetProperty("label").GetString()!,
            c.GetProperty("firstDay").GetString()!,
            c.GetProperty("lastDay").GetString()!,
            c.GetProperty("memberId").ValueKind == JsonValueKind.Null ? null : c.GetProperty("memberId").GetGuid(),
            c.GetProperty("imported").GetBoolean()) { Id = c.GetProperty("id").GetGuid() }).ToList();
    }

    private static async Task ShouldBeUnreadableAsync(HttpResponseMessage response)
    {
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest, await response.Content.ReadAsStringAsync());
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString().Should().Be("calendar_unreadable");
    }

    private sealed record Closure(string Label, string FirstDay, string LastDay, Guid? MemberId, bool Imported)
    {
        public Guid Id { get; init; }
    }
}
