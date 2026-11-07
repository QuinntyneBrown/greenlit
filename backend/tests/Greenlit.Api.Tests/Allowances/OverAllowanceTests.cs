using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Domain.Enums;

namespace Greenlit.Api.Tests.Allowances;

/// <summary>
/// Over-allowance warnings (L2-030) on GET /api/requests/quote, POST /api/requests and PUT /api/sheet/days.
/// Design: docs/detailed-designs/allowances/allowance-figures. "Today" is Friday 6 November 2026.
/// Ana has 28 days, 17 used, so 11 left; 5 requested leaves 6 she can still request.
/// </summary>
public class OverAllowanceTests : IClassFixture<FrozenClockApiFactory>
{
    private readonly FrozenClockApiFactory _factory;

    public OverAllowanceTests(FrozenClockApiFactory factory) => _factory = factory;

    [Fact]
    public async Task A_quote_says_how_many_days_the_member_can_still_request()
    {
        // L2-019 AC1: "You have 6 days left to request."
        var team = await AnaAsync();

        var quote = await QuoteAsync(team, "2026-12-07", "2026-12-08");

        quote.GetProperty("days").GetInt32().Should().Be(2);
        Number(quote, "daysAvailable").Should().Be(6);
        Number(quote, "daysOver").Should().Be(0);
    }

    [Fact]
    public async Task A_quote_larger_than_what_is_left_says_how_many_days_over()
    {
        // L2-030 AC3: ten days against six available is "That's 4 days over."
        var team = await AnaAsync();

        var quote = await QuoteAsync(team, "2026-12-07", "2026-12-18");

        quote.GetProperty("days").GetInt32().Should().Be(10);
        Number(quote, "daysOver").Should().Be(4);
    }

    [Fact]
    public async Task A_request_over_the_allowance_is_still_sent()
    {
        // L2-030 AC4: a warning never blocks.
        var team = await AnaAsync();

        var response = await team.ClientFor("Ana Ruiz").PostAsJsonAsync("/api/requests",
            new { firstDay = "2026-12-07", lastDay = "2026-12-18", note = "Family trip" });

        response.StatusCode.Should().Be(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        (await team.RequestsOfAsync("Ana Ruiz")).Should().Contain(r => r.FirstDay == "2026-12-07" && r.Status == "Pending");
    }

    [Fact]
    public async Task A_member_with_nothing_left_is_over_by_all_the_days_they_ask_for()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Dev Patel");
        await team.SetYearlyDaysAsync("Dev Patel", 1);
        await team.SetDayAsync("Dev Patel", new DateOnly(2026, 11, 2), DayStatus.Confirmed);

        var quote = await QuoteAsync(team, "2026-12-07", "2026-12-08", "Dev Patel");

        Number(quote, "daysAvailable").Should().Be(0);
        Number(quote, "daysOver").Should().Be(2);
    }

    [Fact]
    public async Task Painting_requested_days_beyond_what_is_left_reports_the_overage()
    {
        // L2-030 AC2 for painted days: 5 already requested + 8 painted = 13 against 11 left, 2 over.
        var team = await AnaAsync();
        var days = new[] { "2026-12-07", "2026-12-08", "2026-12-09", "2026-12-10", "2026-12-11", "2026-12-14", "2026-12-15", "2026-12-16" };

        var response = await team.ClientFor("Ana Ruiz").PutAsJsonAsync("/api/sheet/days",
            new { memberId = team.MemberIdOf("Ana Ruiz"), dates = days, status = "Requested" });

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        Number(await response.Content.ReadFromJsonAsync<JsonElement>(), "daysOver").Should().Be(2);
    }

    [Fact]
    public async Task Painting_requested_days_within_what_is_left_reports_no_overage()
    {
        var team = await AnaAsync();

        var response = await team.ClientFor("Ana Ruiz").PutAsJsonAsync("/api/sheet/days",
            new { memberId = team.MemberIdOf("Ana Ruiz"), dates = new[] { "2026-12-07", "2026-12-08" }, status = "Requested" });

        Number(await response.Content.ReadFromJsonAsync<JsonElement>(), "daysOver").Should().Be(0);
    }

    [Fact]
    public async Task Painting_tentative_days_never_reports_an_overage()
    {
        // Only requested days are measured against the allowance (L2-030 AC1).
        var team = await AnaAsync();
        var days = Enumerable.Range(7, 5).Select(d => $"2026-12-{d:00}").ToArray();

        var response = await team.ClientFor("Ana Ruiz").PutAsJsonAsync("/api/sheet/days",
            new { memberId = team.MemberIdOf("Ana Ruiz"), dates = days, status = "Tentative" });

        Number(await response.Content.ReadFromJsonAsync<JsonElement>(), "daysOver").Should().Be(0);
    }

    private async Task<TestTeam> AnaAsync()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.SetYearlyDaysAsync("Ana Ruiz", 25);
        await team.AddAdjustmentAsync("Ana Ruiz", 3, new DateOnly(2026, 1, 1));
        // 17 confirmed working days before today leave 11.
        var used = new[] { new DateOnly(2026, 1, 2), new(2026, 11, 4), new(2026, 11, 5) }
            .Concat(Enumerable.Range(7, 4).Select(d => new DateOnly(2026, 4, d)))
            .Concat(Enumerable.Range(13, 5).Select(d => new DateOnly(2026, 7, d)))
            .Concat(Enumerable.Range(20, 5).Select(d => new DateOnly(2026, 7, d)));
        foreach (var day in used) await team.SetDayAsync("Ana Ruiz", day, DayStatus.Confirmed);
        foreach (var day in Enumerable.Range(16, 5).Select(d => new DateOnly(2026, 11, d)))
            await team.SetDayAsync("Ana Ruiz", day, DayStatus.Requested);
        return team;
    }

    private static async Task<JsonElement> QuoteAsync(TestTeam team, string first, string last, string as_ = "Ana Ruiz")
    {
        var response = await team.ClientFor(as_).GetAsync($"/api/requests/quote?first={first}&last={last}");
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    private static int? Number(JsonElement json, string name) =>
        json.TryGetProperty(name, out var value) && value.ValueKind == JsonValueKind.Number ? value.GetInt32() : null;
}
