using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace Greenlit.Api.Tests.Support;

/// <summary>
/// The API with its clock stopped at the mocks' "today", Friday 6 November 2026
/// (docs/mocks/README.md), for behaviour that depends on the current year.
/// </summary>
public sealed class FrozenClockApiFactory : GreenlitApiFactory
{
    public static readonly DateTimeOffset Now = new(2026, 11, 6, 12, 0, 0, TimeSpan.Zero);

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        base.ConfigureWebHost(builder);
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(new FrozenTimeProvider(Now));
            // Tokens the API issues are dated by its clock, so bearer validation reads the same clock.
            services.PostConfigure<JwtBearerOptions>(JwtBearerDefaults.AuthenticationScheme, o =>
                o.TokenValidationParameters.LifetimeValidator = (notBefore, expires, _, _) =>
                    (notBefore is null || notBefore <= Now.UtcDateTime) && expires > Now.UtcDateTime);
        });
    }

    private sealed class FrozenTimeProvider(DateTimeOffset now) : TimeProvider
    {
        public override DateTimeOffset GetUtcNow() => now;
    }
}
