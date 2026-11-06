using FluentAssertions;
using Greenlit.Cli.Reset;

namespace Greenlit.Cli.Tests.Reset;

public class ResetGuardTests
{
    [Theory]
    [InlineData("Production", false, true)]
    [InlineData("production", false, true)]
    [InlineData(" Production ", false, true)]
    [InlineData("Production", true, false)]
    [InlineData("Development", false, false)]
    [InlineData(null, false, false)]
    public void Blocks_a_production_reset_unless_overridden(string? environment, bool allow, bool blocked)
    {
        ResetGuard.IsProductionBlocked(environment, allow).Should().Be(blocked);
    }
}
