using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Domain.Enums;

namespace Greenlit.Api.Tests.Requests;

/// <summary>
/// The manager's ledger (L2-022): overlaps on pending requests, the decided date and reason on the others,
/// cancelled requests under Declined, and the counts of the three tabs.
/// Design: docs/detailed-designs/requests/review-requests.
/// </summary>
public class RequestLedgerTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public RequestLedgerTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task A_pending_request_lists_the_other_members_who_are_out_on_its_days()
    {
        var team = await TestTeam.CreateAsync(_factory);
        foreach (var name in new[] { "Ana Ruiz", "Ben Okafor", "Cleo Park", "Dev Patel" }) await team.AddMemberAsync(name);
        await SendAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-20", "Visiting family in Seville");
        await SendAsync(team, "Dev Patel", "2026-11-18", "2026-11-19", "Moving flat");
        await SendAsync(team, "Cleo Park", "2026-11-12", "2026-11-13", null);
        await team.SetDayAsync("Ben Okafor", new DateOnly(2026, 11, 20), DayStatus.Confirmed);
        await team.SetDayAsync("Ben Okafor", new DateOnly(2026, 11, 17), DayStatus.Tentative);

        var list = await Json(await team.ClientFor("Maya Chen").GetAsync("/api/requests"));

        var ana = Entry(list, "Ana Ruiz");
        Overlaps(ana).Should().Equal("Ben Okafor 2026-11-20..2026-11-20", "Dev Patel 2026-11-18..2026-11-19");
        Overlaps(Entry(list, "Dev Patel")).Should().Equal("Ana Ruiz 2026-11-18..2026-11-19");
        Overlaps(Entry(list, "Cleo Park")).Should().BeEmpty();
    }

    [Fact]
    public async Task Another_teams_days_and_the_members_own_are_not_overlaps()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var other = await TestTeam.CreateAsync(_factory, "Olu Bello", teamName: "Other team");
        await other.AddMemberAsync("Ola Ito");
        await SendAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-20", null);
        await other.SetDayAsync("Ola Ito", new DateOnly(2026, 11, 17), DayStatus.Confirmed);

        var list = await Json(await team.ClientFor("Maya Chen").GetAsync("/api/requests"));

        Overlaps(Entry(list, "Ana Ruiz")).Should().BeEmpty();
    }

    [Fact]
    public async Task An_approved_request_carries_when_it_was_decided_and_no_overlaps()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Finn Murphy");
        var sent = new DateTimeOffset(2026, 9, 28, 9, 0, 0, TimeSpan.Zero);
        var decided = new DateTimeOffset(2026, 9, 29, 9, 0, 0, TimeSpan.Zero);
        await team.AddRequestAsync("Finn Murphy", new DateOnly(2026, 10, 19), new DateOnly(2026, 10, 23), RequestStatus.Approved,
            "Half-term with my niece", sent, decided, dayStatus: DayStatus.Confirmed);

        var list = await Json(await team.ClientFor("Maya Chen").GetAsync("/api/requests?status=Approved"));

        var finn = Entry(list, "Finn Murphy");
        finn.GetProperty("sentUtc").GetDateTimeOffset().Should().Be(sent);
        finn.GetProperty("decidedUtc").GetDateTimeOffset().Should().Be(decided);
        finn.GetProperty("days").GetInt32().Should().Be(5);
        finn.GetProperty("declineReason").ValueKind.Should().Be(JsonValueKind.Null);
        Overlaps(finn).Should().BeEmpty();
    }

    [Fact]
    public async Task The_declined_tab_lists_declined_and_cancelled_requests_with_the_reason_and_the_days_the_range_covers()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ben Okafor");
        await team.AddMemberAsync("Ana Ruiz");
        var sent = new DateTimeOffset(2026, 9, 20, 9, 0, 0, TimeSpan.Zero);
        await team.AddRequestAsync("Ben Okafor", new DateOnly(2026, 12, 21), new DateOnly(2026, 12, 24), RequestStatus.Declined,
            "Christmas", sent.AddDays(60), sent.AddDays(61), "Three people are already out that week.", DayStatus.Tentative);
        await team.AddRequestAsync("Ana Ruiz", new DateOnly(2026, 10, 5), new DateOnly(2026, 10, 6), RequestStatus.Cancelled,
            "Short trip", sent, sent.AddDays(5));

        var declined = await Json(await team.ClientFor("Maya Chen").GetAsync("/api/requests?status=Declined"));
        var cancelled = await Json(await team.ClientFor("Maya Chen").GetAsync("/api/requests?status=Cancelled"));

        declined.EnumerateArray().Select(r => r.GetProperty("memberName").GetString()).Should().Equal("Ana Ruiz", "Ben Okafor");
        Entry(declined, "Ben Okafor").GetProperty("declineReason").GetString().Should().Be("Three people are already out that week.");
        Entry(declined, "Ben Okafor").GetProperty("status").GetString().Should().Be("Declined");
        Entry(declined, "Ana Ruiz").GetProperty("status").GetString().Should().Be("Cancelled");
        Entry(declined, "Ana Ruiz").GetProperty("days").GetInt32().Should().Be(2, "a cancelled request has no days left, so its range's working days are counted");
        cancelled.EnumerateArray().Select(r => r.GetProperty("memberName").GetString()).Should().Equal("Ana Ruiz");
    }

    [Fact]
    public async Task The_counts_are_those_of_the_three_tabs_for_the_managers_own_team()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Ben Okafor");
        var other = await TestTeam.CreateAsync(_factory, "Olu Bello", teamName: "Other team");
        await other.AddMemberAsync("Ola Ito");
        await SendAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-20", null);
        await SendAsync(team, "Ben Okafor", "2026-11-23", "2026-11-24", null);
        await team.AddRequestAsync("Ana Ruiz", new DateOnly(2026, 10, 5), new DateOnly(2026, 10, 6), RequestStatus.Approved, decided: DateTimeOffset.UtcNow);
        await team.AddRequestAsync("Ana Ruiz", new DateOnly(2026, 9, 7), new DateOnly(2026, 9, 8), RequestStatus.Declined, decided: DateTimeOffset.UtcNow);
        await team.AddRequestAsync("Ben Okafor", new DateOnly(2026, 9, 14), new DateOnly(2026, 9, 15), RequestStatus.Cancelled);
        await SendAsync(other, "Ola Ito", "2026-11-16", "2026-11-20", null);

        var response = await team.ClientFor("Maya Chen").GetAsync("/api/requests/counts");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var counts = await Json(response);
        counts.GetProperty("pending").GetInt32().Should().Be(2);
        counts.GetProperty("approved").GetInt32().Should().Be(1);
        counts.GetProperty("declined").GetInt32().Should().Be(2, "cancelled requests are counted under Declined");
    }

    [Fact]
    public async Task Counts_are_for_the_manager_only()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var lone = await TestTeam.LoneUserAsync(_factory);

        (await _factory.CreateClient().GetAsync("/api/requests/counts")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await team.ClientFor("Ana Ruiz").GetAsync("/api/requests/counts")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await _factory.ClientFor(lone).GetAsync("/api/requests/counts")).StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    private static Task<HttpResponseMessage> SendAsync(TestTeam team, string member, string first, string last, string? note) =>
        team.ClientFor(member).PostAsJsonAsync("/api/requests", new { firstDay = first, lastDay = last, note });

    private static JsonElement Entry(JsonElement list, string member) =>
        list.EnumerateArray().Single(r => r.GetProperty("memberName").GetString() == member);

    private static IEnumerable<string> Overlaps(JsonElement entry) =>
        entry.GetProperty("overlaps").EnumerateArray()
            .Select(o => $"{o.GetProperty("memberName").GetString()} {o.GetProperty("firstDay").GetString()}..{o.GetProperty("lastDay").GetString()}");

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
}
