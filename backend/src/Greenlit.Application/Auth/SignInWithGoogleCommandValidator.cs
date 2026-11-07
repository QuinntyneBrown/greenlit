using FluentValidation;

namespace Greenlit.Application.Auth;

public sealed class SignInWithGoogleCommandValidator : AbstractValidator<SignInWithGoogleCommand>
{
    public SignInWithGoogleCommandValidator()
    {
        RuleFor(c => c.AccessToken).NotEmpty().WithMessage("Enter a Google access token.");
    }
}
