using FluentValidation;

namespace Greenlit.Application.Auth;

public sealed class SignInCommandValidator : AbstractValidator<SignInCommand>
{
    public SignInCommandValidator()
    {
        RuleFor(c => c.Email).NotEmpty().WithMessage("Enter your email address.");
        RuleFor(c => c.Password).NotEmpty().WithMessage("Enter your password.");
    }
}
