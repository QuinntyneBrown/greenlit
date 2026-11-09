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

    [Theory]
    [InlineData("Sam Chen", "Requested")]
    [InlineData("Sam Chen", null)]
    [InlineData("Maya Chen", "Confirmed")]
    [InlineData("Maya Chen", null)]
    public async Task A_synced_day_is_locked_for_the_person_and_the_manager_of_the_other_team(string caller, string? status)
    {
        // L2-064 AC3, L2-017 AC6. Given a synced day in Chen family, when Sam or Maya paints or clears only it, then
        // nothing changes and the answer is 403 synced_day_locked.
        var (product, family) = await SamOnTwoTeamsAsync();
        (await SetAsync(product, "Sam Chen", "Sam Chen", ["2026-11-17"], "Tentative")).StatusCode.Should().Be(HttpStatusCode.OK);

        var response = await SetAsync(family, caller, "Sam Chen", ["2026-11-17"], status);

        await AssertProblem(response, HttpStatusCode.Forbidden, "synced_day_locked");
        CellOf(await MonthAsync(family, "Sam Chen"), "Sam Chen", "2026-11-17").GetProperty("synced").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task A_stroke_over_a_synced_day_and_others_changes_the_others_only()
    {
        // L2-064 AC3: the stroke changes Wed 18 and leaves the synced Tue 17 as it is.
        var (product, family) = await SamOnTwoTeamsAsync();
        (await SetAsync(product, "Sam Chen", "Sam Chen", ["2026-11-17"], "Tentative")).StatusCode.Should().Be(HttpStatusCode.OK);

        var response = await SetAsync(family, "Sam Chen", "Sam Chen", ["2026-11-17", "2026-11-18"], "Requested");

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        var set = JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
        set.GetProperty("changes").EnumerateArray().Select(c => c.GetProperty("date").GetString()).Should().Equal("2026-11-18");
        var month = await MonthAsync(family, "Sam Chen");
        CellOf(month, "Sam Chen", "2026-11-17").GetProperty("synced").GetBoolean().Should().BeTrue();
        CellOf(month, "Sam Chen", "2026-11-18").GetProperty("kind").GetString().Should().Be("Requested");
        // Wed 18 is now Sam's own day in Chen family, so Product team shows it as synced in turn.
        CellOf(await MonthAsync(product, "Sam Chen"), "Sam Chen", "2026-11-18").GetProperty("synced").GetBoolean().Should().BeTrue();
    }

    [Fact]
    public async Task A_request_over_only_synced_days_is_refused_and_one_over_some_skips_them()
    {
        // L2-064 AC3 through "Request time off": synced dates are skipped like holidays; only synced days is 403.
        var (product, family) = await SamOnTwoTeamsAsync();
        (await SetAsync(product, "Sam Chen", "Sam Chen", ["2026-11-17", "2026-11-18"], "Tentative")).StatusCode.Should().Be(HttpStatusCode.OK);
        var sam = family.SessionFor("Sam Chen");

        await AssertProblem(
            await sam.PostAsJsonAsync("/api/requests", new { firstDay = "2026-11-17", lastDay = "2026-11-18" }),
            HttpStatusCode.Forbidden, "synced_day_locked");

        var response = await sam.PostAsJsonAsync("/api/requests", new { firstDay = "2026-11-17", lastDay = "2026-11-19" });
        response.StatusCode.Should().Be(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        (await family.RequestsOfAsync("Sam Chen")).Should().ContainSingle()
            .Which.Should().BeEquivalentTo(new { FirstDay = "2026-11-19", LastDay = "2026-11-19", Days = 1 });
        var month = await MonthAsync(family, "Sam Chen");
        CellOf(month, "Sam Chen", "2026-11-17").GetProperty("synced").GetBoolean().Should().BeTrue();
        CellOf(month, "Sam Chen", "2026-11-19").GetProperty("kind").GetString().Should().Be("Requested");
    }

    [Fact]
    public async Task Clearing_the_day_clears_its_synced_day_and_undo_brings_both_back()
    {
        // L2-064 AC4: clear Tue 17 in Product team, the synced day goes from Chen family; Undo restores both at once.
        var (product, family) = await SamOnTwoTeamsAsync();
        (await SetAsync(product, "Sam Chen", "Sam Chen", ["2026-11-17"], "Requested")).StatusCode.Should().Be(HttpStatusCode.OK);

        (await SetAsync(product, "Sam Chen", "Sam Chen", ["2026-11-17"], null)).StatusCode.Should().Be(HttpStatusCode.OK);
        CellOf(await MonthAsync(family, "Sam Chen"), "Sam Chen", "2026-11-17").GetProperty("kind").GetString().Should().Be("Working");

        var undo = await product.SessionFor("Sam Chen").PostAsJsonAsync("/api/sheet/days/restore",
            new { memberId = product.MemberIdOf("Sam Chen"), days = new[] { new { date = "2026-11-17", status = "Requested" } } });

        undo.StatusCode.Should().Be(HttpStatusCode.OK, await undo.Content.ReadAsStringAsync());
        CellOf(await MonthAsync(product, "Sam Chen"), "Sam Chen", "2026-11-17").GetProperty("kind").GetString().Should().Be("Requested");
        var cell = CellOf(await MonthAsync(family, "Sam Chen"), "Sam Chen", "2026-11-17");
        cell.GetProperty("kind").GetString().Should().Be("Tentative");
        cell.GetProperty("synced").GetBoolean().Should().BeTrue();
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

    private static async Task AssertProblem(HttpResponseMessage response, HttpStatusCode status, string code)
    {
        response.StatusCode.Should().Be(status, await response.Content.ReadAsStringAsync());
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("code").GetString().Should().Be(code);
    }

    private static JsonElement RowOf(JsonElement month, string member) =>
        month.GetProperty("members").EnumerateArray().Single(m => m.GetProperty("name").GetString() == member);

    private static JsonElement CellOf(JsonElement month, string member, string date) =>
        month.GetProperty("members").EnumerateArray()
            .Single(m => m.GetProperty("name").GetString() == member)
            .GetProperty("cells").EnumerateArray()
            .Single(c => c.GetProperty("date").GetString() == date);
}
