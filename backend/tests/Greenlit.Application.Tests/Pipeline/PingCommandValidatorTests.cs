using FluentAssertions;
using Greenlit.Application.Pipeline;

namespace Greenlit.Application.Tests.Pipeline;

public class PingCommandValidatorTests
{
    private readonly PingCommandValidator _validator = new();

    [Theory]
    [InlineData("ok")]
    [InlineData("notfound")]
    [InlineData("conflict")]
    public void Known_modes_are_valid(string mode)
    {
        _validator.Validate(new PingCommand(mode)).IsValid.Should().BeTrue();
    }

    [Theory]
    [InlineData("")]
    [InlineData("other")]
    public void Unknown_modes_fail_on_Mode(string mode)
    {
        var result = _validator.Validate(new PingCommand(mode));
        result.IsValid.Should().BeFalse();
        result.Errors.Should().OnlyContain(e => e.PropertyName == "Mode");
    }
}
