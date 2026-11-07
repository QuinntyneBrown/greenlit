using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.People;

/// <summary>
/// POST /api/people/{id}/adjustments (L2-028). Design: docs/detailed-designs/allowances/adjust-allowance.
/// "Today" is Friday 6 November 2026 in London; the team's leave year is calendar 2026 with 25 yearly days.
/// </summary>
public class AdjustAllowanceTests : IClassFixture<FrozenClockApiFactory>
{
    private readonly FrozenClockApiFactory _factory;

    public AdjustAllowanceTests(FrozenClockApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Adding_days_records_the_adjustment_and_raises_days_left_everywhere()
    {
        // L2-028 AC3 and the journey: Maya gives Ben +2 "Long service"; his days left rise by 2 on the sheet, the year and his page.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ben Okafor");
        var maya = team.ClientFor("Maya Chen");
        var ben = team.MemberIdOf("Ben Okafor");
        (await LeftOnPersonAsync(maya, ben)).Should().Be(25);

        var response = await AdjustAsync(maya, ben, 2, "Long service");

        response.StatusCode.Should().Be(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        var added = await response.Content.ReadFromJsonAsync<JsonElement>();
        added.GetProperty("days").GetInt32().Should().Be(2);
        added.GetProperty("reason").GetString().Should().Be("Long service");
        added.GetProperty("effectiveDate").GetString().Should().Be("2026-11-06");

        var person = await PersonFiguresTests.PersonAsync(maya, ben);
        person.GetProperty("allowance").GetProperty("adjustments").GetInt32().Should().Be(2);
        person.GetProperty("allowance").GetProperty("allowance").GetInt32().Should().Be(27);
        person.GetProperty("allowance").GetProperty("left").GetInt32().Should().Be(27);
        person.GetProperty("adjustments").EnumerateArray()
            .Select(a => $"{a.GetProperty("days").GetInt32()} {a.GetProperty("reason").GetString()} {a.GetProperty("effectiveDate").GetString()}")
            .Should().Equal("2 Long service 2026-11-06");
        (await SheetLeftAsync(maya, "Ben Okafor")).Should().Be(27);
        (await YearLeftAsync(maya, "Ben Okafor")).Should().Be(27);
    }

    [Fact]
    public async Task Removing_days_with_a_negative_number_lowers_days_left()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ben Okafor");
        var maya = team.ClientFor("Maya Chen");

        var response = await AdjustAsync(maya, team.MemberIdOf("Ben Okafor"), -3, "Unpaid leave");

        response.StatusCode.Should().Be(HttpStatusCode.Created);
        (await LeftOnPersonAsync(maya, team.MemberIdOf("Ben Okafor"))).Should().Be(22);
    }

    [Fact]
    public async Task Zero_days_and_a_blank_reason_are_both_named_and_nothing_is_saved()
    {
        // L2-028 AC2.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ben Okafor");
        var maya = team.ClientFor("Maya Chen");
        var ben = team.MemberIdOf("Ben Okafor");

        var response = await AdjustAsync(maya, ben, 0, "  ");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var errors = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors");
        errors.GetProperty("Days")[0].GetString().Should().Be("Enter a number other than 0.");
        errors.GetProperty("Reason")[0].GetString().Should().Be("Give a reason so the history makes sense later.");
        (await PersonFiguresTests.PersonAsync(maya, ben)).GetProperty("adjustments").GetArrayLength().Should().Be(0);
    }

    [Fact]
    public async Task A_member_cannot_adjust_anyones_allowance_not_even_their_own()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var response = await AdjustAsync(team.ClientFor("Ana Ruiz"), team.MemberIdOf("Ana Ruiz"), 5, "Please");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await LeftOnPersonAsync(team.ClientFor("Maya Chen"), team.MemberIdOf("Ana Ruiz"))).Should().Be(25);
    }

    [Fact]
    public async Task Signing_in_is_required()
    {
        var response = await AdjustAsync(_factory.CreateClient(), Guid.NewGuid(), 2, "Long service");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task A_member_of_another_team_is_not_found_and_stays_unchanged()
    {
        var design = await TestTeam.CreateAsync(_factory);
        var sales = await TestTeam.CreateAsync(_factory, "Sam Lee", teamName: "Sales team");
        await sales.AddMemberAsync("Ben Okafor");

        var response = await AdjustAsync(design.ClientFor("Maya Chen"), sales.MemberIdOf("Ben Okafor"), 2, "Long service");

        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await LeftOnPersonAsync(sales.ClientFor("Sam Lee"), sales.MemberIdOf("Ben Okafor"))).Should().Be(25);
    }

    private static Task<HttpResponseMessage> AdjustAsync(HttpClient client, Guid member, int days, string reason) =>
        client.PostAsJsonAsync($"/api/people/{member}/adjustments", new { days, reason });

    private static async Task<int> LeftOnPersonAsync(HttpClient client, Guid member) =>
        (await PersonFiguresTests.PersonAsync(client, member)).GetProperty("allowance").GetProperty("left").GetInt32();

    private static async Task<int> SheetLeftAsync(HttpClient client, string name)
    {
        var month = await client.GetFromJsonAsync<JsonElement>("/api/sheet?month=2026-11");
        return month.GetProperty("members").EnumerateArray().Single(m => m.GetProperty("name").GetString() == name)
            .GetProperty("daysLeft").GetInt32();
    }

    private static async Task<int> YearLeftAsync(HttpClient client, string name)
    {
        var year = await client.GetFromJsonAsync<JsonElement>("/api/year?year=2026");
        return year.GetProperty("members").EnumerateArray().Single(m => m.GetProperty("name").GetString() == name)
            .GetProperty("allowance").GetProperty("left").GetInt32();
    }
}
