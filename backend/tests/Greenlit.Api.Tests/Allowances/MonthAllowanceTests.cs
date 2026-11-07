using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Domain.Enums;

namespace Greenlit.Api.Tests.Allowances;

/// <summary>
/// The allowance figures on GET /api/sheet (L2-029, L2-014 AC1, L2-027 AC3). Design:
/// docs/detailed-designs/allowances/allowance-figures. "Today" is Friday 6 November 2026.
/// </summary>
public class MonthAllowanceTests : IClassFixture<FrozenClockApiFactory>
{
    private readonly FrozenClockApiFactory _factory;

    public MonthAllowanceTests(FrozenClockApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Ana_has_28_days_of_which_17_are_used_2_booked_5_requested_and_3_tentative_leaving_9()
    {
        // L2-029 AC1-4: Allowance 25 + 3 adjustments; Used before today, Booked from today; Left = 28 - 17 - 2.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.SetYearlyDaysAsync("Ana Ruiz", 25);
        await team.AddAdjustmentAsync("Ana Ruiz", 3, new DateOnly(2026, 1, 1));
        foreach (var day in AnaConfirmedBeforeToday()) await team.SetDayAsync("Ana Ruiz", day, DayStatus.Confirmed);
        await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 11, 6), DayStatus.Confirmed);
        await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 12, 1), DayStatus.Confirmed);
        foreach (var day in Days(2026, 11, 16, 20)) await team.SetDayAsync("Ana Ruiz", day, DayStatus.Requested);
        foreach (var day in Days(2026, 12, 29, 31)) await team.SetDayAsync("Ana Ruiz", day, DayStatus.Tentative);

        var ana = Row(await MonthAsync(team.ClientFor("Maya Chen")), "Ana Ruiz");

        Figure(ana, "yearlyDays").Should().Be(25);
        Figure(ana, "adjustments").Should().Be(3);
        Figure(ana, "allowance").Should().Be(28);
        Figure(ana, "used").Should().Be(17);
        Figure(ana, "booked").Should().Be(2);
        Figure(ana, "requested").Should().Be(5);
        Figure(ana, "tentative").Should().Be(3);
        Figure(ana, "left").Should().Be(9);
        DaysLeft(ana).Should().Be(9);
    }

    [Fact]
    public async Task A_member_without_yearly_days_uses_the_team_default_and_one_with_their_own_keeps_it()
    {
        // L2-027 AC3 and L2-029 AC1.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Dev Patel");
        await team.SetDefaultsAsync(yearlyDays: 30);
        await team.SetYearlyDaysAsync("Dev Patel", 20);

        var month = await MonthAsync(team.ClientFor("Maya Chen"));

        DaysLeft(Row(month, "Ana Ruiz")).Should().Be(30);
        DaysLeft(Row(month, "Dev Patel")).Should().Be(20);
    }

    [Fact]
    public async Task Requested_and_tentative_days_do_not_reduce_days_left()
    {
        // L2-029 AC3-4: Left = Allowance - Used - Booked, so pending and tentative days only show in their own figures.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Cleo Park");
        await team.SetYearlyDaysAsync("Cleo Park", 25);
        await team.SetDayAsync("Cleo Park", new DateOnly(2026, 11, 12), DayStatus.Requested);
        await team.SetDayAsync("Cleo Park", new DateOnly(2026, 11, 13), DayStatus.Requested);
        await team.SetDayAsync("Cleo Park", new DateOnly(2026, 11, 20), DayStatus.Tentative);

        var cleo = Row(await MonthAsync(team.ClientFor("Maya Chen")), "Cleo Park");

        DaysLeft(cleo).Should().Be(25);
        Figure(cleo, "requested").Should().Be(2);
        Figure(cleo, "tentative").Should().Be(1);
    }

    [Fact]
    public async Task Weekends_and_holidays_never_count_in_any_figure()
    {
        // L2-029 AC5: a day that is now a weekend or a holiday counts in no figure.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ben Okafor");
        await team.SetYearlyDaysAsync("Ben Okafor", 25);
        await team.AddHolidayAsync(new DateOnly(2026, 12, 25), "Christmas Day");
        await team.SetDayAsync("Ben Okafor", new DateOnly(2026, 12, 25), DayStatus.Confirmed); // a holiday added after the day
        await team.SetDayAsync("Ben Okafor", new DateOnly(2026, 10, 3), DayStatus.Confirmed); // a Saturday
        await team.SetDayAsync("Ben Okafor", new DateOnly(2026, 10, 5), DayStatus.Confirmed); // a Monday
        await team.SetDayAsync("Ben Okafor", new DateOnly(2026, 12, 12), DayStatus.Requested); // a Saturday
        await team.SetDayAsync("Ben Okafor", new DateOnly(2026, 12, 26), DayStatus.Tentative); // a Saturday

        var ben = Row(await MonthAsync(team.ClientFor("Maya Chen")), "Ben Okafor");

        Figure(ben, "used").Should().Be(1);
        Figure(ben, "booked").Should().Be(0);
        Figure(ben, "requested").Should().Be(0);
        Figure(ben, "tentative").Should().Be(0);
        DaysLeft(ben).Should().Be(24);
    }

    [Fact]
    public async Task Only_the_leave_year_that_contains_today_counts()
    {
        // L2-029: figures are for the leave year; other years' days and adjustments are left out.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Elif Yılmaz");
        await team.SetYearlyDaysAsync("Elif Yılmaz", 25);
        await team.SetDayAsync("Elif Yılmaz", new DateOnly(2025, 12, 31), DayStatus.Confirmed);
        await team.SetDayAsync("Elif Yılmaz", new DateOnly(2027, 1, 4), DayStatus.Confirmed);
        await team.SetDayAsync("Elif Yılmaz", new DateOnly(2026, 3, 2), DayStatus.Confirmed);
        await team.AddAdjustmentAsync("Elif Yılmaz", 4, new DateOnly(2025, 12, 31));
        await team.AddAdjustmentAsync("Elif Yılmaz", -1, new DateOnly(2026, 6, 1));

        var elif = Row(await MonthAsync(team.ClientFor("Maya Chen")), "Elif Yılmaz");

        Figure(elif, "adjustments").Should().Be(-1);
        Figure(elif, "used").Should().Be(1);
        DaysLeft(elif).Should().Be(23);
    }

    [Fact]
    public async Task A_leave_year_can_start_in_April()
    {
        // The leave year runs from the first of LeaveYearStartMonth: in November 2026 with April it is Apr 2026 - Mar 2027.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Finn Murphy");
        await team.SetYearlyDaysAsync("Finn Murphy", 22);
        await team.SetDefaultsAsync(yearlyDays: 25, leaveYearStartMonth: 4);
        await team.SetDayAsync("Finn Murphy", new DateOnly(2026, 3, 30), DayStatus.Confirmed); // last year
        await team.SetDayAsync("Finn Murphy", new DateOnly(2026, 4, 1), DayStatus.Confirmed);
        await team.SetDayAsync("Finn Murphy", new DateOnly(2027, 2, 1), DayStatus.Confirmed); // booked
        await team.SetDayAsync("Finn Murphy", new DateOnly(2027, 4, 1), DayStatus.Confirmed); // next year

        var finn = Row(await MonthAsync(team.ClientFor("Maya Chen")), "Finn Murphy");

        Figure(finn, "used").Should().Be(1);
        Figure(finn, "booked").Should().Be(1);
        DaysLeft(finn).Should().Be(20);
    }

    [Fact]
    public async Task Taking_more_than_the_allowance_leaves_a_negative_figure()
    {
        // L2-014 AC1: a negative value shows with a minus sign, for example "-2".
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Dev Patel");
        await team.SetYearlyDaysAsync("Dev Patel", 2);
        foreach (var day in Days(2026, 11, 2, 4)) await team.SetDayAsync("Dev Patel", day, DayStatus.Confirmed);
        foreach (var day in Days(2026, 11, 9, 10)) await team.SetDayAsync("Dev Patel", day, DayStatus.Confirmed);

        DaysLeft(Row(await MonthAsync(team.ClientFor("Maya Chen")), "Dev Patel")).Should().Be(-3);
    }

    [Fact]
    public async Task A_member_sees_everyones_days_left_on_the_same_sheet()
    {
        // L2-014 AC1: the Left column is for the whole team.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Ben Okafor");
        await team.SetYearlyDaysAsync("Ben Okafor", 27);

        var month = await MonthAsync(team.ClientFor("Ana Ruiz"));

        DaysLeft(Row(month, "Ana Ruiz")).Should().Be(25);
        DaysLeft(Row(month, "Ben Okafor")).Should().Be(27);
    }

    private static IEnumerable<DateOnly> AnaConfirmedBeforeToday() =>
        new[] { new DateOnly(2026, 1, 2), new(2026, 11, 4), new(2026, 11, 5) }
            .Concat(Days(2026, 4, 7, 10))
            .Concat(Days(2026, 7, 13, 17))
            .Concat(Days(2026, 7, 20, 24));

    /// <summary>The weekdays from the <paramref name="first"/> to the <paramref name="last"/> of a month.</summary>
    private static IEnumerable<DateOnly> Days(int year, int month, int first, int last) =>
        Enumerable.Range(first, last - first + 1).Select(d => new DateOnly(year, month, d))
            .Where(d => d.DayOfWeek is not (DayOfWeek.Saturday or DayOfWeek.Sunday));

    private static async Task<JsonElement> MonthAsync(HttpClient client) =>
        await client.GetFromJsonAsync<JsonElement>("/api/sheet?month=2026-11");

    private static JsonElement Row(JsonElement month, string name) =>
        month.GetProperty("members").EnumerateArray().Single(m => m.GetProperty("name").GetString() == name);

    private static int? DaysLeft(JsonElement row) =>
        row.GetProperty("daysLeft") is { ValueKind: JsonValueKind.Number } left ? left.GetInt32() : null;

    private static int? Figure(JsonElement row, string name) =>
        row.TryGetProperty("allowance", out var figures) && figures.ValueKind == JsonValueKind.Object
            ? figures.GetProperty(name).GetInt32()
            : null;
}
