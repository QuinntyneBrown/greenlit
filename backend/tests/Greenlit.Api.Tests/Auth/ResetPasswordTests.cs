using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.Auth;

/// <summary>
/// POST /api/auth/password-reset/confirm (L2-003). Design: docs/detailed-designs/identity-and-access/reset-password.
/// The clock reads Friday 6 November 2026 at noon.
/// </summary>
public class ResetPasswordTests : IClassFixture<FrozenClockApiFactory>
{
    private const string OldPassword = "correct-horse-battery";
    private const string NewPassword = "brand-new-secret-1";
    private readonly FrozenClockApiFactory _factory;

    public ResetPasswordTests(FrozenClockApiFactory factory) => _factory = factory;

    [Fact]
    public async Task A_valid_link_sets_the_new_password()
    {
        // L2-003 AC5.
        var (email, token) = await RequestLinkAsync();

        var response = await ConfirmAsync(token, NewPassword, NewPassword);

        response.StatusCode.Should().Be(HttpStatusCode.NoContent, await response.Content.ReadAsStringAsync());
        (await SignInAsync(email, NewPassword)).StatusCode.Should().Be(HttpStatusCode.OK);
        (await SignInAsync(email, OldPassword)).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task A_link_works_only_once()
    {
        // L2-003 AC4: already used.
        var (email, token) = await RequestLinkAsync();
        (await ConfirmAsync(token, NewPassword, NewPassword)).StatusCode.Should().Be(HttpStatusCode.NoContent);

        var again = await ConfirmAsync(token, "another-secret-22", "another-secret-22");

        await ShouldBeExpiredAsync(again);
        (await SignInAsync(email, NewPassword)).StatusCode.Should().Be(HttpStatusCode.OK);
        (await SignInAsync(email, "another-secret-22")).StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task A_link_older_than_one_hour_is_refused_and_the_password_stays()
    {
        // L2-003 AC4: past an hour. A link issued exactly an hour ago has just expired.
        var (email, token) = await RequestLinkAsync();
        await _factory.WriteAsync(db => db.PasswordResetTokens.Single(t => t.User.Email == email).ExpiresUtc = FrozenClockApiFactory.Now);

        var response = await ConfirmAsync(token, NewPassword, NewPassword);

        await ShouldBeExpiredAsync(response);
        (await SignInAsync(email, OldPassword)).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task A_link_one_second_short_of_an_hour_old_still_works()
    {
        var (email, token) = await RequestLinkAsync();
        await _factory.WriteAsync(db =>
            db.PasswordResetTokens.Single(t => t.User.Email == email).ExpiresUtc = FrozenClockApiFactory.Now.AddSeconds(1));

        (await ConfirmAsync(token, NewPassword, NewPassword)).StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task An_unknown_link_is_refused_the_same_way_as_an_expired_one()
    {
        // L2-003 AC4: nothing tells a link that never existed from one that was used.
        var response = await ConfirmAsync("not-a-real-token", NewPassword, NewPassword);

        await ShouldBeExpiredAsync(response);
    }

    [Fact]
    public async Task A_short_password_is_refused_and_the_link_still_works()
    {
        // L2-003 AC2.
        var (email, token) = await RequestLinkAsync();

        var response = await ConfirmAsync(token, "short", "short");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("errors").GetProperty("Password")[0].GetString().Should().Be("New password must be at least 10 characters");
        (await SignInAsync(email, OldPassword)).StatusCode.Should().Be(HttpStatusCode.OK);
        (await ConfirmAsync(token, NewPassword, NewPassword)).StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task A_confirmation_that_differs_is_refused_and_the_password_stays()
    {
        // L2-003 AC3.
        var (email, token) = await RequestLinkAsync();

        var response = await ConfirmAsync(token, NewPassword, "something-else-entirely");

        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("errors").GetProperty("ConfirmPassword")[0].GetString().Should().Be("Passwords don't match");
        (await SignInAsync(email, OldPassword)).StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task Asking_again_makes_the_earlier_link_stop_working()
    {
        // ADR-011: only the newest link works.
        var (email, first) = await RequestLinkAsync();
        await _factory.CreateClient().PostAsJsonAsync("/api/auth/password-reset", new { email });
        var second = RecordingEmailSender.ResetTokenIn(_factory.Emails.To(email).Last());

        await ShouldBeExpiredAsync(await ConfirmAsync(first, NewPassword, NewPassword));
        (await ConfirmAsync(second, NewPassword, NewPassword)).StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Opening_a_valid_link_is_204_and_changes_nothing()
    {
        // L2-003 AC1.
        var (email, token) = await RequestLinkAsync();

        (await CheckAsync(token)).StatusCode.Should().Be(HttpStatusCode.NoContent);
        (await CheckAsync(token)).StatusCode.Should().Be(HttpStatusCode.NoContent);

        (await ConfirmAsync(token, NewPassword, NewPassword)).StatusCode.Should().Be(HttpStatusCode.NoContent);
    }

    [Fact]
    public async Task Opening_a_used_expired_or_unknown_link_is_410()
    {
        // L2-003 AC4: when the person opens it.
        var (_, used) = await RequestLinkAsync();
        await ConfirmAsync(used, NewPassword, NewPassword);
        var (email, old) = await RequestLinkAsync();
        await _factory.WriteAsync(db => db.PasswordResetTokens.Single(t => t.User.Email == email).ExpiresUtc = FrozenClockApiFactory.Now);

        await ShouldBeExpiredAsync(await CheckAsync(used));
        await ShouldBeExpiredAsync(await CheckAsync(old));
        await ShouldBeExpiredAsync(await CheckAsync("not-a-real-token"));
    }

    private Task<HttpResponseMessage> CheckAsync(string token) =>
        _factory.CreateClient().GetAsync($"/api/auth/password-reset/{token}");

    private async Task<(string Email, string Token)> RequestLinkAsync()
    {
        var team = await TestTeam.CreateAsync(_factory, "Maya Chen");
        await team.SetPasswordAsync("Maya Chen", OldPassword);
        var email = team.EmailOf("Maya Chen");
        (await _factory.CreateClient().PostAsJsonAsync("/api/auth/password-reset", new { email })).StatusCode
            .Should().Be(HttpStatusCode.NoContent);
        return (email, RecordingEmailSender.ResetTokenIn(_factory.Emails.To(email).Last()));
    }

    private Task<HttpResponseMessage> ConfirmAsync(string token, string? password, string? confirmPassword) =>
        _factory.CreateClient().PostAsJsonAsync("/api/auth/password-reset/confirm", new { token, password, confirmPassword });

    private Task<HttpResponseMessage> SignInAsync(string email, string password) =>
        _factory.CreateClient().PostAsJsonAsync("/api/auth/sign-in", new { email, password });

    private static async Task ShouldBeExpiredAsync(HttpResponseMessage response)
    {
        response.StatusCode.Should().Be(HttpStatusCode.Gone);
        var problem = await response.Content.ReadFromJsonAsync<JsonElement>();
        problem.GetProperty("code").GetString().Should().Be("reset_link_expired");
    }
}
