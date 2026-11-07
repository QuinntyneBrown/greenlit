using FluentValidation;

namespace Greenlit.Application.Teams;

/// <summary>Both switches must be given, so a partial request never flips the other one by accident.</summary>
public sealed class SaveNotificationsCommandValidator : AbstractValidator<SaveNotificationsCommand>
{
    public SaveNotificationsCommandValidator()
    {
        RuleFor(c => c.NewRequests).NotNull().WithMessage("Choose whether to email new requests.");
        RuleFor(c => c.Decisions).NotNull().WithMessage("Choose whether to email decisions.");
    }
}
