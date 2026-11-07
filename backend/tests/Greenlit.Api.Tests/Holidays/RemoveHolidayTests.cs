using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Domain.Enums;
using Greenlit.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Greenlit.Api.Tests.Holidays;

/// <summary>
/// DELETE /api/team/holidays/{id} and POST /api/team/holidays/{id}/restore (L2-038).
/// Design: docs/detailed-designs/teams/manage-holidays. The clock reads Friday 6 November 2026.
/// </summary>
public class RemoveHolidayTests : IClassFixture<FrozenClockApiFactory>
{
    private static readonly DateOnly Spring = new(2026, 5, 25);

    private readonly FrozenClockApiFactory _factory;

    public RemoveHolidayTests(FrozenClockApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Removing_a_holiday_makes_the_date_a_working_day_for_the_team()
    {
        // L2-038 AC2: the date becomes a working day for the team.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddHolidayAsync(Spring, "Spring bank holiday");
        var maya = team.ClientFor("Maya Chen");
        var id = (await ListAsync(maya)).Single().GetProperty("id").GetGuid();

        var response = await maya.DeleteAsync($"/api/team/holidays/{id}");

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await ListAsync(maya)).Should().BeEmpty();
        foreach (var member in new[] { "Maya Chen", "Ana Ruiz" })
            (await CellAsync(team.ClientFor(member), member, "2026-05-25")).GetProperty("kind").GetString().Should().Be("Working");
    }

    [Fact]
    public async Task Undo_restores_the_holiday_with_its_name_and_date()
    {
        // L2-038 AC3: the holiday is restored.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddHolidayAsync(Spring, "Spring bank holiday");
        var maya = team.ClientFor("Maya Chen");
        var id = (await ListAsync(maya)).Single().GetProperty("id").GetGuid();
        await maya.DeleteAsync($"/api/team/holidays/{id}");

        var response = await maya.PostAsync($"/api/team/holidays/{id}/restore", null);

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        var restored = await response.Content.ReadFromJsonAsync<JsonElement>();
        restored.GetProperty("id").GetGuid().Should().Be(id);
        restored.GetProperty("date").GetString().Should().Be("2026-05-25");
        restored.GetProperty("name").GetString().Should().Be("Spring bank holiday");
        (await ListAsync(maya)).Select(h => h.GetProperty("name").GetString()).Should().Equal("Spring bank holiday");
        var cell = await CellAsync(maya, "Maya Chen", "2026-05-25");
        cell.GetProperty("kind").GetString().Should().Be("Holiday");
        cell.GetProperty("holidayName").GetString().Should().Be("Spring bank holiday");
    }

    [Fact]
    public async Task Undo_clears_days_booked_while_the_date_was_a_working_day()
    {
        // ADR-003, ADR-008: a holiday never holds time off, so a restore clears what was booked meanwhile.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddHolidayAsync(Spring, "Spring bank holiday");
        var maya = team.ClientFor("Maya Chen");
        var id = (await ListAsync(maya)).Single().GetProperty("id").GetGuid();
        await maya.DeleteAsync($"/api/team/holidays/{id}");
        await team.SetDayAsync("Ana Ruiz", Spring, DayStatus.Tentative);

        (await maya.PostAsync($"/api/team/holidays/{id}/restore", null)).StatusCode.Should().Be(HttpStatusCode.OK);

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.TimeOffDays.Where(d => d.TeamMemberId == team.MemberIdOf("Ana Ruiz")).Should().BeEmpty();
    }

    [Fact]
    public async Task Restoring_a_holiday_that_is_not_removed_changes_nothing()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddHolidayAsync(Spring, "Spring bank holiday");
        var maya = team.ClientFor("Maya Chen");
        var id = (await ListAsync(maya)).Single().GetProperty("id").GetGuid();

        (await maya.PostAsync($"/api/team/holidays/{id}/restore", null)).StatusCode.Should().Be(HttpStatusCode.OK);

        (await ListAsync(maya)).Should().ContainSingle();
    }

    [Fact]
    public async Task Adding_a_removed_date_again_revives_its_row_under_the_new_name()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddHolidayAsync(Spring, "Spring bank holiday");
        var maya = team.ClientFor("Maya Chen");
        var id = (await ListAsync(maya)).Single().GetProperty("id").GetGuid();
        await maya.DeleteAsync($"/api/team/holidays/{id}");

        var response = await maya.PostAsJsonAsync("/api/team/holidays", new { date = "2026-05-25", name = "Company day" });

        response.StatusCode.Should().Be(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        var list = await ListAsync(maya);
        list.Should().ContainSingle().Which.GetProperty("name").GetString().Should().Be("Company day");
        list.Single().GetProperty("id").GetGuid().Should().Be(id);
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        db.Holidays.IgnoreQueryFilters().Count(h => h.TeamId == team.Team.Id).Should().Be(1);
    }

    [Fact]
    public async Task A_removed_holiday_is_gone_from_the_allowance_rules_too()
    {
        // L2-038 AC1: "It will count against allowances again for anyone who books it."
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddHolidayAsync(Spring, "Spring bank holiday");
        var maya = team.ClientFor("Maya Chen");
        var id = (await ListAsync(maya)).Single().GetProperty("id").GetGuid();
        await maya.DeleteAsync($"/api/team/holidays/{id}");

        var response = await team.ClientFor("Ana Ruiz").PutAsJsonAsync("/api/sheet/days",
            new { memberId = team.MemberIdOf("Ana Ruiz"), dates = new[] { "2026-05-25" }, status = "Tentative" });

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task A_holiday_of_another_team_or_one_that_does_not_exist_is_a_404()
    {
        var design = await TestTeam.CreateAsync(_factory, "Maya Chen", teamName: "Design team");
        var sales = await TestTeam.CreateAsync(_factory, "Sam Lee", teamName: "Sales team");
        await sales.AddHolidayAsync(Spring, "Sales day");
        var salesId = (await ListAsync(sales.ClientFor("Sam Lee"))).Single().GetProperty("id").GetGuid();
        var maya = design.ClientFor("Maya Chen");

        (await maya.DeleteAsync($"/api/team/holidays/{salesId}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await maya.PostAsync($"/api/team/holidays/{salesId}/restore", null)).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await maya.DeleteAsync($"/api/team/holidays/{Guid.NewGuid()}")).StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await ListAsync(sales.ClientFor("Sam Lee"))).Should().ContainSingle();
    }

    [Fact]
    public async Task A_member_cannot_remove_or_restore_a_holiday()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddHolidayAsync(Spring, "Spring bank holiday");
        var id = (await ListAsync(team.ClientFor("Maya Chen"))).Single().GetProperty("id").GetGuid();
        var ana = team.ClientFor("Ana Ruiz");

        (await ana.DeleteAsync($"/api/team/holidays/{id}")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await ana.PostAsync($"/api/team/holidays/{id}/restore", null)).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await ListAsync(team.ClientFor("Maya Chen"))).Should().ContainSingle();
    }

    [Fact]
    public async Task Signed_out_callers_get_401()
    {
        var client = _factory.CreateClient();

        (await client.DeleteAsync($"/api/team/holidays/{Guid.NewGuid()}")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
        (await client.PostAsync($"/api/team/holidays/{Guid.NewGuid()}/restore", null)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

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
