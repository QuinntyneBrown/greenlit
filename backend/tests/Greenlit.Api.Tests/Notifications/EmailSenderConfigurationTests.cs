using FluentAssertions;
using Greenlit.Api.Tests.Support;
using Greenlit.Infrastructure.Email;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Greenlit.Api.Tests.Notifications;

/// <summary>
/// Greenlit:Email:Sender picks the sender (L2-053 AC7); Acs without an endpoint is refused by options validation, which
/// stops the host at startup in production (ADR-013). The host's own catch logs that fatally, so the test reads the options.
/// </summary>
public class EmailSenderConfigurationTests
{
    [Fact]
    public async Task Acs_without_an_endpoint_is_refused()
    {
        await using var factory = new MisconfiguredFactory();
        await factory.InitializeAsync();

        var act = () => factory.Services.GetRequiredService<IOptions<EmailOptions>>().Value;

        act.Should().Throw<OptionsValidationException>().Which.Message.Should().Contain("Greenlit:Email:Endpoint");
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
