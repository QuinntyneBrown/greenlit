using FluentValidation;

namespace Greenlit.Application.Teams;

/// <summary>A work week needs at least one weekday, spelled "Mon".."Sun" (the same rule as L2-040 AC2).</summary>
public sealed class SaveWorkWeekCommandValidator : AbstractValidator<SaveWorkWeekCommand>
{
    public SaveWorkWeekCommandValidator()
    {
        RuleFor(c => c.Days).Must(d => d is { Count: > 0 }).WithMessage("Pick at least one working day.");
        RuleFor(c => c.Days).Must(d => d is null || WorkingDaysNames.Parse(d) is not null).WithMessage("Use Mon to Sun.");
    }
}
