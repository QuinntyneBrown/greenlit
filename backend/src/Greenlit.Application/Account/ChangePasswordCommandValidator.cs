using FluentValidation;

namespace Greenlit.Application.Account;

/// <summary>The new-password rules of L2-003, as the Account page checks them (L2-005 AC2).</summary>
public sealed class ChangePasswordCommandValidator : AbstractValidator<ChangePasswordCommand>
{
    public const int MinPasswordLength = 10;

    public ChangePasswordCommandValidator()
    {
        RuleFor(c => c.NewPassword)
            .Must(p => p is not null && p.Length >= MinPasswordLength).WithMessage("New password must be at least 10 characters");
        RuleFor(c => c.ConfirmPassword)
            .Must((c, confirm) => confirm == c.NewPassword).WithMessage("Passwords don't match");
    }
}
