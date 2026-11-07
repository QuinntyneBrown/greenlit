using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using FluentAssertions;
using Greenlit.Api.Tests.Support;

namespace Greenlit.Api.Tests.Pipeline;

/// <summary>L2-046 AC3: an unexpected server error names the failure with a reference the person can quote.</summary>
public class ServerErrorReferenceTests : IClassFixture<GreenlitApiFactory>
{
    private readonly HttpClient _client;

    public ServerErrorReferenceTests(GreenlitApiFactory factory) => _client = factory.CreateClient();

    private async Task<JsonElement> FailAsync()
    {
        var response = await _client.PostAsJsonAsync("/api/_ping", new { Mode = "fail" });
        var body = await response.Content.ReadAsStringAsync();
        response.StatusCode.Should().Be(HttpStatusCode.InternalServerError, $"body: {body}");
        response.Content.Headers.ContentType!.MediaType.Should().Be("application/problem+json");
        return JsonDocument.Parse(body).RootElement;
    }

    [Fact]
    public async Task An_unhandled_exception_returns_500_with_a_short_reference()
    {
        var payload = await FailAsync();

        payload.GetProperty("title").GetString().Should().Be("Server error");
        payload.GetProperty("reference").GetString().Should().MatchRegex("^[0-9A-F]{4}-[0-9A-F]{4}$");
    }

    [Fact]
    public async Task Each_failure_gets_its_own_reference()
    {
        var first = (await FailAsync()).GetProperty("reference").GetString();
        var second = (await FailAsync()).GetProperty("reference").GetString();

        first.Should().NotBe(second);
    }

    [Fact]
    public async Task A_handled_error_carries_no_reference()
    {
        var response = await _client.PostAsJsonAsync("/api/_ping", new { Mode = "notfound" });

        var payload = await response.Content.ReadFromJsonAsync<JsonElement>();
        payload.TryGetProperty("reference", out _).Should().BeFalse();
    }
}
