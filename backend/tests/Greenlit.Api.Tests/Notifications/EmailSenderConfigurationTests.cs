using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;

namespace Greenlit.Api.Tests.Notifications;

/// <summary>Greenlit:Email:Sender picks the sender (L2-053 AC7); Acs without an endpoint cannot start (ADR-013).</summary>
public class EmailSenderConfigurationTests
{
    [Fact]
    public async Task Acs_without_an_endpoint_refuses_to_start()
    {
        await using var factory = new MisconfiguredFactory();

        var act = async () => { await factory.InitializeAsync(); _ = factory.Services; };

        await act.Should().ThrowAsync<Exception>().Where(e => (e.Message + e.InnerException?.Message).Contains("Greenlit:Email:Endpoint"));
    }

    private sealed class MisconfiguredFactory : GreenlitApiFactory
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder)
        {
            base.ConfigureWebHost(builder);
            builder.ConfigureAppConfiguration((_, cfg) => cfg.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Greenlit:Email:Sender"] = "Acs",
                ["Greenlit:Email:From"] = "no-reply@mail.example.com",
            }));
        }
    }
}
