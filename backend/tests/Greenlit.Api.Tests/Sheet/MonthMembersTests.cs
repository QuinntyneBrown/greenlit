using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.Sheet;

/// <summary>
/// GET /api/sheet: who is on the month and in what order (L2-012), scoped to the
/// caller's team. Design: docs/detailed-designs/sheet/view-month.
/// </summary>
public class MonthMembersTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public MonthMembersTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Signed_out_callers_get_401()
    {
        var response = await _factory.CreateClient().GetAsync("/api/sheet?month=2026-11");
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task The_manager_sees_the_team_in_its_order_and_is_told_they_manage_it()
    {
        // L2-012 AC2: given the manager is signed in, the rows list the team in its order.
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Ben Okafor", withAccount: false);

        var month = await GetMonthAsync(team.ClientFor("Maya Chen"), "2026-11");

        month.GetProperty("month").GetString().Should().Be("2026-11");
        month.GetProperty("isManager").GetBoolean().Should().BeTrue();
        Names(month).Should().Equal("Maya Chen", "Ana Ruiz", "Ben Okafor");
        IsYou(month).Should().Equal(true, false, false);
    }

    [Fact]
    public async Task A_member_sees_their_own_row_first_marked_you()
    {
        // L2-012 AC2: given a member is signed in, their own row comes first and is marked "You".
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Ben Okafor");

        var month = await GetMonthAsync(team.ClientFor("Ben Okafor"), "2026-11");

        month.GetProperty("isManager").GetBoolean().Should().BeFalse();
        Names(month).Should().Equal("Ben Okafor", "Maya Chen", "Ana Ruiz");
        IsYou(month).Should().Equal(true, false, false);
    }

    [Fact]
    public async Task Each_member_carries_initials_for_the_avatar()
    {
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");
        await team.AddMemberAsync("Elif Yılmaz");

        var month = await GetMonthAsync(team.ClientFor("Maya Chen"), "2026-11");

        month.GetProperty("members").EnumerateArray().Select(m => m.GetProperty("initials").GetString())
            .Should().Equal("MC", "EY");
    }

    [Fact]
    public async Task The_month_shows_only_the_callers_team()
    {
        var ours = await TestTeam.CreateAsync(_factory, "Maya Chen");
        var theirs = await TestTeam.CreateAsync(_factory, "Other Manager", teamName: "Other team");
        await theirs.AddMemberAsync("Someone Else");

        var month = await GetMonthAsync(ours.ClientFor("Maya Chen"), "2026-11");

        Names(month).Should().Equal("Maya Chen");
    }

    [Fact]
    public async Task Without_a_month_the_current_month_in_the_teams_time_zone_is_shown()
    {
        // L2-012 AC1: the current month in the team's time zone.
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen", timeZone: "Pacific/Kiritimati");
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow,
            TimeZoneInfo.FindSystemTimeZoneById("Pacific/Kiritimati")).DateTime);

        var month = await GetMonthAsync(team.ClientFor("Maya Chen"), month: null);

        month.GetProperty("month").GetString().Should().Be(today.ToString("yyyy-MM"));
        month.GetProperty("today").GetString().Should().Be(today.ToString("yyyy-MM-dd"));
    }

    [Theory]
    [InlineData("2026-13")]
    [InlineData("November")]
    [InlineData("2026-1")]
    public async Task A_malformed_month_is_a_validation_problem(string bad)
    {
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");

        var response = await team.ClientFor("Maya Chen").GetAsync($"/api/sheet?month={bad}");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        response.Content.Headers.ContentType!.MediaType.Should().Be("application/problem+json");
    }

    [Fact]
    public async Task A_signed_in_user_without_a_team_gets_404()
    {
        var lonely = new Greenlit.Domain.Entities.User
        {
            Id = Guid.NewGuid(),
            Email = $"{Guid.NewGuid():N}@example.com",
            DisplayName = "No Team",
            PasswordHash = "x",
            CreatedUtc = DateTimeOffset.UtcNow,
        };
        await _factory.WriteAsync(db => db.Users.Add(lonely));

        var response = await _factory.ClientFor(lonely).GetAsync("/api/sheet?month=2026-11");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    internal static async Task<JsonElement> GetMonthAsync(HttpClient client, string? month)
    {
        var response = await client.GetAsync(month is null ? "/api/sheet" : $"/api/sheet?month={month}");
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.Should().Be(HttpStatusCode.OK, $"body: {body}");
        return JsonDocument.Parse(body).RootElement;
    }

    private static IEnumerable<string?> Names(JsonElement month) =>
        month.GetProperty("members").EnumerateArray().Select(m => m.GetProperty("name").GetString());

    private static IEnumerable<bool> IsYou(JsonElement month) =>
        month.GetProperty("members").EnumerateArray().Select(m => m.GetProperty("isYou").GetBoolean());
}
