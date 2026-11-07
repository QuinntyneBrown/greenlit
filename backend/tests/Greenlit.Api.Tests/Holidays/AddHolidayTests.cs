using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Domain.Enums;
using Greenlit.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace Greenlit.Api.Tests.Holidays;

/// <summary>
/// POST /api/team/holidays (L2-037). Design: docs/detailed-designs/teams/manage-holidays.
/// The clock reads Friday 6 November 2026; Friday 27 November 2026 is the offsite.
/// </summary>
public class AddHolidayTests : IClassFixture<FrozenClockApiFactory>
{
    private static readonly DateOnly Offsite = new(2026, 11, 27);

    private readonly FrozenClockApiFactory _factory;

    public AddHolidayTests(FrozenClockApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Adding_a_day_off_lists_it_and_turns_the_date_red_for_everyone()
    {
        // L2-037 AC4: the holiday is added and the date is red for everyone.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var maya = team.ClientFor("Maya Chen");

        var response = await AddAsync(maya, "2026-11-27", "Team offsite");

        response.StatusCode.Should().Be(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        var added = await response.Content.ReadFromJsonAsync<JsonElement>();
        added.GetProperty("date").GetString().Should().Be("2026-11-27");
        added.GetProperty("name").GetString().Should().Be("Team offsite");
        (await ListAsync(maya)).Select(h => (h.GetProperty("date").GetString(), h.GetProperty("name").GetString()))
            .Should().Equal(("2026-11-27", "Team offsite"));
        foreach (var member in new[] { "Maya Chen", "Ana Ruiz" })
        {
            var cell = await CellAsync(team.ClientFor(member), member, "2026-11-27");
            cell.GetProperty("kind").GetString().Should().Be("Holiday");
            cell.GetProperty("holidayName").GetString().Should().Be("Team offsite");
        }
    }

    [Fact]
    public async Task Days_members_already_hold_on_the_new_holiday_are_cleared()
    {
        // L2-037 AC4 ("stop counting against allowance") with ADR-003/ADR-008: a holiday never holds time off.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Ben Okafor");
        await team.SetDayAsync("Ana Ruiz", Offsite, DayStatus.Confirmed);
        await team.SetDayAsync("Ben Okafor", Offsite, DayStatus.Tentative);
        await team.SetDayAsync("Ben Okafor", Offsite.AddDays(-1), DayStatus.Tentative);

        (await AddAsync(team.ClientFor("Maya Chen"), "2026-11-27", "Team offsite")).StatusCode.Should().Be(HttpStatusCode.Created);

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var memberIds = new[] { team.MemberIdOf("Ana Ruiz"), team.MemberIdOf("Ben Okafor") };
        db.TimeOffDays.Where(d => memberIds.Contains(d.TeamMemberId)).Select(d => d.Date).ToList()
            .Should().Equal(Offsite.AddDays(-1));
    }

    [Fact]
    public async Task A_date_that_is_already_a_holiday_is_refused_naming_the_holiday()
    {
        // L2-037 AC2: "Mon 25 May is already a holiday (Spring bank holiday)."
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddHolidayAsync(new DateOnly(2026, 5, 25), "Spring bank holiday");
        var maya = team.ClientFor("Maya Chen");

        var response = await AddAsync(maya, "2026-05-25", "Another name");

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("code").GetString().Should().Be("holiday_exists");
        problem.GetProperty("detail").GetString().Should().Be("Mon 25 May is already a holiday (Spring bank holiday).");
        (await ListAsync(maya)).Select(h => h.GetProperty("name").GetString()).Should().Equal("Spring bank holiday");
    }

    [Fact]
    public async Task A_weekend_date_adds_nothing()
    {
        // L2-037 AC3: "That day is already a weekend".
        var team = await TestTeam.CreateAsync(_factory);
        var maya = team.ClientFor("Maya Chen");

        var response = await AddAsync(maya, "2026-11-28", "Saturday offsite");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString().Should().Be("day_is_weekend");
        (await ListAsync(maya)).Should().BeEmpty();
    }

    [Fact]
    public async Task A_weekend_that_is_already_a_holiday_is_reported_as_a_holiday()
    {
        // L2-037 AC2 over AC3: public holidays can fall on a weekend, and the date is still taken.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddHolidayAsync(new DateOnly(2026, 12, 26), "Boxing Day");

        var response = await AddAsync(team.ClientFor("Maya Chen"), "2026-12-26", "Another name");

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString().Should().Be("holiday_exists");
    }

    [Theory]
    [InlineData("2026-11-27", "")]
    [InlineData("2026-11-27", "   ")]
    [InlineData("", "Team offsite")]
    [InlineData("not a date", "Team offsite")]
    public async Task A_missing_name_or_date_is_refused_and_nothing_is_added(string date, string name)
    {
        // L2-037 AC2: "Give the day off a name."
        var team = await TestTeam.CreateAsync(_factory);
        var maya = team.ClientFor("Maya Chen");

        var response = await AddAsync(maya, date, name);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var errors = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors");
        errors.EnumerateObject().Should().NotBeEmpty();
        (await ListAsync(maya)).Should().BeEmpty();
    }

    [Fact]
    public async Task The_name_is_trimmed_and_may_not_be_longer_than_120_characters()
    {
        var team = await TestTeam.CreateAsync(_factory);
        var maya = team.ClientFor("Maya Chen");

        (await AddAsync(maya, "2026-11-27", new string('x', 121))).StatusCode.Should().Be(HttpStatusCode.BadRequest);
        (await AddAsync(maya, "2026-11-27", "  Team offsite  ")).StatusCode.Should().Be(HttpStatusCode.Created);

        (await ListAsync(maya)).Select(h => h.GetProperty("name").GetString()).Should().Equal("Team offsite");
    }

    [Fact]
    public async Task A_member_cannot_add_a_holiday()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var response = await AddAsync(team.ClientFor("Ana Ruiz"), "2026-11-27", "Team offsite");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await ListAsync(team.ClientFor("Maya Chen"))).Should().BeEmpty();
    }

