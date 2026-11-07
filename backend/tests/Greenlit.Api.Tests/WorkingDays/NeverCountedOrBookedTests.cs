using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Sheet;
using Greenlit.Api.Tests.Support;
using Greenlit.Domain.Enums;

namespace Greenlit.Api.Tests.WorkingDays;

/// <summary>
/// Non-working days are never bookable and never counted (teams/working-days, L2-039 AC2, L2-040 AC3).
/// "Today" is Friday 6 November 2026; Dev works Mon-Thu, so Friday 13 and 20 November are Dev's off days.
/// </summary>
public class NeverCountedOrBookedTests : IClassFixture<FrozenClockApiFactory>
{
    private static readonly string[] MonToThu = ["Mon", "Tue", "Wed", "Thu"];
    private readonly FrozenClockApiFactory _factory;

    public NeverCountedOrBookedTests(FrozenClockApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Dev_cannot_paint_a_Friday()
    {
        var team = await TeamWithPartTimerAsync();

        var response = await PaintAsync(team, "Dev Patel", ["2026-11-13"]);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await Json(response)).GetProperty("code").GetString().Should().Be("all_non_working");
        Kind(await MonthAsync(team), "Dev Patel", "2026-11-13").Should().Be("NotWorking");
    }

    [Fact]
    public async Task A_stroke_across_a_working_and_a_non_working_day_changes_only_the_working_one()
    {
        var team = await TeamWithPartTimerAsync();

        var response = await PaintAsync(team, "Dev Patel", ["2026-11-12", "2026-11-13"]);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var changes = (await Json(response)).GetProperty("changes").EnumerateArray().Select(c => c.GetProperty("date").GetString());
        changes.Should().Equal("2026-11-12");
    }

    [Fact]
    public async Task Ana_can_still_paint_a_Friday()
    {
        var team = await TeamWithPartTimerAsync();

        (await PaintAsync(team, "Ana Ruiz", ["2026-11-13"])).StatusCode.Should().Be(HttpStatusCode.OK);
        Kind(await MonthAsync(team), "Ana Ruiz", "2026-11-13").Should().Be("Tentative");
    }

    [Fact]
    public async Task Nobody_can_paint_a_day_the_team_does_not_work()
    {
        var team = await TeamWithPartTimerAsync();
        await team.ClientFor("Maya Chen").PutAsJsonAsync("/api/team/settings/work-week", new { days = new[] { "Mon", "Tue", "Wed", "Thu" } });

        var response = await PaintAsync(team, "Ana Ruiz", ["2026-11-13"]);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await Json(response)).GetProperty("code").GetString().Should().Be("all_non_working");
    }

    [Fact]
    public async Task Days_stored_on_a_day_the_member_does_not_work_count_in_no_figure()
    {
        // L2-040 AC3: not counted against allowance. Dev has 20 days; Thu 19 is booked, Fri 20 is stored but red.
        var team = await TeamWithPartTimerAsync();
        await team.SetYearlyDaysAsync("Dev Patel", 20);
        await team.SetDayAsync("Dev Patel", new DateOnly(2026, 11, 19), DayStatus.Confirmed);
        await team.SetDayAsync("Dev Patel", new DateOnly(2026, 11, 20), DayStatus.Confirmed);
        await team.SetDayAsync("Dev Patel", new DateOnly(2026, 11, 27), DayStatus.Requested);

        var dev = Row(await MonthAsync(team), "Dev Patel");

        var allowance = dev.GetProperty("allowance");
        allowance.GetProperty("booked").GetInt32().Should().Be(1);
        allowance.GetProperty("requested").GetInt32().Should().Be(0);
        allowance.GetProperty("left").GetInt32().Should().Be(19);
    }

    [Fact]
    public async Task A_stored_day_on_an_off_day_is_not_out_on_the_out_row()
    {
        var team = await TeamWithPartTimerAsync();
        await team.SetDayAsync("Dev Patel", new DateOnly(2026, 11, 20), DayStatus.Confirmed);

        var friday = (await MonthAsync(team)).GetProperty("coverage").EnumerateArray()
            .Single(c => c.GetProperty("date").GetString() == "2026-11-20");

        friday.GetProperty("out").GetInt32().Should().Be(0);
        friday.GetProperty("in").GetInt32().Should().Be(2);
    }

    [Fact]
    public async Task A_request_counts_only_the_days_the_member_works()
    {
        // Dev asks for Mon 16 to Fri 20: four days, the Friday is not requested.
        var team = await TeamWithPartTimerAsync();

        var quote = await team.ClientFor("Dev Patel").GetAsync("/api/requests/quote?first=2026-11-16&last=2026-11-20");
        (await Json(quote)).GetProperty("days").GetInt32().Should().Be(4);

        var sent = await team.ClientFor("Dev Patel").PostAsJsonAsync("/api/requests", new { firstDay = "2026-11-16", lastDay = "2026-11-20" });
        sent.StatusCode.Should().Be(HttpStatusCode.Created, await sent.Content.ReadAsStringAsync());
        (await Json(sent)).GetProperty("days").GetInt32().Should().Be(4);
        var month = await MonthAsync(team);
        Kind(month, "Dev Patel", "2026-11-19").Should().Be("Requested");
        Kind(month, "Dev Patel", "2026-11-20").Should().Be("NotWorking");
    }

    [Fact]
    public async Task A_request_of_only_off_days_is_refused()
    {
        var team = await TeamWithPartTimerAsync();

        var sent = await team.ClientFor("Dev Patel").PostAsJsonAsync("/api/requests", new { firstDay = "2026-11-20", lastDay = "2026-11-20" });

        sent.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await Json(sent)).GetProperty("code").GetString().Should().Be("all_non_working");
    }

    private async Task<TestTeam> TeamWithPartTimerAsync()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Dev Patel");
        var saved = await team.ClientFor("Maya Chen").PutAsJsonAsync(
            $"/api/team/members/{team.MemberIdOf("Dev Patel")}/working-days", new { days = MonToThu });
        saved.StatusCode.Should().Be(HttpStatusCode.OK);
        return team;
    }

    private static Task<HttpResponseMessage> PaintAsync(TestTeam team, string member, string[] dates) =>
        team.ClientFor(member).PutAsJsonAsync("/api/sheet/days", new { memberId = team.MemberIdOf(member), dates, status = "Tentative" });

    private static Task<JsonElement> MonthAsync(TestTeam team) =>
        MonthMembersTests.GetMonthAsync(team.ClientFor("Maya Chen"), "2026-11");

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private static JsonElement Row(JsonElement month, string member) =>
        month.GetProperty("members").EnumerateArray().Single(m => m.GetProperty("name").GetString() == member);

    private static string Kind(JsonElement month, string member, string date) =>
        Row(month, member).GetProperty("cells").EnumerateArray()
            .Single(c => c.GetProperty("date").GetString() == date).GetProperty("kind").GetString()!;
}
