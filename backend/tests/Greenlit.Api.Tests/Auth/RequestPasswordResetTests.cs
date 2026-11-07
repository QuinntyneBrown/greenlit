using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace Greenlit.Api.Tests.Auth;

/// <summary>
/// POST /api/auth/password-reset (L2-002). Design: docs/detailed-designs/identity-and-access/reset-password.
/// </summary>
public class RequestPasswordResetTests : IClassFixture<FrozenClockApiFactory>
{
    private readonly FrozenClockApiFactory _factory;

    public RequestPasswordResetTests(FrozenClockApiFactory factory) => _factory = factory;

    [Fact]
    public async Task Asking_for_a_known_address_emails_it_a_reset_link()
    {
        // L2-002 AC2: a reset link is on its way.
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");
        var email = team.EmailOf("Maya Chen");

        var response = await RequestAsync(email);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        var sent = _factory.Emails.To(email);
        sent.Should().ContainSingle();
        RecordingEmailSender.ResetTokenIn(sent[0]).Should().NotBeNullOrWhiteSpace();
        sent[0].Body.Should().Contain("one hour");
    }

    [Fact]
    public async Task Asking_for_an_unknown_address_answers_the_same_and_sends_nothing()
    {
        // L2-002 AC2: the answer does not reveal whether the account exists.
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");
        var known = await RequestAsync(team.EmailOf("Maya Chen"));

        var unknown = await RequestAsync("nobody.here@northwind.studio");

        known.StatusCode.Should().Be(HttpStatusCode.NoContent);
        unknown.StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await unknown.Content.ReadAsStringAsync()).Should().Be(await known.Content.ReadAsStringAsync());
        _factory.Emails.To("nobody.here@northwind.studio").Should().BeEmpty();
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("maya@northwind")]
    [InlineData("not an email")]
    public async Task An_empty_or_malformed_address_is_refused_and_sends_nothing(string email)
    {
        // L2-002 AC4.
        var before = _factory.Emails.Sent.Count;

        var response = await RequestAsync(email);

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("errors").GetProperty("Email")[0].GetString().Should().Be("Enter a valid email address.");
        _factory.Emails.Sent.Count.Should().Be(before);
    }

    [Fact]
    public async Task The_token_is_stored_only_as_a_hash_and_works_for_one_hour()
    {
        // L2-002 AC2 ("It works for one hour"), ADR-010.
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");
        var email = team.EmailOf("Maya Chen");

        await RequestAsync(email);

        var token = RecordingEmailSender.ResetTokenIn(_factory.Emails.To(email).Single());
        await using var scope = _factory.Services.CreateAsyncScope();
        var stored = scope.ServiceProvider.GetRequiredService<AppDbContext>().PasswordResetTokens.Where(t => t.UserId == team.Manager.Id).ToList();
        stored.Should().ContainSingle();
        stored[0].TokenHash.Should().NotContain(token).And.NotBe(token);
        stored[0].ExpiresUtc.Should().Be(FrozenClockApiFactory.Now.AddHours(1));
        stored[0].UsedUtc.Should().BeNull();
    }

    [Fact]
    public async Task When_the_email_cannot_be_sent_the_answer_is_a_503_and_no_link_is_left_behind()
    {
        // L2-002 AC3.
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");
        _factory.Emails.Failing = true;
        try
        {
            var response = await RequestAsync(team.EmailOf("Maya Chen"));

            response.StatusCode.Should().Be(HttpStatusCode.ServiceUnavailable);
            var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
            problem.GetProperty("code").GetString().Should().Be("email_failed");
        }
        finally
        {
            _factory.Emails.Failing = false;
        }
        await using var scope = _factory.Services.CreateAsyncScope();
        scope.ServiceProvider.GetRequiredService<AppDbContext>().PasswordResetTokens.Any(t => t.UserId == team.Manager.Id).Should().BeFalse();
    }

    private Task<HttpResponseMessage> RequestAsync(string email) =>
        _factory.CreateClient().PostAsJsonAsync("/api/auth/password-reset", new { email });
}
