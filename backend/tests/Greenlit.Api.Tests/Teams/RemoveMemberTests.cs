using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Domain.Enums;
using Greenlit.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace Greenlit.Api.Tests.Teams;

/// <summary>
/// DELETE /api/team/members/{id} (L2-011). Design: docs/detailed-designs/teams/remove-member.
/// "Today" is Friday 6 November 2026 in London.
/// </summary>
public class RemoveMemberTests : IClassFixture<FrozenClockApiFactory>
{
    private readonly FrozenClockApiFactory _factory;

    public RemoveMemberTests(FrozenClockApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Removing_a_member_takes_their_row_off_the_sheet_the_year_and_the_requests_and_closes_their_page()
    {
        // L2-011 AC2 and the journey: Maya removes Finn; his row leaves the calendar.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Finn Murphy");
        await team.AddMemberAsync("Ben Okafor");
        await team.AddRequestAsync("Finn Murphy", new(2026, 11, 16), new(2026, 11, 17), RequestStatus.Pending, dayStatus: DayStatus.Requested);
        var maya = team.ClientFor("Maya Chen");
        var finn = team.MemberIdOf("Finn Murphy");
        (await NamesOnSheetAsync(maya)).Should().Contain("Finn Murphy");
        (await PendingRequestsAsync(maya)).Should().Be(1);

        var response = await RemoveAsync(maya, finn);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent, await response.Content.ReadAsStringAsync());
        (await NamesOnSheetAsync(maya)).Should().Equal("Maya Chen", "Ben Okafor");
        (await NamesInYearAsync(maya)).Should().Equal("Maya Chen", "Ben Okafor");
        (await PendingRequestsAsync(maya)).Should().Be(0);
        (await maya.GetFromJsonAsync<JsonElement>("/api/requests/counts")).GetProperty("pending").GetInt32().Should().Be(0);
        var page = await maya.GetAsync($"/api/people/{finn}");
        page.StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await page.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString().Should().Be("person_not_found");
    }

    [Fact]
    public async Task The_removed_members_row_and_days_are_kept_for_the_history()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Finn Murphy");
        await team.SetDayAsync("Finn Murphy", new(2026, 10, 20), DayStatus.Confirmed);
        await team.SetDayAsync("Finn Murphy", new(2026, 10, 21), DayStatus.Confirmed);
        var finn = team.MemberIdOf("Finn Murphy");

        (await RemoveAsync(team.ClientFor("Maya Chen"), finn)).StatusCode.Should().Be(HttpStatusCode.NoContent);

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        (await db.TeamMembers.IgnoreQueryFilters().AnyAsync(m => m.Id == finn)).Should().BeTrue();
        (await db.TimeOffDays.IgnoreQueryFilters().CountAsync(d => d.TeamMemberId == finn)).Should().Be(2);
    }

    [Fact]
    public async Task Removing_someone_who_is_already_removed_is_not_found()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Finn Murphy");
        var maya = team.ClientFor("Maya Chen");
        var finn = team.MemberIdOf("Finn Murphy");
        await RemoveAsync(maya, finn);

        var again = await RemoveAsync(maya, finn);

        again.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task The_manager_cannot_remove_themselves()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Finn Murphy");
        var maya = team.ClientFor("Maya Chen");

        var response = await RemoveAsync(maya, team.MemberIdOf("Maya Chen"));

        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("code").GetString().Should().Be("cannot_remove_self");
        (await NamesOnSheetAsync(maya)).Should().Contain("Maya Chen");
    }

    [Fact]
    public async Task A_member_cannot_remove_anyone()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Finn Murphy");

        var response = await RemoveAsync(team.ClientFor("Ana Ruiz"), team.MemberIdOf("Finn Murphy"));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await NamesOnSheetAsync(team.ClientFor("Maya Chen"))).Should().Contain("Finn Murphy");
    }

    [Fact]
    public async Task Signing_in_is_required()
    {
        var response = await RemoveAsync(_factory.CreateClient(), Guid.NewGuid());

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task A_member_of_another_team_is_not_found_and_stays_on_their_sheet()
    {
        var design = await TestTeam.CreateAsync(_factory);
        var sales = await TestTeam.CreateAsync(_factory, "Sam Lee", teamName: "Sales team");
        await sales.AddMemberAsync("Ben Okafor");

        var response = await RemoveAsync(design.ClientFor("Maya Chen"), sales.MemberIdOf("Ben Okafor"));

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await NamesOnSheetAsync(sales.ClientFor("Sam Lee"))).Should().Contain("Ben Okafor");
    }

    private static Task<HttpResponseMessage> RemoveAsync(HttpClient client, Guid member) =>
        client.DeleteAsync($"/api/team/members/{member}");

    private static async Task<List<string>> NamesOnSheetAsync(HttpClient client)
    {
        var month = await client.GetFromJsonAsync<JsonElement>("/api/sheet?month=2026-11");
        return month.GetProperty("members").EnumerateArray().Select(m => m.GetProperty("name").GetString()!).ToList();
    }

    private static async Task<List<string>> NamesInYearAsync(HttpClient client)
    {
        var year = await client.GetFromJsonAsync<JsonElement>("/api/year?year=2026");
        return year.GetProperty("members").EnumerateArray().Select(m => m.GetProperty("name").GetString()!).ToList();
    }

    private static async Task<int> PendingRequestsAsync(HttpClient client) =>
        (await client.GetFromJsonAsync<JsonElement>("/api/requests?status=Pending")).GetArrayLength();
}
