using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Domain.Enums;

namespace Greenlit.Api.Tests.Sheet;

/// <summary>
/// Days synced across a person's teams (L2-064, ADR-016): a day Sam marks on his row in Product team shows on his row in
/// Chen family as a read-only, Tentative synced day, and the other way round.
/// Design: docs/detailed-designs/sheet/mark-days, sheet/view-month.
/// November 2026: the 2nd is a Monday, the 7th and 8th a weekend.
/// </summary>
public class SyncedDaysTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public SyncedDaysTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task A_tentative_day_marked_in_one_team_shows_as_a_synced_day_in_the_other()
    {
        // L2-064 AC1, AC2. Given Sam on Product team and Chen family, when he marks Tue 17 Nov tentative in Product team,
        // then Chen family's month shows it on his row as a Tentative cell flagged synced, and only there.
        var (product, family) = await SamOnTwoTeamsAsync();

        var response = await SetAsync(product, "Sam Chen", "Sam Chen", ["2026-11-17"], "Tentative");

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        var familyMonth = await MonthAsync(family, "Sam Chen");
        CellOf(familyMonth, "Sam Chen", "2026-11-17").GetProperty("kind").GetString().Should().Be("Tentative");
        CellOf(familyMonth, "Sam Chen", "2026-11-17").GetProperty("synced").GetBoolean().Should().BeTrue();
        CellOf(familyMonth, "Sam Chen", "2026-11-18").GetProperty("kind").GetString().Should().Be("Working");
        CellOf(familyMonth, "Maya Chen", "2026-11-17").GetProperty("kind").GetString().Should().Be("Working");
        var productMonth = await MonthAsync(product, "Sam Chen");
        CellOf(productMonth, "Sam Chen", "2026-11-17").GetProperty("kind").GetString().Should().Be("Tentative");
        CellOf(productMonth, "Sam Chen", "2026-11-17").GetProperty("synced").GetBoolean().Should().BeFalse();
    }

    [Fact]
    public async Task Requested_and_confirmed_days_show_as_tentative_synced_days_and_ask_nothing_of_the_other_team()
    {
        // L2-064 AC1. Given Sam marks Mon 16 and Tue 17 Nov requested in Product team and Omar confirms Mon 16, then Chen
        // family shows both as Tentative synced days, and Chen family has no request and nothing for Maya to confirm.
        var (product, family) = await SamOnTwoTeamsAsync();

        (await SetAsync(product, "Sam Chen", "Sam Chen", ["2026-11-16", "2026-11-17"], "Requested")).StatusCode.Should().Be(HttpStatusCode.OK);
        (await SetAsync(product, "Omar Diaz", "Sam Chen", ["2026-11-16"], "Confirmed")).StatusCode.Should().Be(HttpStatusCode.OK);

        var month = await MonthAsync(family, "Maya Chen");
        foreach (var date in new[] { "2026-11-16", "2026-11-17" })
        {
            CellOf(month, "Sam Chen", date).GetProperty("kind").GetString().Should().Be("Tentative");
            CellOf(month, "Sam Chen", date).GetProperty("synced").GetBoolean().Should().BeTrue();
        }
        (await family.RequestsOfAsync("Sam Chen")).Should().BeEmpty();
        (await product.RequestsOfAsync("Sam Chen")).Should().ContainSingle();
    }

    [Fact]
    public async Task A_request_sent_in_one_team_shows_as_synced_days_in_the_other()
    {
        // L2-064 AC1 through "Request time off" (L2-019): the request's days are synced too, and no request is made in
        // Chen family.
        var (product, family) = await SamOnTwoTeamsAsync();

        var response = await product.SessionFor("Sam Chen").PostAsJsonAsync("/api/requests",
            new { firstDay = "2026-11-19", lastDay = "2026-11-20", note = "Dentist" });

        response.StatusCode.Should().Be(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        var month = await MonthAsync(family, "Sam Chen");
        CellOf(month, "Sam Chen", "2026-11-19").GetProperty("synced").GetBoolean().Should().BeTrue();
        CellOf(month, "Sam Chen", "2026-11-20").GetProperty("synced").GetBoolean().Should().BeTrue();
        (await family.RequestsOfAsync("Sam Chen")).Should().BeEmpty();
    }

    [Fact]
    public async Task A_synced_day_counts_in_none_of_the_persons_figures_in_the_other_team()
    {
        // L2-064 AC10 (ADR-007): Chen family's figures for Sam ignore his synced days, and its Out row counts him in.
        var (product, family) = await SamOnTwoTeamsAsync();
        (await SetAsync(product, "Sam Chen", "Sam Chen", ["2026-11-16"], "Requested")).StatusCode.Should().Be(HttpStatusCode.OK);
        (await SetAsync(product, "Sam Chen", "Sam Chen", ["2026-11-17"], "Tentative")).StatusCode.Should().Be(HttpStatusCode.OK);
        (await SetAsync(product, "Omar Diaz", "Sam Chen", ["2026-11-18"], "Confirmed")).StatusCode.Should().Be(HttpStatusCode.OK);

        var month = await MonthAsync(family, "Maya Chen");

        var allowance = RowOf(month, "Sam Chen").GetProperty("allowance");
        foreach (var figure in new[] { "used", "booked", "requested", "tentative" })
            allowance.GetProperty(figure).GetInt32().Should().Be(0, figure);
        RowOf(month, "Sam Chen").GetProperty("daysLeft").GetInt32().Should().Be(allowance.GetProperty("allowance").GetInt32());
        var out16 = month.GetProperty("coverage").EnumerateArray().Single(c => c.GetProperty("date").GetString() == "2026-11-16");
        out16.GetProperty("out").GetInt32().Should().Be(0);
        out16.GetProperty("in").GetInt32().Should().Be(2);
    }

    /// <summary>Sam Chen is a member of Product team (manager Omar Diaz) and of Chen family (manager Maya Chen).</summary>
    private async Task<(TestTeam Product, TestTeam Family)> SamOnTwoTeamsAsync()
    {
        var product = await TestTeam.CreateAsync(_factory, "Omar Diaz", teamName: "Product team");
        await product.AddMemberAsync("Sam Chen");
        var family = await TestTeam.CreateAsync(_factory, "Maya Chen", teamName: "Chen family");
        await family.AddExistingMemberAsync(product, "Sam Chen");
        return (product, family);
    }

    private static Task<HttpResponseMessage> SetAsync(TestTeam team, string caller, string member, string[] dates, string? status) =>
        team.SessionFor(caller).PutAsJsonAsync("/api/sheet/days", new { memberId = team.MemberIdOf(member), dates, status });

    private static Task<JsonElement> MonthAsync(TestTeam team, string caller, string month = "2026-11") =>
        MonthMembersTests.GetMonthAsync(team.SessionFor(caller), month);

    private static JsonElement RowOf(JsonElement month, string member) =>
        month.GetProperty("members").EnumerateArray().Single(m => m.GetProperty("name").GetString() == member);

    private static JsonElement CellOf(JsonElement month, string member, string date) =>
        month.GetProperty("members").EnumerateArray()
            .Single(m => m.GetProperty("name").GetString() == member)
            .GetProperty("cells").EnumerateArray()
            .Single(c => c.GetProperty("date").GetString() == date);
}
