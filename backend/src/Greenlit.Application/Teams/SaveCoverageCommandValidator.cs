using FluentValidation;

namespace Greenlit.Application.Teams;

/// <summary>A minimum must be given; the handler checks it against the team size, which the validator cannot see.</summary>
public sealed class SaveCoverageCommandValidator : AbstractValidator<SaveCoverageCommand>
{
    public SaveCoverageCommandValidator()
    {
        RuleFor(c => c.Minimum).NotNull().WithMessage("Choose how many people should be in.");
    }
}
