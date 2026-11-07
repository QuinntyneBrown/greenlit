using FluentValidation;

namespace Greenlit.Application.Allowances;

/// <summary>The defaults rules (L2-027 AC2); the Allowances section checks the same ones before sending.</summary>
public sealed class SaveAllowanceDefaultsCommandValidator : AbstractValidator<SaveAllowanceDefaultsCommand>
{
    public SaveAllowanceDefaultsCommandValidator()
    {
        RuleFor(c => c.DefaultYearlyDays).Must(d => d is >= 0).WithMessage("Enter 0 or more days.");
        RuleFor(c => c.MaxCarryOver).Must(d => d is >= 0).WithMessage("Enter 0 or more days.");
        RuleFor(c => c.LeaveYearStartMonth).Must(m => m is >= 1 and <= 12).WithMessage("Choose a month from January to December.");
    }
}
