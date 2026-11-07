using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Domain.Enums;

namespace Greenlit.Api.Tests.Sheet;

/// <summary>
/// PUT /api/sheet/days and POST /api/sheet/days/restore: who may paint which days
/// (L2-015, L2-017) and Undo (L2-018 AC1). Design: docs/detailed-designs/sheet/mark-days.
/// November 2026: the 2nd is a Monday, the 7th and 8th a weekend.
/// </summary>
public class SetDaysTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public SetDaysTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Signed_out_callers_get_401()
    {
        var response = await _factory.CreateClient().PutAsJsonAsync("/api/sheet/days",
            new { memberId = Guid.NewGuid(), dates = new[] { "2026-11-23" }, status = "Tentative" });
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task A_member_paints_their_own_days_tentative()
    {
        // L2-015 AC3: the status is applied; journey 4: Ana paints 23-25 Nov.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var response = await SetAsync(team, "Ana Ruiz", "Ana Ruiz", ["2026-11-23", "2026-11-24", "2026-11-25"], "Tentative");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var set = await Json(response);
        set.GetProperty("memberName").GetString().Should().Be("Ana Ruiz");
        set.GetProperty("changes").EnumerateArray().Select(c => c.GetProperty("date").GetString())
            .Should().Equal("2026-11-23", "2026-11-24", "2026-11-25");
        set.GetProperty("changes")[0].GetProperty("previous").ValueKind.Should().Be(JsonValueKind.Null);
        set.GetProperty("changes")[0].GetProperty("current").GetString().Should().Be("Tentative");
        var month = await MonthAsync(team, "Ana Ruiz");
        KindOf(month, "Ana Ruiz", "2026-11-24").Should().Be("Tentative");
        KindOf(month, "Ana Ruiz", "2026-11-26").Should().Be("Working");
    }

    [Fact]
    public async Task A_member_can_ask_for_requested_days()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var response = await SetAsync(team, "Ana Ruiz", "Ana Ruiz", ["2026-11-16"], "Requested");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        KindOf(await MonthAsync(team, "Ana Ruiz"), "Ana Ruiz", "2026-11-16").Should().Be("Requested");
    }

    [Fact]
    public async Task The_manager_confirms_a_members_days()
    {
        // L2-017 AC5: the manager's change applies to any row.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 11, 23), DayStatus.Requested);

        var response = await SetAsync(team, "Maya Chen", "Ana Ruiz", ["2026-11-23", "2026-11-24"], "Confirmed");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var set = await Json(response);
        set.GetProperty("changes")[0].GetProperty("previous").GetString().Should().Be("Requested");
        var month = await MonthAsync(team, "Maya Chen");
        KindOf(month, "Ana Ruiz", "2026-11-23").Should().Be("Confirmed");
        KindOf(month, "Ana Ruiz", "2026-11-24").Should().Be("Confirmed");
    }

    [Fact]
    public async Task A_member_cannot_paint_another_members_row()
    {
        // L2-017 AC1.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Ben Okafor");

        var response = await SetAsync(team, "Ana Ruiz", "Ben Okafor", ["2026-11-23"], "Tentative");

        await AssertProblem(response, HttpStatusCode.Forbidden, "not_your_row");
        KindOf(await MonthAsync(team, "Maya Chen"), "Ben Okafor", "2026-11-23").Should().Be("Working");
    }

    [Fact]
    public async Task A_member_cannot_confirm_their_own_days()
    {
        // ADR-003: only the manager confirms.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var response = await SetAsync(team, "Ana Ruiz", "Ana Ruiz", ["2026-11-23"], "Confirmed");

        await AssertProblem(response, HttpStatusCode.Forbidden, "confirmed_locked");
        KindOf(await MonthAsync(team, "Ana Ruiz"), "Ana Ruiz", "2026-11-23").Should().Be("Working");
    }

    [Fact]
    public async Task A_member_cannot_change_their_own_confirmed_days()
    {
        // L2-017 AC2.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 11, 4), DayStatus.Confirmed);

        var response = await SetAsync(team, "Ana Ruiz", "Ana Ruiz", ["2026-11-04"], null);

        await AssertProblem(response, HttpStatusCode.Forbidden, "confirmed_locked");
        KindOf(await MonthAsync(team, "Ana Ruiz"), "Ana Ruiz", "2026-11-04").Should().Be("Confirmed");
    }

    [Fact]
    public async Task A_stroke_over_confirmed_and_open_days_changes_only_the_open_ones()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 11, 4), DayStatus.Confirmed);

        var response = await SetAsync(team, "Ana Ruiz", "Ana Ruiz", ["2026-11-03", "2026-11-04", "2026-11-05"], "Tentative");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var month = await MonthAsync(team, "Ana Ruiz");
        KindOf(month, "Ana Ruiz", "2026-11-03").Should().Be("Tentative");
        KindOf(month, "Ana Ruiz", "2026-11-04").Should().Be("Confirmed");
        KindOf(month, "Ana Ruiz", "2026-11-05").Should().Be("Tentative");
    }

    [Fact]
    public async Task A_stroke_of_only_weekend_days_changes_nothing()
    {
        // L2-017 AC3.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var response = await SetAsync(team, "Ana Ruiz", "Ana Ruiz", ["2026-11-07", "2026-11-08"], "Tentative");

        await AssertProblem(response, HttpStatusCode.BadRequest, "all_non_working");
        KindOf(await MonthAsync(team, "Ana Ruiz"), "Ana Ruiz", "2026-11-07").Should().Be("NotWorking");
    }

    [Fact]
    public async Task A_stroke_on_a_holiday_is_rejected_as_a_holiday()
    {
        // ADR-003: a member cannot hold a day on a holiday.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddHolidayAsync(new DateOnly(2026, 12, 25), "Christmas Day");

        var response = await SetAsync(team, "Ana Ruiz", "Ana Ruiz", ["2026-12-25"], "Tentative");

        await AssertProblem(response, HttpStatusCode.BadRequest, "day_is_holiday");
        KindOf(await MonthAsync(team, "Ana Ruiz", "2026-12"), "Ana Ruiz", "2026-12-25").Should().Be("Holiday");
    }

    [Fact]
    public async Task A_stroke_that_mixes_working_and_non_working_days_changes_only_the_working_ones()
    {
        // L2-017 AC4: Friday 6 to Monday 9 November.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var response = await SetAsync(team, "Ana Ruiz", "Ana Ruiz", ["2026-11-06", "2026-11-07", "2026-11-08", "2026-11-09"], "Tentative");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await Json(response)).GetProperty("changes").GetArrayLength().Should().Be(2);
        var month = await MonthAsync(team, "Ana Ruiz");
        KindOf(month, "Ana Ruiz", "2026-11-06").Should().Be("Tentative");
        KindOf(month, "Ana Ruiz", "2026-11-07").Should().Be("NotWorking");
        KindOf(month, "Ana Ruiz", "2026-11-09").Should().Be("Tentative");
    }

    [Fact]
    public async Task Clearing_returns_days_to_working_days()
    {
        // L2-015 AC6: no day is stored.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 11, 16), DayStatus.Requested);

        var response = await SetAsync(team, "Ana Ruiz", "Ana Ruiz", ["2026-11-16"], null);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var change = (await Json(response)).GetProperty("changes")[0];
        change.GetProperty("previous").GetString().Should().Be("Requested");
        change.GetProperty("current").ValueKind.Should().Be(JsonValueKind.Null);
        KindOf(await MonthAsync(team, "Ana Ruiz"), "Ana Ruiz", "2026-11-16").Should().Be("Working");
    }

    [Fact]
    public async Task Days_already_at_the_status_are_not_changes()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 11, 16), DayStatus.Tentative);

        var response = await SetAsync(team, "Ana Ruiz", "Ana Ruiz", ["2026-11-16", "2026-11-17"], "Tentative");

        var changes = (await Json(response)).GetProperty("changes");
        changes.GetArrayLength().Should().Be(1);
        changes[0].GetProperty("date").GetString().Should().Be("2026-11-17");
    }

    [Fact]
    public async Task A_row_of_another_team_is_not_found()
    {
        var team = await TestTeam.CreateAsync(_factory);
        var other = await TestTeam.CreateAsync(_factory, "Olu Bello");
        await other.AddMemberAsync("Pia Rossi");

        var response = await team.ClientFor("Maya Chen").PutAsJsonAsync("/api/sheet/days",
            new { memberId = other.MemberIdOf("Pia Rossi"), dates = new[] { "2026-11-23" }, status = "Confirmed" });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        KindOf(await MonthAsync(other, "Olu Bello"), "Pia Rossi", "2026-11-23").Should().Be("Working");
    }

    [Fact]
    public async Task A_stroke_needs_dates_and_a_known_status()
    {
        var team = await TestTeam.CreateAsync(_factory);
        var maya = team.ClientFor("Maya Chen");
        var id = team.MemberIdOf("Maya Chen");

        (await maya.PutAsJsonAsync("/api/sheet/days", new { memberId = id, dates = Array.Empty<string>(), status = "Tentative" }))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await maya.PutAsJsonAsync("/api/sheet/days", new { memberId = id, dates = new[] { "2026-11-23" }, status = "Sick" }))
            .StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Restore_puts_the_previous_statuses_back()
    {
        // L2-018 AC1: Undo restores each day, including days that were blank.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 11, 16), DayStatus.Requested);
        await SetAsync(team, "Ana Ruiz", "Ana Ruiz", ["2026-11-16", "2026-11-17"], "Tentative");

        var response = await team.ClientFor("Ana Ruiz").PostAsJsonAsync("/api/sheet/days/restore", new
        {
            memberId = team.MemberIdOf("Ana Ruiz"),
            days = new object[]
            {
                new { date = "2026-11-16", status = "Requested" },
                new { date = "2026-11-17", status = (string?)null },
            },
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var month = await MonthAsync(team, "Ana Ruiz");
        KindOf(month, "Ana Ruiz", "2026-11-16").Should().Be("Requested");
        KindOf(month, "Ana Ruiz", "2026-11-17").Should().Be("Working");
    }

    [Fact]
    public async Task Restore_passes_the_same_policy_as_a_change()
    {
        // The manager confirmed a day after the member's change: the member's Undo cannot move it.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 11, 16), DayStatus.Confirmed);

        var response = await team.ClientFor("Ana Ruiz").PostAsJsonAsync("/api/sheet/days/restore", new
        {
            memberId = team.MemberIdOf("Ana Ruiz"),
            days = new object[] { new { date = "2026-11-16", status = (string?)null } },
        });

        await AssertProblem(response, HttpStatusCode.Forbidden, "confirmed_locked");
        KindOf(await MonthAsync(team, "Ana Ruiz"), "Ana Ruiz", "2026-11-16").Should().Be("Confirmed");
    }

    [Fact]
    public async Task The_month_names_the_manager()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var month = await MonthAsync(team, "Ana Ruiz");

        month.GetProperty("managerName").GetString().Should().Be("Maya Chen");
    }

    private static Task<HttpResponseMessage> SetAsync(TestTeam team, string caller, string member, string[] dates, string? status) =>
        team.ClientFor(caller).PutAsJsonAsync("/api/sheet/days", new { memberId = team.MemberIdOf(member), dates, status });

    private static Task<JsonElement> MonthAsync(TestTeam team, string caller, string month = "2026-11") =>
        MonthMembersTests.GetMonthAsync(team.ClientFor(caller), month);

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private static async Task AssertProblem(HttpResponseMessage response, HttpStatusCode status, string code)
    {
        response.StatusCode.Should().Be(status);
        (await Json(response)).GetProperty("code").GetString().Should().Be(code);
    }

    private static string? KindOf(JsonElement month, string member, string date) =>
        month.GetProperty("members").EnumerateArray()
            .Single(m => m.GetProperty("name").GetString() == member)
            .GetProperty("cells").EnumerateArray()
            .Single(c => c.GetProperty("date").GetString() == date)
            .GetProperty("kind").GetString();
}
