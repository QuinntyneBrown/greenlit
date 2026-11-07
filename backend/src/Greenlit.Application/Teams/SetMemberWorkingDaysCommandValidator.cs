using FluentValidation;

namespace Greenlit.Application.Teams;

/// <summary>The same rule as the team's work week: at least one weekday (L2-040 AC2).</summary>
public sealed class SetMemberWorkingDaysCommandValidator : AbstractValidator<SetMemberWorkingDaysCommand>
{
    public SetMemberWorkingDaysCommandValidator()
    {
        RuleFor(c => c.Days).Must(d => d is { Count: > 0 }).WithMessage("Pick at least one working day.");
        RuleFor(c => c.Days).Must(d => d is null || WorkingDaysNames.Parse(d) is not null).WithMessage("Use Mon to Sun.");
    }
}
