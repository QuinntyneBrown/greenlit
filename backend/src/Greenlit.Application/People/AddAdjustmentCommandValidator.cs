using FluentValidation;

namespace Greenlit.Application.People;

/// <summary>The adjustment rules (L2-028 AC2); the dialog checks the same ones before sending.</summary>
public sealed class AddAdjustmentCommandValidator : AbstractValidator<AddAdjustmentCommand>
{
    public const int MaxReasonLength = 200;

    public AddAdjustmentCommandValidator()
    {
        RuleFor(c => c.Days).NotEqual(0).WithMessage("Enter a number other than 0.");
        RuleFor(c => c.Reason)
            .Must(r => !string.IsNullOrWhiteSpace(r)).WithMessage("Give a reason so the history makes sense later.")
            .Must(r => r is null || r.Trim().Length <= MaxReasonLength).WithMessage("Use 200 characters or fewer.");
    }
}
