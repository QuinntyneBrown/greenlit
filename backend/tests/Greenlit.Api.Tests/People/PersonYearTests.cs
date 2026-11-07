using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Domain.Enums;
using System.Text.Json;
using Days = Greenlit.Domain.Enums.WorkingDays;

namespace Greenlit.Api.Tests.People;

/// <summary>
/// The year at a glance and the over-allowance figure of a person's page (L2-033 AC2, ADR-007).
/// "Today" is Friday 6 November 2026.
/// </summary>
public class PersonYearTests : IClassFixture<FrozenClockApiFactory>
{
    private readonly FrozenClockApiFactory _factory;

    public PersonYearTests(FrozenClockApiFactory factory) => _factory = factory;

    [Fact]
    public async Task The_year_is_twelve_months_with_a_status_for_every_day()
    {
        // L2-033 AC2: twelve month calendars coloured by day status.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 1, 2), DayStatus.Confirmed);
        await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 11, 16), DayStatus.Requested);
        await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 12, 29), DayStatus.Tentative);

        var person = await PersonFiguresTests.PersonAsync(team.ClientFor("Maya Chen"), team.MemberIdOf("Ana Ruiz"));

        var months = person.GetProperty("months").EnumerateArray().ToList();
        months.Select(m => m.GetProperty("month").GetInt32()).Should().Equal(Enumerable.Range(1, 12));
        months.Select(m => m.GetProperty("days").GetArrayLength()).Should().Equal(31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31);
        Status(months, 1, 2).Should().Be("confirmed");
        Status(months, 1, 5).Should().Be("empty");
        Status(months, 1, 3).Should().Be("off");
        Status(months, 11, 16).Should().Be("requested");
        Status(months, 12, 29).Should().Be("tentative");
    }

    [Fact]
    public async Task A_holiday_is_off_and_carries_its_name_and_a_day_the_member_does_not_work_is_off()
    {
        // L2-033 AC2: weekend / holiday are red; the mini day is named for the holiday.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Dev Patel");
        await team.AddHolidayAsync(new DateOnly(2026, 1, 1), "New Year's Day");
        await _factory.WriteAsync(db => db.TeamMembers.Single(m => m.Id == team.MemberIdOf("Dev Patel")).WorkingDays = Days.Mon | Days.Tue | Days.Wed | Days.Thu);

        var person = await PersonFiguresTests.PersonAsync(team.ClientFor("Maya Chen"), team.MemberIdOf("Dev Patel"));

        var months = person.GetProperty("months").EnumerateArray().ToList();
        Status(months, 1, 1).Should().Be("off");
        months[0].GetProperty("days")[0].GetProperty("holiday").GetString().Should().Be("New Year's Day");
        months[0].GetProperty("days")[1].GetProperty("holiday").ValueKind.Should().Be(JsonValueKind.Null);
        Status(months, 1, 2).Should().Be("off", "Dev does not work Fridays");
        Status(months, 1, 5).Should().Be("empty");
    }

    [Fact]
    public async Task Days_over_is_what_the_requests_take_beyond_the_days_left()
    {
        // L2-033 AC1 / ADR-007: the warning "2 days over once requests are approved".
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Dev Patel");
        await team.SetYearlyDaysAsync("Dev Patel", 5);
        foreach (var day in new[] { 2, 3 }) await team.SetDayAsync("Dev Patel", new DateOnly(2026, 11, day), DayStatus.Confirmed);
        foreach (var day in new[] { 16, 17, 18, 19 }) await team.SetDayAsync("Dev Patel", new DateOnly(2026, 11, day), DayStatus.Requested);

        var person = await PersonFiguresTests.PersonAsync(team.ClientFor("Maya Chen"), team.MemberIdOf("Dev Patel"));

        person.GetProperty("allowance").GetProperty("left").GetInt32().Should().Be(3);
        person.GetProperty("daysOver").GetInt32().Should().Be(1);
    }

    private static string Status(List<JsonElement> months, int month, int day) =>
        months[month - 1].GetProperty("days")[day - 1].GetProperty("status").GetString()!;
}
