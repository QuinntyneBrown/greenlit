using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Sheet;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.WorkingDays;

/// <summary>
/// PUT /api/team/members/{id}/working-days (L2-040) and what it does to the sheet (L2-014 AC3).
/// Design: docs/detailed-designs/teams/working-days. Friday 6 and 13 November 2026.
/// </summary>
public class MemberWorkingDaysTests : IClassFixture<GreenlitApiFactory>
{
    private static readonly string[] MonToThu = ["Mon", "Tue", "Wed", "Thu"];
    private readonly GreenlitApiFactory _factory;

    public MemberWorkingDaysTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Fridays_are_red_on_the_part_timers_row_only()
    {
        // L2-040 AC3 and the journey: Dev works Mon-Thu, Ana is unchanged.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Dev Patel");

        var response = await SaveAsync(team, "Dev Patel", MonToThu);

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        var saved = await response.Content.ReadFromJsonAsync<JsonElement>();
        Names(saved.GetProperty("workingDays")).Should().Equal(MonToThu);
        var month = await MonthMembersTests.GetMonthAsync(team.ClientFor("Maya Chen"), "2026-11");
        Kind(month, "Dev Patel", "2026-11-06").Should().Be("NotWorking");
        Kind(month, "Dev Patel", "2026-11-13").Should().Be("NotWorking");
        Kind(month, "Dev Patel", "2026-11-05").Should().Be("Working");
        Kind(month, "Ana Ruiz", "2026-11-06").Should().Be("Working");
        Kind(month, "Maya Chen", "2026-11-06").Should().Be("Working");
    }

    [Fact]
    public async Task Each_row_carries_the_days_the_member_works()
    {
        // L2-040 AC1: the dialog says "Dev currently works Mon, Tue, Wed, Thu."
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Dev Patel");
        await SaveAsync(team, "Dev Patel", MonToThu);

        var month = await MonthMembersTests.GetMonthAsync(team.ClientFor("Maya Chen"), "2026-11");

        Names(Row(month, "Dev Patel").GetProperty("workingDays")).Should().Equal(MonToThu);
        Names(Row(month, "Ana Ruiz").GetProperty("workingDays")).Should().Equal("Mon", "Tue", "Wed", "Thu", "Fri");
    }

    [Fact]
    public async Task A_part_timer_is_not_counted_as_in_on_the_days_they_do_not_work()
    {
        // L2-014 AC3: a Friday when Dev works Mon-Thu counts Dev neither out nor in.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Dev Patel");
        await SaveAsync(team, "Dev Patel", MonToThu);

        var month = await MonthMembersTests.GetMonthAsync(team.ClientFor("Maya Chen"), "2026-11");

        var friday = month.GetProperty("coverage").EnumerateArray().Single(c => c.GetProperty("date").GetString() == "2026-11-06");
        friday.GetProperty("out").GetInt32().Should().Be(0);
        friday.GetProperty("in").GetInt32().Should().Be(2);
        var thursday = month.GetProperty("coverage").EnumerateArray().Single(c => c.GetProperty("date").GetString() == "2026-11-05");
        thursday.GetProperty("in").GetInt32().Should().Be(3);
    }

    [Fact]
    public async Task Sending_the_teams_days_clears_the_override_so_the_member_follows_the_team_again()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Dev Patel");
        await SaveAsync(team, "Dev Patel", MonToThu);

        await SaveAsync(team, "Dev Patel", ["Mon", "Tue", "Wed", "Thu", "Fri"]);
        await team.ClientFor("Maya Chen").PutAsJsonAsync("/api/team/settings/work-week", new { days = new[] { "Mon", "Tue", "Wed" } });

        var month = await MonthMembersTests.GetMonthAsync(team.ClientFor("Maya Chen"), "2026-11");
        Names(Row(month, "Dev Patel").GetProperty("workingDays")).Should().Equal("Mon", "Tue", "Wed");
        Kind(month, "Dev Patel", "2026-11-05").Should().Be("NotWorking");
    }

    [Fact]
    public async Task A_member_with_no_days_is_refused_and_nothing_is_saved()
    {
        // L2-040 AC2.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Dev Patel");

        var response = await SaveAsync(team, "Dev Patel", []);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("errors").GetProperty("Days")[0].GetString().Should().Be("Pick at least one working day.");
        var month = await MonthMembersTests.GetMonthAsync(team.ClientFor("Maya Chen"), "2026-11");
        Kind(month, "Dev Patel", "2026-11-06").Should().Be("Working");
    }

    [Fact]
    public async Task Only_the_manager_sets_working_days()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Dev Patel");

        var response = await team.ClientFor("Dev Patel").PutAsJsonAsync(
            $"/api/team/members/{team.MemberIdOf("Dev Patel")}/working-days", new { days = new[] { "Mon" } });

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task A_member_of_another_team_is_not_found()
    {
        var ours = await TestTeam.CreateAsync(_factory);
        var theirs = await TestTeam.CreateAsync(_factory, "Other Manager", teamName: "Other team");
        await theirs.AddMemberAsync("Dev Patel");

        var response = await ours.ClientFor("Maya Chen").PutAsJsonAsync(
            $"/api/team/members/{theirs.MemberIdOf("Dev Patel")}/working-days", new { days = new[] { "Mon" } });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        var month = await MonthMembersTests.GetMonthAsync(theirs.ClientFor("Other Manager"), "2026-11");
        Names(Row(month, "Dev Patel").GetProperty("workingDays")).Should().HaveCount(5);
    }

    private static Task<HttpResponseMessage> SaveAsync(TestTeam team, string member, string[] days) =>
        team.ClientFor("Maya Chen").PutAsJsonAsync($"/api/team/members/{team.MemberIdOf(member)}/working-days", new { days });

    private static string[] Names(JsonElement days) => days.EnumerateArray().Select(d => d.GetString()!).ToArray();

    private static JsonElement Row(JsonElement month, string member) =>
        month.GetProperty("members").EnumerateArray().Single(m => m.GetProperty("name").GetString() == member);

    private static string Kind(JsonElement month, string member, string date) =>
        Row(month, member).GetProperty("cells").EnumerateArray()
            .Single(c => c.GetProperty("date").GetString() == date)
            .GetProperty("kind").GetString()!;
}
