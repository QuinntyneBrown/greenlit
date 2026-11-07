using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace Greenlit.Api.Tests.Holidays;

/// <summary>
/// GET /api/team/holidays (L2-036). Design: docs/detailed-designs/teams/manage-holidays.
/// The clock reads Friday 6 November 2026, so the current year is 2026.
/// </summary>
public class TeamHolidaysTests : IClassFixture<FrozenClockApiFactory>
{
    private readonly FrozenClockApiFactory _factory;

    public TeamHolidaysTests(FrozenClockApiFactory factory) => _factory = factory;

    [Fact]
    public async Task The_manager_sees_this_years_holidays_in_date_order_with_their_dates_and_names()
    {
        // L2-036 AC1: one row per holiday with its date and name.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddHolidayAsync(new DateOnly(2026, 5, 25), "Spring bank holiday");
        await team.AddHolidayAsync(new DateOnly(2026, 1, 1), "New Year's Day");
        await team.AddHolidayAsync(new DateOnly(2026, 12, 25), "Christmas Day");

        var holidays = await GetAsync(team.ClientFor("Maya Chen"));

        holidays.GetProperty("year").GetInt32().Should().Be(2026);
        holidays.GetProperty("holidays").EnumerateArray()
            .Select(h => (h.GetProperty("date").GetString(), h.GetProperty("name").GetString()))
            .Should().Equal(("2026-01-01", "New Year's Day"), ("2026-05-25", "Spring bank holiday"), ("2026-12-25", "Christmas Day"));
        holidays.GetProperty("holidays")[0].GetProperty("id").GetGuid().Should().NotBeEmpty();
    }

    [Fact]
    public async Task A_team_without_holidays_gets_an_empty_list()
    {
        // L2-036 AC2: the section shows "No holidays yet".
        var team = await TestTeam.CreateAsync(_factory);

        var holidays = await GetAsync(team.ClientFor("Maya Chen"));

        holidays.GetProperty("holidays").GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task Only_the_current_year_of_the_callers_own_team_is_listed()
    {
        var design = await TestTeam.CreateAsync(_factory, "Maya Chen", teamName: "Design team");
        var sales = await TestTeam.CreateAsync(_factory, "Sam Lee", teamName: "Sales team");
        await design.AddHolidayAsync(new DateOnly(2026, 12, 25), "Christmas Day");
        await design.AddHolidayAsync(new DateOnly(2027, 1, 1), "New Year's Day");
        await sales.AddHolidayAsync(new DateOnly(2026, 7, 3), "Sales offsite");

        var holidays = await GetAsync(design.ClientFor("Maya Chen"));

        holidays.GetProperty("holidays").EnumerateArray().Select(h => h.GetProperty("name").GetString())
            .Should().Equal("Christmas Day");
    }

    [Fact]
    public async Task The_source_names_the_public_holiday_calendar_chosen_when_the_team_was_created()
    {
        // L2-036 AC1: "Public holidays: United Kingdom".
        var noor = await TestAccount.CreateAsync(_factory, "Noor Haddad");
        var created = await _factory.ClientFor(noor).PostAsJsonAsync("/api/teams",
            new { name = "Design team", timeZone = "Europe/London", holidayCountry = "GB", members = Array.Empty<object>() });
        var session = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("session").GetProperty("accessToken").GetString();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", session);

        var holidays = await GetAsync(client);

        holidays.GetProperty("source").GetString().Should().Be("Public holidays: United Kingdom");
        holidays.GetProperty("holidays").GetArrayLength().Should().BeGreaterThan(0);
    }

    [Fact]
    public async Task A_team_made_without_a_calendar_has_no_source()
    {
        var team = await TestTeam.CreateAsync(_factory);

        (await GetAsync(team.ClientFor("Maya Chen"))).GetProperty("source").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Theory]
    [InlineData("GB", "2027 UK bank holidays")]
    [InlineData("IE", "2027 Irish public holidays")]
    [InlineData("US", "2027 US federal holidays")]
    public async Task Next_years_public_holidays_are_offered_for_review_when_the_team_holds_none_of_them(string country, string name)
    {
        // L2-036 AC3: "2027 UK bank holidays are ready".
        var team = await TestTeam.CreateAsync(_factory);
        await team.SetHolidayCountryAsync(country);
        await team.AddHolidayAsync(new DateOnly(2026, 12, 25), "Christmas Day");

        var review = (await GetAsync(team.ClientFor("Maya Chen"))).GetProperty("review");

        review.GetProperty("year").GetInt32().Should().Be(2027);
        review.GetProperty("name").GetString().Should().Be(name);
    }

    [Fact]
    public async Task Nothing_is_offered_when_the_team_already_holds_next_years_holidays()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.SetHolidayCountryAsync("GB");
        await team.AddHolidayAsync(new DateOnly(2027, 1, 1), "New Year's Day");

        (await GetAsync(team.ClientFor("Maya Chen"))).GetProperty("review").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task Nothing_is_offered_again_once_the_manager_has_removed_next_years_holidays()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.SetHolidayCountryAsync("GB");
        await team.AddHolidayAsync(new DateOnly(2027, 1, 1), "New Year's Day");
        var maya = team.ClientFor("Maya Chen");
        var id = await HolidayIdAsync(team, "New Year's Day");
        (await maya.DeleteAsync($"/api/team/holidays/{id}")).StatusCode.Should().Be(HttpStatusCode.NoContent);

        (await GetAsync(maya)).GetProperty("review").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task A_team_with_no_calendar_is_offered_nothing()
    {
        var team = await TestTeam.CreateAsync(_factory);

        (await GetAsync(team.ClientFor("Maya Chen"))).GetProperty("review").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task A_team_created_with_a_calendar_already_holds_next_year_so_nothing_is_offered()
    {
        var noor = await TestAccount.CreateAsync(_factory, "Noor Haddad");
        var created = await _factory.ClientFor(noor).PostAsJsonAsync("/api/teams",
            new { name = "Design team", timeZone = "Europe/London", holidayCountry = "GB", members = Array.Empty<object>() });
        var session = (await created.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("session").GetProperty("accessToken").GetString();
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", session);

        (await GetAsync(client)).GetProperty("review").ValueKind.Should().Be(JsonValueKind.Null);
    }

    [Fact]
    public async Task A_member_cannot_read_the_holiday_settings()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var response = await team.ClientFor("Ana Ruiz").GetAsync("/api/team/holidays");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task Signed_out_callers_get_401()
    {
        var response = await _factory.CreateClient().GetAsync("/api/team/holidays");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private async Task<Guid> HolidayIdAsync(TestTeam team, string name)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return db.Holidays.Single(h => h.TeamId == team.Team.Id && h.Name == name).Id;
    }

    private static async Task<JsonElement> GetAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/team/holidays");
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }
}
