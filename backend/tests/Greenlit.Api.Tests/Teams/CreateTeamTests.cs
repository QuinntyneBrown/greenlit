using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Domain.Entities;
using Microsoft.Extensions.DependencyInjection;

namespace Greenlit.Api.Tests.Teams;

/// <summary>
/// POST /api/teams (L2-008). Design: docs/detailed-designs/teams/create-team.
/// The clock reads Friday 6 November 2026, so "this year and next" is 2026 and 2027.
/// </summary>
public class CreateTeamTests : IClassFixture<FrozenClockApiFactory>
{
    private readonly FrozenClockApiFactory _factory;

    public CreateTeamTests(FrozenClockApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Creating_a_team_makes_the_caller_its_manager_with_the_named_rows()
    {
        // L2-008 AC5: the team with its time zone, every named member a row, the creator the manager.
        var noor = await TestAccount.CreateAsync(_factory, "Noor Haddad");

        var response = await CreateAsync(_factory.ClientFor(noor), Request(members:
        [
            new { name = "Ana Ruiz", email = "ana@northwind.studio" },
            new { name = "Ben Okafor", email = (string?)null },
        ]));

        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.Should().Be(HttpStatusCode.Created, $"body: {body}");
        var created = JsonDocument.Parse(body).RootElement;
        created.GetProperty("name").GetString().Should().Be("Design team");
        created.GetProperty("invited").GetInt32().Should().Be(1);
        var teamId = created.GetProperty("teamId").GetGuid();

        var month = await MonthAsync(SessionClient(created), "2026-11");
        month.GetProperty("isManager").GetBoolean().Should().BeTrue();
        month.GetProperty("members").EnumerateArray().Select(m => m.GetProperty("name").GetString())
            .Should().Equal("Noor Haddad", "Ana Ruiz", "Ben Okafor");

        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<Greenlit.Infrastructure.Persistence.AppDbContext>();
        var team = db.Teams.Single(t => t.Id == teamId);
        team.ManagerUserId.Should().Be(noor.Id);
        team.TimeZone.Should().Be("Europe/London");
        db.TeamMembers.Single(m => m.TeamId == teamId && m.Name == "Ana Ruiz").Email.Should().Be("ana@northwind.studio");
        db.TeamMembers.Single(m => m.TeamId == teamId && m.Name == "Ben Okafor").UserId.Should().BeNull();
    }

    [Fact]
    public async Task Every_named_member_with_an_email_is_sent_an_invitation_and_counted()
    {
        // L2-008 AC5 and AC7, L2-010: "every member with an email must be sent an invitation".
        var noor = await TestAccount.CreateAsync(_factory, "Noor Haddad");

        var created = await CreatedAsync(_factory.ClientFor(noor), Request(members:
        [
            new { name = "Ana Ruiz", email = "created.ana@northwind.studio" },
            new { name = "Ben Okafor", email = (string?)null },
            new { name = "Cleo Park", email = "created.cleo@northwind.studio" },
        ]));

        created.GetProperty("invited").GetInt32().Should().Be(2);
        var ana = _factory.Emails.To("created.ana@northwind.studio").Should().ContainSingle().Subject;
        ana.Subject.Should().Contain("Noor Haddad").And.Contain("Design team");
        RecordingEmailSender.TokenIn(ana).Should().NotBeEmpty();
        _factory.Emails.To("created.cleo@northwind.studio").Should().ContainSingle();
    }

    [Fact]
    public async Task A_member_whose_invitation_cannot_be_sent_is_still_a_row_and_is_not_counted()
    {
        var noor = await TestAccount.CreateAsync(_factory, "Noor Haddad");
        _factory.Emails.Failing = true;
        JsonElement created;
        try
        {
            created = await CreatedAsync(_factory.ClientFor(noor), Request(members: [new { name = "Ana Ruiz", email = "unsent.ana@northwind.studio" }]));
        }
        finally
        {
            _factory.Emails.Failing = false;
        }

        created.GetProperty("invited").GetInt32().Should().Be(0);
        var month = await MonthAsync(SessionClient(created), "2026-11");
        month.GetProperty("members").EnumerateArray().Select(m => m.GetProperty("name").GetString())
            .Should().Equal("Noor Haddad", "Ana Ruiz");
    }

    [Fact]
    public async Task The_new_session_names_the_team_and_the_creators_row_as_manager()
    {
        var noor = await TestAccount.CreateAsync(_factory);

        var created = await CreatedAsync(_factory.ClientFor(noor), Request());

        var session = created.GetProperty("session");
        session.GetProperty("teamId").GetGuid().Should().Be(created.GetProperty("teamId").GetGuid());
        session.GetProperty("role").GetString().Should().Be("Manager");
        session.GetProperty("displayName").GetString().Should().Be("Noor Haddad");
        var token = new JwtSecurityTokenHandler().ReadJwtToken(session.GetProperty("accessToken").GetString());
        token.Subject.Should().Be(noor.Id.ToString());
        token.Claims.Should().Contain(c => c.Type == "team_id" && c.Value == created.GetProperty("teamId").GetString());
        token.Claims.Should().Contain(c => c.Type == "team_member_id");
        token.Claims.Should().Contain(c => c.Type == "role" && c.Value == "Manager");
    }

    [Fact]
    public async Task Rows_left_empty_are_ignored_and_names_are_trimmed()
    {
        var noor = await TestAccount.CreateAsync(_factory);

        var created = await CreatedAsync(_factory.ClientFor(noor), Request(name: "  Design team  ", members:
        [
            new { name = "  Ana Ruiz ", email = (string?)" " },
            new { name = "", email = (string?)"" },
            new { name = "  ", email = (string?)null },
        ]));

        created.GetProperty("name").GetString().Should().Be("Design team");
        var month = await MonthAsync(SessionClient(created), "2026-11");
        month.GetProperty("members").EnumerateArray().Select(m => m.GetProperty("name").GetString())
            .Should().Equal("Noor Haddad", "Ana Ruiz");
    }

    [Fact]
    public async Task United_Kingdom_copies_the_bank_holidays_of_this_year_and_next()
    {
        // L2-008 AC5: that country's public holidays become team holidays (ADR-005).
        var noor = await TestAccount.CreateAsync(_factory);

        var created = await CreatedAsync(_factory.ClientFor(noor), Request(holidayCountry: "GB"));

        var client = SessionClient(created);
        (await HolidaysAsync(client, 2026)).Should().Equal(
            ("2026-01-01", "New Year's Day"),
            ("2026-04-03", "Good Friday"),
            ("2026-04-06", "Easter Monday"),
            ("2026-05-04", "Early May bank holiday"),
            ("2026-05-25", "Spring bank holiday"),
            ("2026-08-31", "Summer bank holiday"),
            ("2026-12-25", "Christmas Day"),
            ("2026-12-28", "Boxing Day (substitute)"));
        (await HolidaysAsync(client, 2027)).Should().Equal(
            ("2027-01-01", "New Year's Day"),
            ("2027-03-26", "Good Friday"),
            ("2027-03-29", "Easter Monday"),
            ("2027-05-03", "Early May bank holiday"),
            ("2027-05-31", "Spring bank holiday"),
            ("2027-08-30", "Summer bank holiday"),
            ("2027-12-27", "Christmas Day (substitute)"),
            ("2027-12-28", "Boxing Day (substitute)"));
        (await HolidaysAsync(client, 2028)).Should().BeEmpty();
    }

    [Fact]
    public async Task Ireland_copies_the_irish_public_holidays()
    {
        var noor = await TestAccount.CreateAsync(_factory);

        var created = await CreatedAsync(_factory.ClientFor(noor), Request(timeZone: "Europe/Dublin", holidayCountry: "IE"));

        (await HolidaysAsync(SessionClient(created), 2026)).Should().Equal(
            ("2026-01-01", "New Year's Day"),
            ("2026-02-02", "St Brigid's Day"),
            ("2026-03-17", "St Patrick's Day"),
            ("2026-04-06", "Easter Monday"),
            ("2026-05-04", "May bank holiday"),
            ("2026-06-01", "June bank holiday"),
            ("2026-08-03", "August bank holiday"),
            ("2026-10-26", "October bank holiday"),
            ("2026-12-25", "Christmas Day"),
            ("2026-12-28", "St Stephen's Day (substitute)"));
    }

    [Fact]
    public async Task United_States_copies_the_federal_holidays_on_their_observed_days()
    {
        var noor = await TestAccount.CreateAsync(_factory);

        var created = await CreatedAsync(_factory.ClientFor(noor), Request(timeZone: "America/New_York", holidayCountry: "US"));

        (await HolidaysAsync(SessionClient(created), 2026)).Should().Equal(
            ("2026-01-01", "New Year's Day"),
            ("2026-01-19", "Martin Luther King Jr. Day"),
            ("2026-02-16", "Washington's Birthday"),
            ("2026-05-25", "Memorial Day"),
            ("2026-06-19", "Juneteenth"),
            ("2026-07-03", "Independence Day (observed)"),
            ("2026-09-07", "Labor Day"),
            ("2026-10-12", "Columbus Day"),
            ("2026-11-11", "Veterans Day"),
            ("2026-11-26", "Thanksgiving Day"),
            ("2026-12-25", "Christmas Day"));
    }

    [Fact]
    public async Task None_stores_no_holidays()
    {
        var noor = await TestAccount.CreateAsync(_factory);

        var created = await CreatedAsync(_factory.ClientFor(noor), Request(holidayCountry: "none"));

        (await HolidaysAsync(SessionClient(created), 2026)).Should().BeEmpty();
    }

    [Fact]
    public async Task An_empty_name_and_a_row_with_an_email_but_no_name_are_refused_naming_each_field()
    {
        // L2-008 AC4: "Give your team a name" and "Give this member a name", and nothing is created.
        var noor = await TestAccount.CreateAsync(_factory);

        var response = await CreateAsync(_factory.ClientFor(noor), Request(name: " ", members:
        [
            new { name = "Ana Ruiz", email = "ana@northwind.studio" },
            new { name = "", email = "cleo@northwind.studio" },
        ]));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var errors = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors");
        errors.GetProperty("Name")[0].GetString().Should().Be("Give your team a name.");
        errors.GetProperty("Members[1].Name")[0].GetString().Should().Be("Give this member a name.");
        errors.EnumerateObject().Should().HaveCount(2);
        await ShouldHaveNoTeamAsync(noor);
    }

    [Theory]
    [InlineData("Europe/Berlin")]
    [InlineData("Mars/Olympus")]
    [InlineData("")]
    public async Task A_time_zone_outside_the_offered_list_is_refused(string timeZone)
    {
        // L2-008 AC2: London, Dublin, "Paris, Berlin (CET)" and New York.
        var noor = await TestAccount.CreateAsync(_factory);

        var response = await CreateAsync(_factory.ClientFor(noor), Request(timeZone: timeZone));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var errors = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors");
        errors.GetProperty("TimeZone")[0].GetString().Should().Be("Choose a time zone from the list.");
    }

    [Fact]
    public async Task A_holiday_calendar_outside_the_offered_list_is_refused()
    {
        var noor = await TestAccount.CreateAsync(_factory);

        var response = await CreateAsync(_factory.ClientFor(noor), Request(holidayCountry: "FR"));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var errors = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors");
        errors.GetProperty("HolidayCountry")[0].GetString().Should().Be("Choose a public-holiday calendar from the list.");
    }

    [Fact]
    public async Task A_name_longer_than_120_characters_is_refused()
    {
        var noor = await TestAccount.CreateAsync(_factory);

        var response = await CreateAsync(_factory.ClientFor(noor), Request(name: new string('a', 121)));

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var errors = (await response.Content.ReadFromJsonAsync<JsonElement>()).GetProperty("errors");
        errors.GetProperty("Name")[0].GetString().Should().Be("Use 120 characters or fewer.");
    }

    [Fact]
    public async Task A_manager_cannot_create_a_second_team()
    {
        // L2-008 AC8: one team per person.
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");

        var response = await CreateAsync(team.ClientFor("Maya Chen"), Request(name: "Second team"));

        await ShouldBeTeamExistsAsync(response);
    }

    [Fact]
    public async Task A_member_with_a_row_on_a_team_cannot_create_one()
    {
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");
        await team.AddMemberAsync("Ana Ruiz");

        var response = await CreateAsync(team.ClientFor("Ana Ruiz"), Request(name: "Ana's team"));

        await ShouldBeTeamExistsAsync(response);
    }

    [Fact]
    public async Task Creating_twice_keeps_only_the_first_team()
    {
        var noor = await TestAccount.CreateAsync(_factory);
        var client = _factory.ClientFor(noor);
        await CreatedAsync(client, Request());

        var again = await CreateAsync(client, Request(name: "Another team"));

        await ShouldBeTeamExistsAsync(again);
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<Greenlit.Infrastructure.Persistence.AppDbContext>();
        db.Teams.Count(t => t.ManagerUserId == noor.Id).Should().Be(1);
    }

    [Fact]
    public async Task Without_a_session_the_request_is_unauthorized()
    {
        var response = await CreateAsync(_factory.CreateClient(), Request());

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    private static object Request(
        string name = "Design team",
        string timeZone = "Europe/London",
        string holidayCountry = "GB",
        object[]? members = null) =>
        new { name, timeZone, holidayCountry, members = members ?? [] };

    private static Task<HttpResponseMessage> CreateAsync(HttpClient client, object request) =>
        client.PostAsJsonAsync("/api/teams", request);

    private static async Task<JsonElement> CreatedAsync(HttpClient client, object request)
    {
        var response = await CreateAsync(client, request);
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.Should().Be(HttpStatusCode.Created, $"body: {body}");
        return JsonDocument.Parse(body).RootElement;
    }

    /// <summary>A client carrying the session the create response returned.</summary>
    private HttpClient SessionClient(JsonElement created)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue(
            "Bearer", created.GetProperty("session").GetProperty("accessToken").GetString());
        return client;
    }

    private static async Task<JsonElement> MonthAsync(HttpClient client, string month)
    {
        var response = await client.GetAsync($"/api/sheet?month={month}");
        response.StatusCode.Should().Be(HttpStatusCode.OK);
        return await response.Content.ReadFromJsonAsync<JsonElement>();
    }

    /// <summary>The year's holidays as the first row of the sheet shows them, month by month.</summary>
    private static async Task<List<(string Date, string Name)>> HolidaysAsync(HttpClient client, int year)
    {
        var holidays = new List<(string, string)>();
        for (var m = 1; m <= 12; m++)
        {
            var month = await MonthAsync(client, $"{year}-{m:00}");
            holidays.AddRange(month.GetProperty("members")[0].GetProperty("cells").EnumerateArray()
                .Where(c => c.GetProperty("kind").GetString() == "Holiday")
                .Select(c => (c.GetProperty("date").GetString()!, c.GetProperty("holidayName").GetString()!)));
        }
        return holidays;
    }

    private async Task ShouldHaveNoTeamAsync(User user)
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<Greenlit.Infrastructure.Persistence.AppDbContext>();
        db.Teams.Any(t => t.ManagerUserId == user.Id).Should().BeFalse();
    }

    private static async Task ShouldBeTeamExistsAsync(HttpResponseMessage response)
    {
        response.StatusCode.Should().Be(HttpStatusCode.Conflict);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("code").GetString().Should().Be("team_exists");
        problem.GetProperty("detail").GetString().Should().Be("You're already on a team.");
    }
}
