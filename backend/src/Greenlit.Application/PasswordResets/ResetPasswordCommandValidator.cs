using FluentValidation;

namespace Greenlit.Application.PasswordResets;

/// <summary>The reset rules (L2-003 AC2, AC3); the page checks the same ones before sending.</summary>
public sealed class ResetPasswordCommandValidator : AbstractValidator<ResetPasswordCommand>
{
    public const int MinPasswordLength = 10;

    public ResetPasswordCommandValidator()
    {
        RuleFor(c => c.Password)
            .Must(p => p is not null && p.Length >= MinPasswordLength).WithMessage("New password must be at least 10 characters");
        RuleFor(c => c.ConfirmPassword)
            .Must((c, confirm) => confirm == c.Password).WithMessage("Passwords don't match");
    }
}
