using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Domain.Enums;
using Days = Greenlit.Domain.Enums.WorkingDays;

namespace Greenlit.Api.Tests.People;

/// <summary>
/// GET /api/people/{id}: the head and the figures of a person's page (L2-033 AC1). Design:
/// docs/detailed-designs/allowances/person-page. "Today" is Friday 6 November 2026.
/// </summary>
public class PersonFiguresTests : IClassFixture<FrozenClockApiFactory>
{
    private readonly FrozenClockApiFactory _factory;

    public PersonFiguresTests(FrozenClockApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Signed_out_callers_get_401()
    {
        var response = await _factory.CreateClient().GetAsync($"/api/people/{Guid.NewGuid()}");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task The_manager_gets_a_member_with_the_figures_of_the_allowance()
    {
        // L2-033 AC1: Allowance (incl. adjustments), Used, Booked, Requested, Tentative, and the days left.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.SetYearlyDaysAsync("Ana Ruiz", 25);
        await team.AddAdjustmentAsync("Ana Ruiz", 3, new DateOnly(2026, 1, 1));
        foreach (var day in new[] { 2, 5, 6, 9, 10 }) await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 11, day), DayStatus.Confirmed);
        await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 11, 16), DayStatus.Requested);
        await team.SetDayAsync("Ana Ruiz", new DateOnly(2026, 12, 29), DayStatus.Tentative);

        var person = await PersonAsync(team.ClientFor("Maya Chen"), team.MemberIdOf("Ana Ruiz"));

        person.GetProperty("id").GetGuid().Should().Be(team.MemberIdOf("Ana Ruiz"));
        person.GetProperty("name").GetString().Should().Be("Ana Ruiz");
        person.GetProperty("year").GetInt32().Should().Be(2026);
        var figures = person.GetProperty("allowance");
        figures.GetProperty("allowance").GetInt32().Should().Be(28);
        figures.GetProperty("adjustments").GetInt32().Should().Be(3);
        figures.GetProperty("used").GetInt32().Should().Be(2);
        figures.GetProperty("booked").GetInt32().Should().Be(3);
        figures.GetProperty("requested").GetInt32().Should().Be(1);
        figures.GetProperty("tentative").GetInt32().Should().Be(1);
        figures.GetProperty("left").GetInt32().Should().Be(23);
    }

    [Fact]
    public async Task The_head_has_the_job_title_when_they_joined_and_the_working_days()
    {
        // L2-033 AC1: job title, "Joined {Mon yyyy}", working days.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Dev Patel");
        await _factory.WriteAsync(db =>
        {
            var ana = db.TeamMembers.Single(m => m.Id == team.MemberIdOf("Ana Ruiz"));
            ana.JobTitle = "Product Designer";
            ana.JoinedOn = new DateOnly(2022, 3, 14);
            db.TeamMembers.Single(m => m.Id == team.MemberIdOf("Dev Patel")).WorkingDays = Days.Mon | Days.Tue | Days.Wed | Days.Thu;
        });
        var client = team.ClientFor("Maya Chen");

        var ana = await PersonAsync(client, team.MemberIdOf("Ana Ruiz"));
        var dev = await PersonAsync(client, team.MemberIdOf("Dev Patel"));

        ana.GetProperty("jobTitle").GetString().Should().Be("Product Designer");
        ana.GetProperty("joinedOn").GetString().Should().Be("2022-03-14");
        ana.GetProperty("workingDays").EnumerateArray().Select(d => d.GetString()).Should().Equal("Mon", "Tue", "Wed", "Thu", "Fri");
        dev.GetProperty("jobTitle").ValueKind.Should().Be(JsonValueKind.Null);
        dev.GetProperty("joinedOn").ValueKind.Should().Be(JsonValueKind.Null);
        dev.GetProperty("workingDays").EnumerateArray().Select(d => d.GetString()).Should().Equal("Mon", "Tue", "Wed", "Thu");
    }

    internal static async Task<JsonElement> PersonAsync(HttpClient client, Guid id)
    {
        var response = await client.GetAsync($"/api/people/{id}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }
}
