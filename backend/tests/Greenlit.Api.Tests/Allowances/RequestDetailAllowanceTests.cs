using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Domain.Enums;

namespace Greenlit.Api.Tests.Allowances;

/// <summary>
/// "Days left after" in GET /api/requests/{id} (L2-023 AC1): the member's days left once their requests are approved.
/// "Today" is Friday 6 November 2026.
/// </summary>
public class RequestDetailAllowanceTests : IClassFixture<FrozenClockApiFactory>
{
    private readonly FrozenClockApiFactory _factory;

    public RequestDetailAllowanceTests(FrozenClockApiFactory factory) => _factory = factory;

    [Fact]
    public async Task A_pending_request_shows_the_days_left_once_it_is_approved()
    {
        // Ana has 11 left and 5 requested: 6 left after.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.SetYearlyDaysAsync("Ana Ruiz", 14);
        foreach (var day in Enumerable.Range(2, 3).Select(d => new DateOnly(2026, 11, d)))
            await team.SetDayAsync("Ana Ruiz", day, DayStatus.Confirmed);
        var id = await team.AddRequestAsync("Ana Ruiz", new(2026, 11, 16), new(2026, 11, 20), RequestStatus.Pending, dayStatus: DayStatus.Requested);

        var detail = await DetailAsync(team, id);

        // 14 yearly - 3 used = 11 left; 5 requested.
        DaysLeftAfter(detail).Should().Be(6);
    }

    [Fact]
    public async Task A_request_that_takes_the_member_below_zero_shows_a_negative_figure()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.SetYearlyDaysAsync("Ana Ruiz", 3);
        var id = await team.AddRequestAsync("Ana Ruiz", new(2026, 11, 16), new(2026, 11, 20), RequestStatus.Pending, dayStatus: DayStatus.Requested);

        DaysLeftAfter(await DetailAsync(team, id)).Should().Be(-2);
    }

    private static async Task<JsonElement> DetailAsync(TestTeam team, Guid id) =>
        await team.ClientFor("Maya Chen").GetFromJsonAsync<JsonElement>($"/api/requests/{id}");

    private static int? DaysLeftAfter(JsonElement detail) =>
        detail.TryGetProperty("daysLeftAfter", out var v) && v.ValueKind == JsonValueKind.Number ? v.GetInt32() : null;
}
