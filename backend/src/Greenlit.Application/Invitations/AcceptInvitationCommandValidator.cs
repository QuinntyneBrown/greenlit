using FluentValidation;

namespace Greenlit.Application.Invitations;

/// <summary>The accept rules (L2-004 AC3, AC8); the page checks the same ones, and the confirmation, before sending.</summary>
public sealed class AcceptInvitationCommandValidator : AbstractValidator<AcceptInvitationCommand>
{
    public const int MaxNameLength = 120;
    public const int MinPasswordLength = 10;

    public AcceptInvitationCommandValidator()
    {
        RuleFor(c => c.Name)
            .Must(n => !string.IsNullOrWhiteSpace(n)).WithMessage("Enter your name.")
            .Must(n => n is null || n.Trim().Length <= MaxNameLength).WithMessage("Use 120 characters or fewer.");
        RuleFor(c => c.Password)
            .Must(p => p is not null && p.Length >= MinPasswordLength).WithMessage("Password must be at least 10 characters");
    }
}
