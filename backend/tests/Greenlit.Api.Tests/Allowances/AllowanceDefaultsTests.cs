using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.Allowances;

/// <summary>
/// GET /api/team/settings and PUT /api/team/settings/allowances (L2-027).
/// Design: docs/detailed-designs/allowances/allowance-figures.
/// </summary>
public class AllowanceDefaultsTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public AllowanceDefaultsTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task A_new_team_starts_with_25_days_a_calendar_leave_year_and_5_days_of_carry_over()
    {
        // L2-027 AC1: the section shows Days per year, Leave year starts and Max carry-over.
        var team = await TestTeam.CreateAsync(_factory);

        var settings = await GetAsync(team.ClientFor("Maya Chen"));

        settings.GetProperty("defaultYearlyDays").GetInt32().Should().Be(25);
        settings.GetProperty("leaveYearStartMonth").GetInt32().Should().Be(1);
        settings.GetProperty("maxCarryOver").GetInt32().Should().Be(5);
    }

    [Fact]
    public async Task The_manager_saves_the_defaults_and_reads_them_back()
    {
        // L2-027 AC1: "Save changes" keeps what the manager entered.
        var team = await TestTeam.CreateAsync(_factory);
        var maya = team.ClientFor("Maya Chen");

        var saved = await maya.PutAsJsonAsync("/api/team/settings/allowances",
            new { defaultYearlyDays = 30, leaveYearStartMonth = 4, maxCarryOver = 8 });

        saved.StatusCode.Should().Be(HttpStatusCode.OK, await saved.Content.ReadAsStringAsync());
        var settings = await GetAsync(maya);
        settings.GetProperty("defaultYearlyDays").GetInt32().Should().Be(30);
        settings.GetProperty("leaveYearStartMonth").GetInt32().Should().Be(4);
        settings.GetProperty("maxCarryOver").GetInt32().Should().Be(8);
    }

    [Fact]
    public async Task Negative_days_per_year_are_refused_and_nothing_is_saved()
    {
        // L2-027 AC2: "Days per year must be 0 or more" / "Enter 0 or more days."
        var team = await TestTeam.CreateAsync(_factory);
        var maya = team.ClientFor("Maya Chen");

        var response = await maya.PutAsJsonAsync("/api/team/settings/allowances",
            new { defaultYearlyDays = -1, leaveYearStartMonth = 1, maxCarryOver = 5 });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("errors").GetProperty("DefaultYearlyDays")[0].GetString().Should().Be("Enter 0 or more days.");
        (await GetAsync(maya)).GetProperty("defaultYearlyDays").GetInt32().Should().Be(25);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(13)]
    public async Task A_leave_year_must_start_in_a_month_from_January_to_December(int month)
    {
        var team = await TestTeam.CreateAsync(_factory);

        var response = await team.ClientFor("Maya Chen").PutAsJsonAsync("/api/team/settings/allowances",
            new { defaultYearlyDays = 25, leaveYearStartMonth = month, maxCarryOver = 5 });

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("errors").GetProperty("LeaveYearStartMonth")[0].GetString().Should().Be("Choose a month from January to December.");
    }

    [Fact]
    public async Task Members_without_their_own_yearly_days_are_counted_for_the_banner()
    {
        // L2-027 AC4: "Two members have no allowance set" - they use the default until it is changed.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Ben Okafor");
        await team.AddMemberAsync("Cleo Park");
        await team.SetYearlyDaysAsync("Maya Chen", 25);
        await team.SetYearlyDaysAsync("Ana Ruiz", 25);

        var settings = await GetAsync(team.ClientFor("Maya Chen"));

        settings.GetProperty("membersWithoutAllowance").GetInt32().Should().Be(2);
    }

    [Fact]
    public async Task A_member_cannot_read_or_change_the_defaults()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var ana = team.ClientFor("Ana Ruiz");

        (await ana.GetAsync("/api/team/settings")).StatusCode.Should().Be(HttpStatusCode.Forbidden);
        var put = await ana.PutAsJsonAsync("/api/team/settings/allowances",
            new { defaultYearlyDays = 99, leaveYearStartMonth = 1, maxCarryOver = 5 });
        put.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await GetAsync(team.ClientFor("Maya Chen"))).GetProperty("defaultYearlyDays").GetInt32().Should().Be(25);
    }

    [Fact]
    public async Task Changing_the_defaults_changes_only_the_callers_team()
    {
        var ours = await TestTeam.CreateAsync(_factory);
        var theirs = await TestTeam.CreateAsync(_factory, "Other Manager", teamName: "Other team");

        await ours.ClientFor("Maya Chen").PutAsJsonAsync("/api/team/settings/allowances",
            new { defaultYearlyDays = 30, leaveYearStartMonth = 1, maxCarryOver = 5 });

        (await GetAsync(theirs.ClientFor("Other Manager"))).GetProperty("defaultYearlyDays").GetInt32().Should().Be(25);
    }

    [Fact]
    public async Task Signed_out_callers_get_401()
    {
        (await _factory.CreateClient().GetAsync("/api/team/settings")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private static async Task<JsonElement> GetAsync(HttpClient client)
    {
        var response = await client.GetAsync("/api/team/settings");
        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }
}
