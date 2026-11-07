using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Sheet;
using Greenlit.Api.Tests.Support;
using Greenlit.Domain.Enums;

namespace Greenlit.Api.Tests.CoverageMinimum;

/// <summary>
/// Days with fewer people in than the minimum are flagged on the month's Out row and on the request detail's
/// (L2-042 AC1, AC3). Design: docs/detailed-designs/teams/coverage-minimum.
/// A team of three (Maya, Ana, Ben), minimum 2. November 2026: Mon 16 to Fri 20.
/// </summary>
public class CoverageFlagsTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public CoverageFlagsTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task A_working_day_with_fewer_people_in_than_the_minimum_is_flagged_on_the_month()
    {
        var team = await TeamWithAnaAndBenOutAsync();

        var month = await MonthMembersTests.GetMonthAsync(team.ClientFor("Maya Chen"), "2026-11");

        month.GetProperty("coverageMinimum").GetInt32().Should().Be(2);
        Day(month.GetProperty("coverage"), "2026-11-17").Should().Be((2, 1, true));
        Day(month.GetProperty("coverage"), "2026-11-18").Should().Be((1, 2, false), "a day with the minimum in is not short");
        Day(month.GetProperty("coverage"), "2026-11-19").Should().Be((0, 3, false));
    }

    [Fact]
    public async Task A_tentative_day_does_not_take_a_person_out()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.SetCoverageMinimumAsync(2);
        await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 11, 17), DayStatus.Tentative);

        var month = await MonthMembersTests.GetMonthAsync(team.ClientFor("Maya Chen"), "2026-11");

        Day(month.GetProperty("coverage"), "2026-11-17").Should().Be((0, 2, false));
    }

    [Fact]
    public async Task With_no_minimum_no_day_is_flagged()
    {
        var team = await TeamWithAnaAndBenOutAsync();
        await team.SetCoverageMinimumAsync(0);

        var month = await MonthMembersTests.GetMonthAsync(team.ClientFor("Maya Chen"), "2026-11");

        month.GetProperty("coverageMinimum").ValueKind.Should().Be(JsonValueKind.Null);
        Day(month.GetProperty("coverage"), "2026-11-17").Should().Be((2, 1, false));
    }

    [Fact]
    public async Task A_member_sees_the_same_flags_as_the_manager()
    {
        var team = await TeamWithAnaAndBenOutAsync();

        var month = await MonthMembersTests.GetMonthAsync(team.ClientFor("Ben Okafor"), "2026-11");

        month.GetProperty("coverageMinimum").GetInt32().Should().Be(2);
        Day(month.GetProperty("coverage"), "2026-11-17").Should().Be((2, 1, true));
    }

    [Fact]
    public async Task The_request_detail_flags_the_same_days_as_the_month()
    {
        var team = await TeamWithAnaAndBenOutAsync();
        var request = await team.AddRequestAsync("Ana Ruiz", new DateOnly(2026, 11, 16), new DateOnly(2026, 11, 17), RequestStatus.Pending);

        var detail = await team.ClientFor("Maya Chen").GetFromJsonAsync<JsonElement>($"/api/requests/{request}");

        detail.GetProperty("coverageMinimum").GetInt32().Should().Be(2);
        Day(detail.GetProperty("coverage"), "2026-11-17").Should().Be((2, 1, true));
        Day(detail.GetProperty("coverage"), "2026-11-18").Should().Be((1, 2, false));
    }

    /// <summary>Ana is out 17-18 Nov and Ben out 17 Nov (requested), against a minimum of 2.</summary>
    private async Task<TestTeam> TeamWithAnaAndBenOutAsync()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Ben Okafor");
        await team.SetCoverageMinimumAsync(2);
        await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 11, 17), DayStatus.Requested);
        await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 11, 18), DayStatus.Confirmed);
        await team.SetDayAsync("Ben Okafor", new DateOnly(2026, 11, 17), DayStatus.Requested);
        return team;
    }

    private static (int Out, int In, bool Below) Day(JsonElement coverage, string date)
    {
        var day = coverage.EnumerateArray().Single(c => c.GetProperty("date").GetString() == date);
        return (day.GetProperty("out").GetInt32(), day.GetProperty("in").GetInt32(), day.GetProperty("belowMinimum").GetBoolean());
    }
}