    [Fact]
    public async Task Signed_out_callers_get_401()
    {
        var response = await AddAsync(_factory.CreateClient(), "2026-11-27", "Team offsite");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task A_holiday_joins_the_callers_own_team_only()
    {
        var design = await TestTeam.CreateAsync(_factory, "Maya Chen", teamName: "Design team");
        var sales = await TestTeam.CreateAsync(_factory, "Sam Lee", teamName: "Sales team");

        await AddAsync(sales.ClientFor("Sam Lee"), "2026-11-27", "Sales offsite");

        (await ListAsync(design.ClientFor("Maya Chen"))).Should().BeEmpty();
        (await CellAsync(design.ClientFor("Maya Chen"), "Maya Chen", "2026-11-27")).GetProperty("kind").GetString().Should().Be("Working");
        (await ListAsync(sales.ClientFor("Sam Lee"))).Should().ContainSingle();
    }

    private static Task<HttpResponseMessage> AddAsync(HttpClient client, string date, string name) =>
        client.PostAsJsonAsync("/api/team/holidays", new { date, name });

    private static async Task<List<JsonElement>> ListAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/team/holidays");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>();
        return body.GetProperty("holidays").EnumerateArray().ToList();
    }

    private static async Task<JsonElement> CellAsync(HttpClient client, string member, string date)
    {
        var response = await client.GetAsync($"/api/sheet?month={date[..7]}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var month = await response.Content.ReadFromJsonAsync<JsonElement>();
        return month.GetProperty("members").EnumerateArray().Single(m => m.GetProperty("name").GetString() == member)
            .GetProperty("cells").EnumerateArray().Single(c => c.GetProperty("date").GetString() == date);
    }
}
