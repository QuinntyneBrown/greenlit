using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.People;

/// <summary>
/// The allowance adjustments on a person's page (L2-034 AC1-2): listed for the manager and, read-only, for
/// the member themself, for the leave year. "Today" is Friday 6 November 2026.
/// </summary>
public class PersonAdjustmentsTests : IClassFixture<FrozenClockApiFactory>
{
    private readonly FrozenClockApiFactory _factory;

    public PersonAdjustmentsTests(FrozenClockApiFactory factory) => _factory = factory;

    [Fact]
    public async Task The_adjustments_of_the_leave_year_are_listed_with_days_reason_and_date()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddAdjustmentAsync("Ana Ruiz", 3, new DateOnly(2026, 1, 1), "Carried over from 2025");
        await team.AddAdjustmentAsync("Ana Ruiz", -1, new DateOnly(2026, 3, 31), "Unpaid day in March");
        await team.AddAdjustmentAsync("Ana Ruiz", 2, new DateOnly(2025, 6, 1), "An earlier year");

        var person = await PersonFiguresTests.PersonAsync(team.ClientFor("Maya Chen"), team.MemberIdOf("Ana Ruiz"));

        person.GetProperty("adjustments").EnumerateArray()
            .Select(a => $"{a.GetProperty("days").GetInt32()} {a.GetProperty("reason").GetString()} {a.GetProperty("effectiveDate").GetString()}")
            .Should().Equal("3 Carried over from 2025 2026-01-01", "-1 Unpaid day in March 2026-03-31");
    }

    [Fact]
    public async Task A_member_sees_their_own_adjustments()
    {
        // L2-034 AC2: read-only on their own page (the page does not offer "Adjust allowance" to them).
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddAdjustmentAsync("Ana Ruiz", 3, new DateOnly(2026, 1, 1));

        var person = await PersonFiguresTests.PersonAsync(team.ClientFor("Ana Ruiz"), team.MemberIdOf("Ana Ruiz"));

        person.GetProperty("canManage").GetBoolean().Should().BeFalse();
        person.GetProperty("adjustments").GetArrayLength().Should().Be(1);
    }
}
