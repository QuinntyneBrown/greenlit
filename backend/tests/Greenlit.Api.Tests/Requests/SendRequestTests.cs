using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Domain.Enums;

namespace Greenlit.Api.Tests.Requests;

/// <summary>
/// POST /api/requests and GET /api/requests/quote: sending a time-off request (L2-019).
/// Design: docs/detailed-designs/requests/send-request.
/// November 2026: the 16th is a Monday, the 7th/8th, 14th/15th and 21st/22nd are weekends.
/// </summary>
public class SendRequestTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public SendRequestTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Signed_out_callers_get_401()
    {
        var client = _factory.CreateClient();

        (await client.PostAsJsonAsync("/api/requests", new { firstDay = "2026-11-16", lastDay = "2026-11-20" }))
            .StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await client.GetAsync("/api/requests/quote?first=2026-11-16&last=2026-11-20"))
            .StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task A_member_requests_five_days_with_a_note_and_they_turn_requested()
    {
        // L2-019 AC5: a pending request with the note; its working days are Requested on the calendar.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var response = await SendAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-20", "Visiting family in Seville");

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        var request = await Json(response);
        request.GetProperty("firstDay").GetString().Should().Be("2026-11-16");
        request.GetProperty("lastDay").GetString().Should().Be("2026-11-20");
        request.GetProperty("days").GetInt32().Should().Be(5);
        request.GetProperty("note").GetString().Should().Be("Visiting family in Seville");
        request.GetProperty("status").GetString().Should().Be("Pending");
        request.GetProperty("memberName").GetString().Should().Be("Ana Ruiz");
        var month = await MonthAsync(team, "Ana Ruiz");
        foreach (var date in new[] { "2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19", "2026-11-20" })
            KindOf(month, "Ana Ruiz", date).Should().Be("Requested");
        KindOf(month, "Ana Ruiz", "2026-11-23").Should().Be("Working");
        (await team.RequestsOfAsync("Ana Ruiz")).Should().ContainSingle()
            .Which.Should().Be(new RequestRow("2026-11-16", "2026-11-20", "Visiting family in Seville", "Pending", 5));
    }

    [Fact]
    public async Task The_note_is_optional()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var response = await SendAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-16", null);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        (await Json(response)).GetProperty("note").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task Weekends_and_holidays_in_the_range_are_not_counted_or_marked()
    {
        // L2-019 AC7: Mon 16 to Mon 23 Nov with a holiday on Wed 18 is five working days.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddHolidayAsync(new DateOnly(2026, 11, 18), "Company day");

        var response = await SendAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-23", "Long week");

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        (await Json(response)).GetProperty("days").GetInt32().Should().Be(5);
        var month = await MonthAsync(team, "Ana Ruiz");
        KindOf(month, "Ana Ruiz", "2026-11-18").Should().Be("Holiday");
        KindOf(month, "Ana Ruiz", "2026-11-21").Should().Be("NotWorking");
        KindOf(month, "Ana Ruiz", "2026-11-23").Should().Be("Requested");
    }

    [Fact]
    public async Task A_last_day_before_the_first_day_is_refused_and_nothing_changes()
    {
        // L2-019 AC4.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var response = await SendAsync(team, "Ana Ruiz", "2026-12-11", "2026-12-07", null);

        await AssertProblem(response, HttpStatusCode.BadRequest, "end_before_start");
        (await team.RequestsOfAsync("Ana Ruiz")).Should().BeEmpty();
    }

    [Theory]
    [InlineData(null, "2026-11-20")]
    [InlineData("2026-11-16", null)]
    [InlineData("16 Nov", "2026-11-20")]
    public async Task Missing_or_malformed_dates_are_a_validation_error(string? first, string? last)
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var response = await SendAsync(team, "Ana Ruiz", first, last, null);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await team.RequestsOfAsync("Ana Ruiz")).Should().BeEmpty();
    }

    [Fact]
    public async Task A_note_over_500_characters_is_a_validation_error()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var response = await SendAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-17", new string('x', 501));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await team.RequestsOfAsync("Ana Ruiz")).Should().BeEmpty();
    }

    [Fact]
    public async Task A_range_longer_than_a_year_is_refused()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var response = await SendAsync(team, "Ana Ruiz", "2026-01-01", "2027-06-30", null);

        await AssertProblem(response, HttpStatusCode.BadRequest, "range_too_long");
    }

    [Fact]
    public async Task A_range_of_only_weekends_has_nothing_to_request()
    {
        // L2-019 AC7: no working day, no request.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var response = await SendAsync(team, "Ana Ruiz", "2026-11-14", "2026-11-15", null);

        await AssertProblem(response, HttpStatusCode.BadRequest, "all_non_working");
        (await team.RequestsOfAsync("Ana Ruiz")).Should().BeEmpty();
    }

    [Fact]
    public async Task A_range_of_only_holidays_says_so()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddHolidayAsync(new DateOnly(2026, 11, 16), "Company day");

        var response = await SendAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-16", null);

        await AssertProblem(response, HttpStatusCode.BadRequest, "day_is_holiday");
    }

    [Fact]
    public async Task Tentative_days_in_the_range_become_requested()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 11, 17), DayStatus.Tentative);

        var response = await SendAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-18", null);

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        KindOf(await MonthAsync(team, "Ana Ruiz"), "Ana Ruiz", "2026-11-17").Should().Be("Requested");
        (await team.RequestsOfAsync("Ana Ruiz")).Should().ContainSingle().Which.Days.Should().Be(3);
    }

    [Theory]
    [InlineData(DayStatus.Requested)]
    [InlineData(DayStatus.Confirmed)]
    public async Task Days_already_requested_or_confirmed_are_not_requested_again(DayStatus taken)
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 11, 18), taken);

        var response = await SendAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-20", null);

        await AssertProblem(response, HttpStatusCode.Conflict, "days_taken");
        var month = await MonthAsync(team, "Ana Ruiz");
        KindOf(month, "Ana Ruiz", "2026-11-18").Should().Be(taken.ToString());
        KindOf(month, "Ana Ruiz", "2026-11-17").Should().Be("Working");
        (await team.RequestsOfAsync("Ana Ruiz")).Should().BeEmpty();
    }

    [Fact]
    public async Task A_caller_on_no_team_gets_404()
    {
        var response = await _factory.ClientFor(await NewUserAsync()).PostAsJsonAsync("/api/requests",
            new { firstDay = "2026-11-16", lastDay = "2026-11-20" });

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Requests_stay_on_the_callers_own_row_and_team()
    {
        // Ana asks; Bo on another team sees nothing of it, and Dev (same team) sees the yellow days only.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Dev Patel");
        var other = await TestTeam.CreateAsync(_factory, managerName: "Olu Bello", teamName: "Other team");
        await other.AddMemberAsync("Bo Lund");

        await SendAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-17", "Private note");

        KindOf(await MonthAsync(team, "Dev Patel"), "Ana Ruiz", "2026-11-16").Should().Be("Requested");
        KindOf(await MonthAsync(other, "Bo Lund"), "Bo Lund", "2026-11-16").Should().Be("Working");
        (await other.RequestsOfAsync("Bo Lund")).Should().BeEmpty();
    }

    // ---- the quote the dialog shows as the dates change (L2-019 AC2, AC7) ----

    [Fact]
    public async Task The_quote_counts_working_days_without_changing_anything()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddHolidayAsync(new DateOnly(2026, 11, 18), "Company day");

        var response = await team.ClientFor("Ana Ruiz").GetAsync("/api/requests/quote?first=2026-11-16&last=2026-11-23");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await Json(response)).GetProperty("days").GetInt32().Should().Be(5);
        (await team.RequestsOfAsync("Ana Ruiz")).Should().BeEmpty();
        KindOf(await MonthAsync(team, "Ana Ruiz"), "Ana Ruiz", "2026-11-16").Should().Be("Working");
    }

    [Fact]
    public async Task The_quote_of_a_range_ending_before_it_starts_is_refused()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var response = await team.ClientFor("Ana Ruiz").GetAsync("/api/requests/quote?first=2026-12-11&last=2026-12-07");

        await AssertProblem(response, HttpStatusCode.BadRequest, "end_before_start");
    }

    [Fact]
    public async Task The_quote_of_a_malformed_date_is_a_validation_error()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var response = await team.ClientFor("Ana Ruiz").GetAsync("/api/requests/quote?first=tomorrow&last=2026-12-07");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    private static Task<HttpResponseMessage> SendAsync(TestTeam team, string caller, string? first, string? last, string? note) =>
        team.ClientFor(caller).PostAsJsonAsync("/api/requests", new { firstDay = first, lastDay = last, note });

    private static Task<JsonElement> MonthAsync(TestTeam team, string caller, string month = "2026-11") =>
        Sheet.MonthMembersTests.GetMonthAsync(team.ClientFor(caller), month);

    private async Task<Greenlit.Domain.Entities.User> NewUserAsync() => await TestTeam.LoneUserAsync(_factory);

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;

    private static async Task AssertProblem(HttpResponseMessage response, HttpStatusCode status, string code)
    {
        response.StatusCode.Should().Be(status);
        (await Json(response)).GetProperty("code").GetString().Should().Be(code);
    }

    private static string? KindOf(JsonElement month, string member, string date) =>
        month.GetProperty("members").EnumerateArray()
            .Single(m => m.GetProperty("name").GetString() == member)
            .GetProperty("cells").EnumerateArray()
            .Single(c => c.GetProperty("date").GetString() == date)
            .GetProperty("kind").GetString();
}
