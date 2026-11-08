using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Application.Abstractions;

namespace Greenlit.Api.Tests.Notifications;

/// <summary>
/// Every email is a branded HTML email with a plain-text twin (L2-053). Design: docs/detailed-designs/web-experience/branded-email.
/// Emails go to the recording sender; the app's origin in these tests is https://app.example.com.
/// </summary>
public class BrandedEmailTests : IClassFixture<GreenlitApiFactory>
{
    private const string Origin = "https://app.example.com";
    private readonly GreenlitApiFactory _factory;

    public BrandedEmailTests(GreenlitApiFactory factory) => _factory = factory;

    [Fact]
    public async Task The_invitation_is_branded_and_its_button_opens_the_invitation_link()
    {
        // L2-053 AC1, AC2.
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen", teamName: "Design team");
        var address = $"finn.{Guid.NewGuid():N}@northwind.studio";

        var response = await team.ClientFor("Maya Chen").PostAsJsonAsync("/api/team/members", new { name = "Finn Murphy", email = address, role = "Member" });

        response.StatusCode.Should().Be(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        var email = _factory.Emails.To(address).Should().ContainSingle().Subject;
        email.Subject.Should().Be("Maya Chen invited you to Design team on Greenlit");
        var link = $"{Origin}/accept-invite/{RecordingEmailSender.TokenIn(email)}";
        ExpectBranded(email, heading: "Join Design team", button: "Join the team", buttonHref: link);
        email.Html.Should().Contain("seven days");
        email.Body.Should().Contain(link);
    }

    [Fact]
    public async Task The_reset_email_is_branded_and_its_button_opens_the_reset_link()
    {
        // L2-053 AC3.
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");
        var address = team.EmailOf("Maya Chen");

        var response = await _factory.CreateClient().PostAsJsonAsync("/api/auth/password-reset", new { email = address });

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var email = _factory.Emails.To(address).Should().ContainSingle().Subject;
        email.Subject.Should().Be("Reset your Greenlit password");
        var link = $"{Origin}/reset-password/{RecordingEmailSender.ResetTokenIn(email)}";
        ExpectBranded(email, heading: "Choose a new password", button: "Reset your password", buttonHref: link);
        email.Html.Should().Contain("one hour");
        email.Body.Should().Contain(link);
    }

    [Fact]
    public async Task The_new_request_email_shows_the_days_as_requested_quotes_the_note_and_opens_requests()
    {
        // L2-053 AC4.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        var response = await team.ClientFor("Ana Ruiz").PostAsJsonAsync("/api/requests",
            new { firstDay = "2026-12-07", lastDay = "2026-12-11", note = "Visiting family in Lisbon, back on the 14th." });

        response.StatusCode.Should().Be(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        var email = _factory.Emails.To(team.EmailOf("Maya Chen")).Should().ContainSingle().Subject;
        email.Subject.Should().Be("Ana Ruiz asked for time off");
        ExpectBranded(email, heading: "Ana Ruiz asked for 7–11 Dec", button: "Review the request", buttonHref: $"{Origin}/requests");
        email.Html.Should().Contain("Requested").And.Contain("#f4c430");
        email.Html.Should().Contain("Visiting family in Lisbon, back on the 14th.");
        email.Body.Should().Contain($"{Origin}/requests");
    }

    [Fact]
    public async Task The_approval_email_shows_the_days_as_confirmed_and_opens_the_calendar()
    {
        // L2-053 AC5.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var id = await RequestAsync(team, "2026-12-07", "2026-12-11");

        var response = await team.ClientFor("Maya Chen").PostAsJsonAsync("/api/requests/approve", new { ids = new[] { id } });

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        var email = _factory.Emails.To(team.EmailOf("Ana Ruiz")).Should().ContainSingle().Subject;
        email.Subject.Should().Be("Your time off was approved");
        ExpectBranded(email, heading: "7–11 Dec is greenlit", button: "Open the calendar", buttonHref: $"{Origin}/");
        email.Html.Should().Contain("Confirmed").And.Contain("#179c52");
        email.Body.Should().Contain($"{Origin}/");
    }

    [Fact]
    public async Task The_decline_email_quotes_the_reason_shows_the_days_as_tentative_and_opens_the_calendar()
    {
        // L2-053 AC6.
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");
        var id = await RequestAsync(team, "2026-12-07", "2026-12-11");

        var response = await team.ClientFor("Maya Chen").PostAsJsonAsync($"/api/requests/{id}/decline",
            new { reason = "Two people are already out that week; could you try the week after?" });

        response.StatusCode.Should().Be(HttpStatusCode.OK, await response.Content.ReadAsStringAsync());
        var email = _factory.Emails.To(team.EmailOf("Ana Ruiz")).Should().ContainSingle().Subject;
        email.Subject.Should().Be("Your time off request was declined");
        ExpectBranded(email, heading: "7–11 Dec wasn’t approved", button: "Open the calendar", buttonHref: $"{Origin}/");
        email.Html.Should().Contain("Two people are already out that week; could you try the week after?");
        email.Html.Should().Contain("Tentative").And.Contain("#4a88f0");
    }

    [Fact]
    public async Task Text_in_an_email_is_escaped_so_a_note_cannot_inject_markup()
    {
        var team = await TestTeam.CreateAsync(_factory);
        await team.AddMemberAsync("Ana Ruiz");

        await team.ClientFor("Ana Ruiz").PostAsJsonAsync("/api/requests",
            new { firstDay = "2026-12-14", lastDay = "2026-12-15", note = "<script>alert('x')</script> & co" });

        var email = _factory.Emails.To(team.EmailOf("Maya Chen")).Should().ContainSingle().Subject;
        email.Html.Should().NotContain("<script>").And.Contain("&lt;script&gt;").And.Contain("&amp; co");
    }

    /// <summary>The lockup, the heading, the one button with its link, and the footer (L2-053 AC1).</summary>
    private static void ExpectBranded(EmailMessage email, string heading, string button, string buttonHref)
    {
        email.Html.Should().NotBeNullOrWhiteSpace();
        var html = email.Html!;
        html.Should().StartWith("<!doctype html>");
        html.Should().Contain("greenl").And.Contain("ı</span>t", "the wordmark has the green ı");
        html.Should().Contain("#179c52", "the mark is drawn in the brand green");
        html.Should().Contain($"<h1 ").And.Contain($">{heading}</h1>");
        html.Should().Contain($"href=\"{buttonHref}\"").And.Contain($">{button}</a>");
        html.Should().Contain("Greenlit · the vacation sheet your team already keeps");
        html.Should().Contain($"href=\"{Origin}\"");
        html.Should().NotContain("<link ").And.NotContain("<style", "mail clients ignore stylesheets; every style is inline");
    }

    private static async Task<Guid> RequestAsync(TestTeam team, string first, string last)
    {
        var response = await team.ClientFor("Ana Ruiz").PostAsJsonAsync("/api/requests", new { firstDay = first, lastDay = last });
        response.StatusCode.Should().Be(HttpStatusCode.Created, await response.Content.ReadAsStringAsync());
        return JsonDocument.Parse(await response.Content.ReadAsStringAsync()).RootElement.GetProperty("id").GetGuid();
    }
}
