using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Domain.Enums;

namespace Greenlit.Api.Tests.Requests;

/// <summary>
/// Days painted Requested on the calendar are a pending request for the manager (L2-015 AC5): the
/// same thing as a request sent from the dialog. Design: docs/detailed-designs/sheet/mark-days
/// (RequestLedger). November 2026: the 16th is a Monday, the 21st/22nd a weekend.
/// </summary>
public class PaintedRequestTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public PaintedRequestTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Three_requested_days_painted_are_one_pending_request()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        await PaintAsync(team, "Ana Ruiz", "Requested", "2026-11-17", "2026-11-18", "2026-11-19");

        (await team.RequestsOfAsync("Ana Ruiz")).Should().ContainSingle()
            .Which.Should().Be(new RequestRow("2026-11-17", "2026-11-19", null, "Pending", 3));
    }

    [Fact]
    public async Task Painting_the_next_working_day_after_a_weekend_extends_the_request()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await PaintAsync(team, "Ana Ruiz", "Requested", "2026-11-19", "2026-11-20");

        await PaintAsync(team, "Ana Ruiz", "Requested", "2026-11-23");

        (await team.RequestsOfAsync("Ana Ruiz")).Should().ContainSingle()
            .Which.Should().Be(new RequestRow("2026-11-19", "2026-11-23", null, "Pending", 3));
    }

    [Fact]
    public async Task A_separate_run_is_a_separate_request()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await PaintAsync(team, "Ana Ruiz", "Requested", "2026-11-16");

        await PaintAsync(team, "Ana Ruiz", "Requested", "2026-11-19");

        (await team.RequestsOfAsync("Ana Ruiz")).Should().HaveCount(2);
    }

    [Fact]
    public async Task Tentative_days_are_not_a_request()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        await PaintAsync(team, "Ana Ruiz", "Tentative", "2026-11-16", "2026-11-17");

        (await team.RequestsOfAsync("Ana Ruiz")).Should().BeEmpty();
    }

    [Fact]
    public async Task Clearing_a_day_takes_it_out_of_its_request_and_the_last_one_ends_the_request()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await PaintAsync(team, "Ana Ruiz", "Requested", "2026-11-16", "2026-11-17", "2026-11-18");

        await PaintAsync(team, "Ana Ruiz", null, "2026-11-18");
        (await team.RequestsOfAsync("Ana Ruiz")).Should().ContainSingle()
            .Which.Should().Be(new RequestRow("2026-11-16", "2026-11-17", null, "Pending", 2));

        await PaintAsync(team, "Ana Ruiz", null, "2026-11-16", "2026-11-17");
        (await team.RequestsOfAsync("Ana Ruiz")).Should().BeEmpty();
    }

    [Fact]
    public async Task Painting_a_requested_day_tentative_takes_it_out_of_its_request()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await PaintAsync(team, "Ana Ruiz", "Requested", "2026-11-16", "2026-11-17");

        await PaintAsync(team, "Ana Ruiz", "Tentative", "2026-11-17");

        (await team.RequestsOfAsync("Ana Ruiz")).Should().ContainSingle()
            .Which.Should().Be(new RequestRow("2026-11-16", "2026-11-16", null, "Pending", 1));
    }

    [Fact]
    public async Task Undoing_a_requested_stroke_leaves_no_request_behind()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await PaintAsync(team, "Ana Ruiz", "Requested", "2026-11-16", "2026-11-17");

        var response = await team.ClientFor("Ana Ruiz").PostAsJsonAsync("/api/sheet/days/restore", new
        {
            memberId = team.MemberIdOf("Ana Ruiz"),
            days = new object[]
            {
                new { date = "2026-11-16", status = (string?)null },
                new { date = "2026-11-17", status = (string?)null },
            },
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await team.RequestsOfAsync("Ana Ruiz")).Should().BeEmpty();
    }

    [Fact]
    public async Task Requested_days_that_a_request_sent_from_the_dialog_made_can_be_cleared_too()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.ClientFor("Ana Ruiz").PostAsJsonAsync("/api/requests",
            new { firstDay = "2026-11-16", lastDay = "2026-11-18", note = "Trip" });

        await PaintAsync(team, "Ana Ruiz", null, "2026-11-18");

        (await team.RequestsOfAsync("Ana Ruiz")).Should().ContainSingle()
            .Which.Should().Be(new RequestRow("2026-11-16", "2026-11-17", "Trip", "Pending", 2));
    }

    [Fact]
    public async Task The_manager_confirming_requested_days_ends_their_pending_request()
    {
        // Approving a request as a whole (with the decision recorded) is journey 9; confirming the
        // days on the calendar must at least not leave a pending request without requested days.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await PaintAsync(team, "Ana Ruiz", "Requested", "2026-11-16", "2026-11-17");

        var response = await team.ClientFor("Maya Chen").PutAsJsonAsync("/api/sheet/days", new
        {
            memberId = team.MemberIdOf("Ana Ruiz"),
            dates = new[] { "2026-11-16", "2026-11-17" },
            status = "Confirmed",
        });

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await team.RequestsOfAsync("Ana Ruiz")).Should().BeEmpty();
    }

    [Fact]
    public async Task Requested_days_stored_without_a_request_are_left_alone()
    {
        // Rows stored before requests existed keep no request; a new stroke next to one starts its own.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 11, 16), DayStatus.Requested);

        await PaintAsync(team, "Ana Ruiz", "Requested", "2026-11-17");

        (await team.RequestsOfAsync("Ana Ruiz")).Should().ContainSingle()
            .Which.Should().Be(new RequestRow("2026-11-17", "2026-11-17", null, "Pending", 1));
    }

    private static async Task PaintAsync(TestTeam team, string member, string? status, params string[] dates)
    {
        var response = await team.ClientFor(member).PutAsJsonAsync("/api/sheet/days",
            new { memberId = team.MemberIdOf(member), dates, status });
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}
