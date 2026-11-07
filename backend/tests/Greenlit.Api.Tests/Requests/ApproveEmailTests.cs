using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.Requests;

/// <summary>
/// The decision email of an approval (L2-024 AC1, L2-043 AC3, with the Decisions switch on, its default).
/// Design: docs/detailed-designs/requests/approve-request. Emails go to the recording sender.
/// </summary>
public class ApproveEmailTests : IClassFixture<GreenlitApiFactory>
{
    private readonly GreenlitApiFactory _factory;

    public ApproveEmailTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task The_member_is_emailed_that_the_request_was_approved()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var id = await RequestAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-20");

        var response = await ApproveAsync(team, id);

        var result = (await Json(response))[0];
        result.GetProperty("emailed").GetBoolean().Should().BeTrue();
        var email = _factory.Emails.To(team.EmailOf("Ana Ruiz")).Should().ContainSingle().Subject;
        email.Subject.Should().Be("Your time off was approved");
        email.Body.Should().Contain("Hi Ana Ruiz,");
        email.Body.Should().Contain("Maya Chen approved your request for 16–20 Nov.");
        email.Body.Should().Contain("green");
    }

    [Fact]
    public async Task Each_member_is_emailed_once_when_several_requests_are_approved()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        await team.AddMemberAsync("Cleo Park");
        var ana = await RequestAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-20");
        var cleo = await RequestAsync(team, "Cleo Park", "2026-11-12", "2026-11-13");

        await ApproveAsync(team, ana, cleo);

        _factory.Emails.To(team.EmailOf("Ana Ruiz")).Should().HaveCount(1);
        _factory.Emails.To(team.EmailOf("Cleo Park")).Should().ContainSingle()
            .Which.Body.Should().Contain("12–13 Nov");
    }

    [Fact]
    public async Task A_row_with_its_own_email_address_is_emailed_there()
    {
        var team = await TestTeam.CreateAsync(_factory);
        var row = await team.AddMemberAsync("Finn Murphy", withAccount: false);
        await _factory.WriteAsync(db => db.TeamMembers.Single(m => m.Id == row.Id).Email = "finn.row@northwind.studio");
        await _factory.WriteAsync(db => db.TimeOffRequests.Add(new Greenlit.Domain.Entities.TimeOffRequest
        {
            Id = Guid.NewGuid(),
            TeamMemberId = row.Id,
            FirstDay = new DateOnly(2026, 11, 16),
            LastDay = new DateOnly(2026, 11, 16),
            CreatedUtc = DateTimeOffset.UtcNow,
        }));
        var id = (await Json(await team.ClientFor("Maya Chen").GetAsync("/api/requests")))[0].GetProperty("id").GetGuid();

        var result = (await Json(await ApproveAsync(team, id)))[0];

        result.GetProperty("emailed").GetBoolean().Should().BeTrue();
        _factory.Emails.To("finn.row@northwind.studio").Should().ContainSingle();
    }

    [Fact]
    public async Task A_member_with_no_address_is_not_emailed_and_the_approval_stands()
    {
        var team = await TestTeam.CreateAsync(_factory);
        var row = await team.AddMemberAsync("Finn Murphy", withAccount: false);
        await _factory.WriteAsync(db => db.TimeOffRequests.Add(new Greenlit.Domain.Entities.TimeOffRequest
        {
            Id = Guid.NewGuid(),
            TeamMemberId = row.Id,
            FirstDay = new DateOnly(2026, 11, 16),
            LastDay = new DateOnly(2026, 11, 16),
            CreatedUtc = DateTimeOffset.UtcNow,
        }));
        var id = (await Json(await team.ClientFor("Maya Chen").GetAsync("/api/requests")))[0].GetProperty("id").GetGuid();
        var before = _factory.Emails.Sent.Count;

        var response = await ApproveAsync(team, id);

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await Json(response))[0].GetProperty("emailed").GetBoolean().Should().BeFalse();
        _factory.Emails.Sent.Count.Should().Be(before);
        (await team.RequestsOfAsync("Finn Murphy")).Single().Status.Should().Be("Approved");
    }

    [Fact]
    public async Task An_email_that_cannot_be_sent_does_not_undo_the_approval()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var id = await RequestAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-20");

        _factory.Emails.Failing = true;
        HttpResponseMessage response;
        try
        {
            response = await ApproveAsync(team, id);
        }
        finally
        {
            _factory.Emails.Failing = false;
        }

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        (await Json(response))[0].GetProperty("emailed").GetBoolean().Should().BeFalse();
        (await team.RequestsOfAsync("Ana Ruiz")).Single().Status.Should().Be("Approved");
        _factory.Emails.To(team.EmailOf("Ana Ruiz")).Should().BeEmpty();
    }

    [Fact]
    public async Task A_refused_approval_sends_nothing()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var id = await RequestAsync(team, "Ana Ruiz", "2026-11-16", "2026-11-20");
        await ApproveAsync(team, id);
        var after = _factory.Emails.To(team.EmailOf("Ana Ruiz")).Count;

        var again = await ApproveAsync(team, id);

        again.StatusCode.Should().Be(HttpStatusCode.Conflict);
        _factory.Emails.To(team.EmailOf("Ana Ruiz")).Count.Should().Be(after);
    }

    private static async Task<Guid> RequestAsync(TestTeam team, string member, string first, string last)
    {
        var response = await team.ClientFor(member).PostAsJsonAsync("/api/requests", new { firstDay = first, lastDay = last });
        response.StatusCode.Should().Be(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        return (await Json(response)).GetProperty("id").GetGuid();
    }

    private static Task<HttpResponseMessage> ApproveAsync(TestTeam team, params Guid[] ids) =>
        team.ClientFor("Maya Chen").PostAsJsonAsync("/api/requests/approve", new { ids });

    private static async Task<JsonElement> Json(HttpResponseMessage response) =>
        JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement;
}
